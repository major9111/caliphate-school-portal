"""Admission → enrollment → student account pipeline."""


def test_enroll_creates_student_account(client, admin_headers):
    r = client.post("/api/v1/admin/admissions", json={
        "applicant_name": "Future Student", "email": "future@test.com", "phone": "1",
        "class_applying": "JSS 1", "parent_name": "Mr Parent",
    }, headers=admin_headers)
    adm_id = r.json()["id"]

    client.put(f"/api/v1/admin/admissions/{adm_id}/status?status=approved", headers=admin_headers)

    r2 = client.post(f"/api/v1/admin/admissions/{adm_id}/enroll", headers=admin_headers)
    assert r2.status_code == 200
    data = r2.json()
    assert "username" in data
    assert "password" in data

    # New student account should be able to log in
    r3 = client.post("/api/v1/auth/login", json={"login": data["username"], "password": data["password"]})
    assert r3.status_code == 200
    assert r3.json()["user"]["role"] == "student"


def test_enroll_requires_approved_status(client, admin_headers):
    r = client.post("/api/v1/admin/admissions", json={
        "applicant_name": "Pending Kid", "email": "pending@test.com", "phone": "1", "class_applying": "JSS 1",
    }, headers=admin_headers)
    adm_id = r.json()["id"]

    r2 = client.post(f"/api/v1/admin/admissions/{adm_id}/enroll", headers=admin_headers)
    assert r2.status_code == 400


def test_enroll_twice_fails(client, admin_headers):
    r = client.post("/api/v1/admin/admissions", json={
        "applicant_name": "Once Kid", "email": "once@test.com", "phone": "1", "class_applying": "JSS 1",
    }, headers=admin_headers)
    adm_id = r.json()["id"]
    client.put(f"/api/v1/admin/admissions/{adm_id}/status?status=approved", headers=admin_headers)
    client.post(f"/api/v1/admin/admissions/{adm_id}/enroll", headers=admin_headers)

    r2 = client.post(f"/api/v1/admin/admissions/{adm_id}/enroll", headers=admin_headers)
    assert r2.status_code == 400
