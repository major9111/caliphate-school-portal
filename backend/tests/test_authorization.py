"""Role-based access control tests."""


def test_unauthenticated_blocked_from_students(client):
    r = client.get("/api/v1/students/")
    assert r.status_code == 401


def test_unauthenticated_blocked_from_admin(client):
    r = client.get("/api/v1/admin/dashboard/stats")
    assert r.status_code == 401


def test_parent_cannot_access_staff_endpoints(client):
    client.post("/api/v1/auth/register", json={
        "full_name": "Parent B", "email": "parent_b@test.com", "phone": "1",
        "password": "Pass1234!", "role": "parent",
    })
    r = client.post("/api/v1/auth/login", json={"login": "parent_b@test.com", "password": "Pass1234!"})
    parent_headers = {"Authorization": f"Bearer {r.json()['access_token']}"}

    r2 = client.get("/api/v1/students/", headers=parent_headers)
    assert r2.status_code == 403


def test_parent_can_access_own_portal(client):
    r = client.post("/api/v1/auth/register", json={
        "full_name": "Parent C", "email": "parent_c@test.com", "phone": "1",
        "password": "Pass1234!", "role": "parent",
    })
    parent_id = r.json()["user"]["id"]
    parent_headers = {"Authorization": f"Bearer {r.json()['access_token']}"}

    r2 = client.get(f"/api/v1/system/portal/parent/{parent_id}", headers=parent_headers)
    assert r2.status_code == 200


def test_parent_cannot_access_others_portal(client):
    r = client.post("/api/v1/auth/register", json={
        "full_name": "Parent D", "email": "parent_d@test.com", "phone": "1",
        "password": "Pass1234!", "role": "parent",
    })
    parent_headers = {"Authorization": f"Bearer {r.json()['access_token']}"}

    r2 = client.get("/api/v1/system/portal/parent/some-other-user-id", headers=parent_headers)
    assert r2.status_code == 403


def test_only_admin_can_access_audit_logs(client, admin_headers):
    r = client.post("/api/v1/auth/register", json={
        "full_name": "Parent E", "email": "parent_e@test.com", "phone": "1",
        "password": "Pass1234!", "role": "parent",
    })
    parent_headers = {"Authorization": f"Bearer {r.json()['access_token']}"}

    r2 = client.get("/api/v1/audit/audit-logs", headers=parent_headers)
    assert r2.status_code == 403

    r3 = client.get("/api/v1/audit/audit-logs", headers=admin_headers)
    assert r3.status_code == 200
