"""Teachers multi-subject assignment, and Schedule linked to real teacher accounts."""


def _create_teacher(client, admin_headers, subjects, **overrides):
    payload = {"full_name": "Fatima Sani", "email": "fatima.sani@test.com", "subjects": subjects, "qualification": "B.Ed"}
    payload.update(overrides)
    r = client.post("/api/v1/teachers/", json=payload, headers=admin_headers)
    assert r.status_code == 200, r.text
    return r.json()


def test_create_teacher_with_multiple_subjects(client, admin_headers):
    teacher = _create_teacher(client, admin_headers, ["English", "Literature"])
    assert teacher["subjects"] == ["English", "Literature"]


def test_update_teacher_subjects(client, admin_headers):
    teacher = _create_teacher(client, admin_headers, ["Mathematics"])
    r = client.put(f"/api/v1/teachers/{teacher['id']}", json={"subjects": ["Mathematics", "Physics", "Further Mathematics"]}, headers=admin_headers)
    assert r.status_code == 200
    assert r.json()["subjects"] == ["Mathematics", "Physics", "Further Mathematics"]


def test_legacy_single_subject_teacher_migrates_to_list(client, admin_headers, make_user):
    import json
    legacy = make_user(
        email="legacy@test.com", username="legacyteacher", full_name="Legacy Teacher", role="teacher",
        preferences=json.dumps({"subject": "Chemistry", "qualification": "M.Sc"}),
    )
    r = client.get("/api/v1/teachers/", params={"search": "Legacy"}, headers=admin_headers)
    assert r.status_code == 200
    assert r.json()["items"][0]["subjects"] == ["Chemistry"]


def test_schedule_linked_to_real_teacher(client, admin_headers):
    teacher = _create_teacher(client, admin_headers, ["Physics", "Chemistry"])
    r = client.post("/api/v1/admin/schedule", json={
        "day": "Monday", "time": "08:00-09:00", "subject": "Physics",
        "teacher_id": teacher["id"], "class_name": "SS 1A", "room": "12",
    }, headers=admin_headers)
    assert r.status_code == 200
    assert r.json()["teacher_name"] == "Fatima Sani"
    assert r.json()["teacher_id"] == teacher["id"]


def test_schedule_rejects_subject_not_assigned_to_teacher(client, admin_headers):
    teacher = _create_teacher(client, admin_headers, ["English"])
    r = client.post("/api/v1/admin/schedule", json={
        "day": "Monday", "time": "08:00-09:00", "subject": "Mathematics",
        "teacher_id": teacher["id"], "class_name": "SS 1A",
    }, headers=admin_headers)
    assert r.status_code == 400


def test_schedule_conflict_same_teacher_same_slot(client, admin_headers):
    teacher = _create_teacher(client, admin_headers, ["English", "Literature"])
    client.post("/api/v1/admin/schedule", json={
        "day": "Tuesday", "time": "09:00-10:00", "subject": "English",
        "teacher_id": teacher["id"], "class_name": "SS 1A",
    }, headers=admin_headers)

    r = client.post("/api/v1/admin/schedule", json={
        "day": "Tuesday", "time": "09:00-10:00", "subject": "Literature",
        "teacher_id": teacher["id"], "class_name": "SS 1B",
    }, headers=admin_headers)
    assert r.status_code == 409


def test_schedule_nonexistent_teacher_404s(client, admin_headers):
    r = client.post("/api/v1/admin/schedule", json={
        "day": "Wednesday", "time": "10:00-11:00", "subject": "English",
        "teacher_id": "does-not-exist", "class_name": "SS 1A",
    }, headers=admin_headers)
    assert r.status_code == 404


def test_schedule_legacy_freetext_teacher_still_works(client, admin_headers):
    """Backward compatibility: entries without teacher_id still conflict-check by typed name."""
    r1 = client.post("/api/v1/admin/schedule", json={
        "day": "Thursday", "time": "11:00-12:00", "subject": "History",
        "teacher": "Mr Legacy", "class_name": "SS 2A",
    }, headers=admin_headers)
    assert r1.status_code == 200

    r2 = client.post("/api/v1/admin/schedule", json={
        "day": "Thursday", "time": "11:00-12:00", "subject": "Geography",
        "teacher": "Mr Legacy", "class_name": "SS 2B",
    }, headers=admin_headers)
    assert r2.status_code == 409
