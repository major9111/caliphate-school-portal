"""Authentication flow tests."""


def test_register_parent(client):
    r = client.post("/api/v1/auth/register", json={
        "full_name": "Parent A", "email": "parent_a@test.com", "phone": "1",
        "password": "Pass1234!", "role": "parent",
    })
    assert r.status_code == 200
    data = r.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["user"]["role"] == "parent"


def test_register_blocks_privileged_roles(client):
    r = client.post("/api/v1/auth/register", json={
        "full_name": "Sneaky", "email": "sneaky@test.com", "phone": "1",
        "password": "Pass1234!", "role": "admin",
    })
    assert r.status_code == 400


def test_login_wrong_password(client):
    client.post("/api/v1/auth/register", json={
        "full_name": "P", "email": "p@test.com", "phone": "1",
        "password": "Correct123!", "role": "parent",
    })
    r = client.post("/api/v1/auth/login", json={"login": "p@test.com", "password": "wrong"})
    assert r.status_code == 401


def test_login_rate_limited_after_5_attempts(client):
    for _ in range(5):
        r = client.post("/api/v1/auth/login", json={"login": "nouser@test.com", "password": "wrong"})
        assert r.status_code == 401
    r = client.post("/api/v1/auth/login", json={"login": "nouser@test.com", "password": "wrong"})
    assert r.status_code == 429


def test_refresh_token_rotates(client, admin_headers, admin_token):
    r = client.post("/api/v1/auth/login", json={"login": "admin_test@school.com", "password": "Pass1234!"})
    refresh = r.json()["refresh_token"]
    r2 = client.post("/api/v1/auth/refresh", json={"refresh_token": refresh})
    assert r2.status_code == 200
    assert r2.json()["access_token"] != admin_token
    # Old refresh token should now be revoked
    r3 = client.post("/api/v1/auth/refresh", json={"refresh_token": refresh})
    assert r3.status_code == 401


def test_forgot_password_always_returns_200(client):
    r = client.post("/api/v1/auth/forgot-password", json={"email": "doesnotexist@test.com"})
    assert r.status_code == 200  # prevents email enumeration


def test_reset_password_with_invalid_token(client):
    r = client.post("/api/v1/auth/reset-password", json={"token": "bogus", "new_password": "NewPass123!"})
    assert r.status_code == 400


def test_reset_password_full_flow_succeeds(client, make_user, monkeypatch):
    """
    End-to-end: request a reset, capture the real token (normally emailed),
    verify it, use it to set a new password, then confirm the new password
    works and the old one doesn't. This exercises the SQL-level
    `password_reset_expires > now()` filter against a real freshly-written
    row, not just the 400 path.
    """
    make_user(email="reset_flow@test.com", username="reset_flow")

    captured = {}

    def fake_send_password_reset(to_email, full_name, reset_token):
        captured["token"] = reset_token
        return True

    monkeypatch.setattr("app.api.v1.endpoints.auth.send_password_reset", fake_send_password_reset)

    r = client.post("/api/v1/auth/forgot-password", json={"email": "reset_flow@test.com"})
    assert r.status_code == 200
    assert "token" in captured

    token = captured["token"]

    r2 = client.get(f"/api/v1/auth/verify-reset-token/{token}")
    assert r2.status_code == 200
    assert r2.json()["valid"] is True

    r3 = client.post("/api/v1/auth/reset-password", json={"token": token, "new_password": "BrandNew123!"})
    assert r3.status_code == 200

    # Token should now be single-use — reusing it must fail
    r4 = client.get(f"/api/v1/auth/verify-reset-token/{token}")
    assert r4.status_code == 400

    # New password works, old one doesn't
    r5 = client.post("/api/v1/auth/login", json={"login": "reset_flow@test.com", "password": "BrandNew123!"})
    assert r5.status_code == 200
    r6 = client.post("/api/v1/auth/login", json={"login": "reset_flow@test.com", "password": "Pass1234!"})
    assert r6.status_code == 401


def test_verify_reset_token_invalid(client):
    r = client.get("/api/v1/auth/verify-reset-token/bogus")
    assert r.status_code == 400


def test_change_password(client, admin_headers):
    r = client.post("/api/v1/auth/change-password", json={
        "current_password": "Pass1234!", "new_password": "NewAdmin456!",
    }, headers=admin_headers)
    assert r.status_code == 200
    # Old password should no longer work
    r2 = client.post("/api/v1/auth/login", json={"login": "admin_test@school.com", "password": "Pass1234!"})
    assert r2.status_code == 401


def test_me_requires_auth(client):
    r = client.get("/api/v1/auth/me")
    assert r.status_code == 401


def test_me_with_valid_token(client, admin_headers):
    r = client.get("/api/v1/auth/me", headers=admin_headers)
    assert r.status_code == 200
    assert r.json()["role"] == "admin"


def test_2fa_setup_and_enable_flow(client, admin_headers):
    import pyotp
    r = client.post("/api/v1/auth/2fa/setup", headers=admin_headers)
    assert r.status_code == 200
    secret = r.json()["secret"]
    code = pyotp.TOTP(secret).now()
    r2 = client.post("/api/v1/auth/2fa/enable", json={"totp_code": code}, headers=admin_headers)
    assert r2.status_code == 200
