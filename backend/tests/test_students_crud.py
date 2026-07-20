"""Students — full CRUD (previously only list+create existed)."""


def _create_student(client, admin_headers, **overrides):
    payload = {
        "first_name": "Amina", "last_name": "Bello", "email": "amina.bello@test.com",
        "phone": "08011112222", "class_name": "JSS 1A", "gender": "female",
        "parent_name": "Mr Bello", "parent_phone": "08033334444", "parent_email": "mr.bello@test.com",
    }
    payload.update(overrides)
    r = client.post("/api/v1/students/", json=payload, headers=admin_headers)
    assert r.status_code == 200, r.text
    return r.json()


def test_create_student_stores_parent_contact_fields(client, admin_headers):
    student = _create_student(client, admin_headers)
    assert student["parent_name"] == "Mr Bello"
    assert student["parent_phone"] == "08033334444"
    assert student["parent_email"] == "mr.bello@test.com"


def test_get_student_by_id(client, admin_headers):
    student = _create_student(client, admin_headers)
    r = client.get(f"/api/v1/students/{student['id']}", headers=admin_headers)
    assert r.status_code == 200
    assert r.json()["first_name"] == "Amina"


def test_get_nonexistent_student_404s(client, admin_headers):
    r = client.get("/api/v1/students/does-not-exist", headers=admin_headers)
    assert r.status_code == 404


def test_update_student_class_and_status(client, admin_headers):
    student = _create_student(client, admin_headers)
    r = client.put(f"/api/v1/students/{student['id']}", json={
        "class_name": "JSS 2A", "enrollment_status": "inactive",
    }, headers=admin_headers)
    assert r.status_code == 200
    assert r.json()["class_name"] == "JSS 2A"
    assert r.json()["enrollment_status"] == "inactive"


def test_update_student_parent_email(client, admin_headers):
    student = _create_student(client, admin_headers)
    r = client.put(f"/api/v1/students/{student['id']}", json={
        "parent_email": "new.parent@test.com",
    }, headers=admin_headers)
    assert r.status_code == 200
    assert r.json()["parent_email"] == "new.parent@test.com"


def test_update_student_duplicate_email_rejected(client, admin_headers):
    _create_student(client, admin_headers, email="taken@test.com")
    student2 = _create_student(client, admin_headers, email="other@test.com")
    r = client.put(f"/api/v1/students/{student2['id']}", json={"email": "taken@test.com"}, headers=admin_headers)
    assert r.status_code == 400


def test_delete_student(client, admin_headers):
    student = _create_student(client, admin_headers)
    r = client.delete(f"/api/v1/students/{student['id']}", headers=admin_headers)
    assert r.status_code == 200

    r2 = client.get(f"/api/v1/students/{student['id']}", headers=admin_headers)
    assert r2.status_code == 404


def test_students_endpoints_require_staff_auth(client):
    r = client.get("/api/v1/students/")
    assert r.status_code == 401
