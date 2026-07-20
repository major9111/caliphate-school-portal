"""Class promotion — preview with score-based suggestions, execute, and history."""


def _student_in_class(client, admin_headers, name, class_name):
    first, last = name.split(" ", 1)
    r = client.post("/api/v1/students/", json={
        "first_name": first, "last_name": last, "email": f"{first.lower()}@test.com", "class_name": class_name,
    }, headers=admin_headers)
    assert r.status_code == 200
    return r.json()


def _add_result(client, admin_headers, student, subject, ca, exam, term="First Term", session="2026/2027"):
    r = client.post("/api/v1/system/results", json={
        "student_id": student["id"], "student_name": f"{student['first_name']} {student['last_name']}",
        "class_name": student["class_name"], "subject": subject, "ca_score": ca, "exam_score": exam,
        "term": term, "session": session,
    }, headers=admin_headers)
    assert r.status_code == 200


def test_promotion_preview_suggests_promote_for_good_average(client, admin_headers):
    student = _student_in_class(client, admin_headers, "Musa Ali", "JSS 1A")
    _add_result(client, admin_headers, student, "Mathematics", 35, 50)  # 85 -> promote

    r = client.get("/api/v1/admin/promotion/preview", params={"class_name": "JSS 1A", "term": "First Term", "session": "2026/2027"}, headers=admin_headers)
    assert r.status_code == 200
    entry = next(s for s in r.json()["students"] if s["name"] == "Musa Ali")
    assert entry["suggested"] == "promote"
    assert entry["has_data"] is True


def test_promotion_preview_suggests_repeat_for_poor_average(client, admin_headers):
    student = _student_in_class(client, admin_headers, "Hauwa Bala", "JSS 1A")
    _add_result(client, admin_headers, student, "Mathematics", 10, 20)  # 30 -> repeat

    r = client.get("/api/v1/admin/promotion/preview", params={"class_name": "JSS 1A", "term": "First Term", "session": "2026/2027"}, headers=admin_headers)
    entry = next(s for s in r.json()["students"] if s["name"] == "Hauwa Bala")
    assert entry["suggested"] == "repeat"


def test_promotion_preview_no_data_defaults_to_promote(client, admin_headers):
    _student_in_class(client, admin_headers, "No Data", "JSS 1A")
    r = client.get("/api/v1/admin/promotion/preview", params={"class_name": "JSS 1A"}, headers=admin_headers)
    entry = next(s for s in r.json()["students"] if s["name"] == "No Data")
    assert entry["has_data"] is False
    assert entry["suggested"] == "promote"


def test_promotion_execute_promote_and_repeat(client, admin_headers):
    promoted = _student_in_class(client, admin_headers, "Musa Promote", "JSS 1A")
    repeater = _student_in_class(client, admin_headers, "Hauwa Repeat", "JSS 1A")

    r = client.post("/api/v1/admin/promotion/execute", json={
        "from_class": "JSS 1A", "session": "2026/2027",
        "promotions": [
            {"student_id": promoted["id"], "action": "promote", "target_class": "JSS 2A"},
            {"student_id": repeater["id"], "action": "repeat"},
        ],
    }, headers=admin_headers)
    assert r.status_code == 200
    assert r.json()["counts"]["promoted"] == 1
    assert r.json()["counts"]["repeated"] == 1

    r2 = client.get(f"/api/v1/students/{promoted['id']}", headers=admin_headers)
    assert r2.json()["class_name"] == "JSS 2A"

    r3 = client.get(f"/api/v1/students/{repeater['id']}", headers=admin_headers)
    assert r3.json()["class_name"] == "JSS 1A"


def test_promotion_execute_graduate_marks_inactive(client, admin_headers):
    student = _student_in_class(client, admin_headers, "Final Year", "SS 3")
    r = client.post("/api/v1/admin/promotion/execute", json={
        "from_class": "SS 3", "session": "2026/2027",
        "promotions": [{"student_id": student["id"], "action": "graduate"}],
    }, headers=admin_headers)
    assert r.status_code == 200
    assert r.json()["counts"]["graduated"] == 1

    r2 = client.get(f"/api/v1/students/{student['id']}", headers=admin_headers)
    assert r2.json()["class_name"] == "Graduated"
    assert r2.json()["enrollment_status"] == "inactive"


def test_promotion_history_records_run(client, admin_headers):
    student = _student_in_class(client, admin_headers, "History Test", "JSS 1A")
    client.post("/api/v1/admin/promotion/execute", json={
        "from_class": "JSS 1A", "session": "2026/2027",
        "promotions": [{"student_id": student["id"], "action": "repeat"}],
    }, headers=admin_headers)

    r = client.get("/api/v1/admin/promotion/history", headers=admin_headers)
    assert r.status_code == 200
    assert any(h["from_class"] == "JSS 1A" for h in r.json()["items"])


def test_promotion_requires_staff_auth(client):
    r = client.get("/api/v1/admin/promotion/preview", params={"class_name": "JSS 1A"})
    assert r.status_code == 401
