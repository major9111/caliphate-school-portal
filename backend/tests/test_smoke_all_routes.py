"""
Generic smoke test — walks every route the API actually serves (read from
its own live OpenAPI schema, so this never goes stale as endpoints are
added/removed) and asserts none of them crash with a 500.

This intentionally does NOT assert exact success codes for every route,
because many need specific request bodies or existing records to succeed
(that's what the targeted test_*.py files are for). What it guarantees is
the cheap-but-valuable thing: no route is unreachable, misconfigured, or
throwing an unhandled exception for the two most common real-world
callers — an anonymous visitor and a logged-in admin.

A dummy placeholder is substituted for path parameters (e.g. {student_id}),
so calls against a nonexistent record are expected to come back 404/400,
not crash.
"""
import re
import pytest

# Routes that intentionally return something other than <500 for "bad" input
# in ways this generic sweep can't infer (e.g. streaming responses, routes
# that 200 on GET with no filters). Nothing needs to be listed here today,
# but the hook exists for future skips instead of weakening the whole test.
SKIP_PATHS: set[tuple[str, str]] = set()

DUMMY = "00000000-0000-0000-0000-000000000000"


def _fill_path_params(path: str) -> str:
    return re.sub(r"\{[^/}]+\}", DUMMY, path)


def _all_operations(client):
    schema = client.get("/openapi.json").json()
    ops = []
    for path, methods in schema["paths"].items():
        for method in methods:
            if method.upper() in ("GET", "POST", "PUT", "DELETE", "PATCH"):
                ops.append((method.upper(), path))
    return ops


@pytest.fixture
def super_admin_headers(client, make_user):
    make_user(email="smoke_admin@test.com", username="smoke_admin", role="super_admin")
    r = client.post("/api/v1/auth/login", json={"login": "smoke_admin@test.com", "password": "Pass1234!"})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def test_no_route_returns_500_unauthenticated(client):
    failures = []
    for method, path in _all_operations(client):
        if (method, path) in SKIP_PATHS:
            continue
        url = "/api/v1" + _fill_path_params(path) if not path.startswith("/api") else _fill_path_params(path)
        resp = client.request(method, url, json={} if method != "GET" else None)
        if resp.status_code >= 500:
            failures.append((method, path, resp.status_code, resp.text[:200]))
    assert not failures, "Unauthenticated 5xx on:\n" + "\n".join(
        f"  {m} {p} -> {s}: {b}" for m, p, s, b in failures
    )


def test_no_route_returns_500_as_admin(client, super_admin_headers):
    failures = []
    for method, path in _all_operations(client):
        if (method, path) in SKIP_PATHS:
            continue
        url = "/api/v1" + _fill_path_params(path) if not path.startswith("/api") else _fill_path_params(path)
        resp = client.request(method, url, json={} if method != "GET" else None, headers=super_admin_headers)
        if resp.status_code >= 500:
            failures.append((method, path, resp.status_code, resp.text[:200]))
    assert not failures, "Admin-authenticated 5xx on:\n" + "\n".join(
        f"  {m} {p} -> {s}: {b}" for m, p, s, b in failures
    )


def test_openapi_schema_is_reachable(client):
    r = client.get("/openapi.json")
    assert r.status_code == 200
    assert len(r.json()["paths"]) > 50  # sanity check the API surface didn't collapse
