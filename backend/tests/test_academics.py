"""Students, results, attendance, exams, classes."""


def test_create_and_list_student(client, admin_headers):
    r = client.post("/api/v1/students/", json={
        "admission_number": "CIS/001", "first_name": "Amina", "last_name": "Yusuf",
        "email": "amina@test.com", "phone": "1", "class_name": "JSS 1A", "gender": "female",
    }, headers=admin_headers)
    assert r.status_code == 200

    r2 = client.get("/api/v1/students/", headers=admin_headers)
    assert r2.status_code == 200
    assert r2.json()["total"] >= 1


def test_result_auto_grades_correctly(client, admin_headers):
    r = client.post("/api/v1/system/results", json={
        "student_name": "Amina Yusuf", "class_name": "JSS 1A", "subject": "Maths",
        "ca_score": 35, "exam_score": 55, "term": "Second Term", "session": "2025/2026",
    }, headers=admin_headers)
    assert r.status_code == 200
    data = r.json()
    assert data["total"] == 90
    assert data["grade"] == "A"


def test_result_fail_grade(client, admin_headers):
    r = client.post("/api/v1/system/results", json={
        "student_name": "X", "class_name": "JSS 1A", "subject": "Maths",
        "ca_score": 5, "exam_score": 10, "term": "Second Term", "session": "2025/2026",
    }, headers=admin_headers)
    assert r.json()["grade"] == "F"


def test_attendance_mark_and_stats(client, admin_headers):
    r = client.post("/api/v1/system/attendance/mark", json={
        "date": "2026-06-30", "class_name": "JSS 1A",
        "records": [{"student_id": "s1", "student_name": "Amina", "status": "present"}],
    }, headers=admin_headers)
    assert r.status_code == 200

    r2 = client.get("/api/v1/system/attendance/stats", headers=admin_headers)
    assert r2.status_code == 200


def test_schedule_conflict_detection(client, admin_headers):
    r1 = client.post("/api/v1/admin/schedule", json={
        "day": "Monday", "time": "08:00-09:00", "subject": "Maths",
        "teacher": "Mr Bello", "class_name": "JSS 1A",
    }, headers=admin_headers)
    assert r1.status_code == 200

    r2 = client.post("/api/v1/admin/schedule", json={
        "day": "Monday", "time": "08:00-09:00", "subject": "English",
        "teacher": "Mr Bello", "class_name": "JSS 1B",
    }, headers=admin_headers)
    assert r2.status_code == 409
    assert "conflict" in r2.json()["detail"]["message"].lower()


def test_schedule_no_conflict_different_time(client, admin_headers):
    client.post("/api/v1/admin/schedule", json={
        "day": "Monday", "time": "08:00-09:00", "subject": "Maths",
        "teacher": "Mr Bello", "class_name": "JSS 1A",
    }, headers=admin_headers)
    r = client.post("/api/v1/admin/schedule", json={
        "day": "Monday", "time": "09:00-10:00", "subject": "English",
        "teacher": "Mr Bello", "class_name": "JSS 1B",
    }, headers=admin_headers)
    assert r.status_code == 200


def test_class_duplicate_name_rejected(client, admin_headers):
    client.post("/api/v1/admin/classes", json={"name": "JSS 1A", "level": "junior_secondary", "capacity": 30}, headers=admin_headers)
    r = client.post("/api/v1/admin/classes", json={"name": "JSS 1A", "level": "junior_secondary", "capacity": 30}, headers=admin_headers)
    assert r.status_code == 400
