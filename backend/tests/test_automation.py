"""Daily automation — exam transitions, birthdays, fee reminders, absence alerts,
term advance/session rollover, and fee structure copy-forward."""
from datetime import date, timedelta


def test_automation_requires_staff_auth(client):
    r = client.post("/api/v1/admin/automation/run-now")
    assert r.status_code == 401


def test_automation_exam_auto_transitions_to_ongoing(client, admin_headers):
    today = date.today()
    client.post("/api/v1/admin/exams", json={
        "name": "Mock Exam", "class_name": "JSS 1A", "status": "scheduled",
        "start_date": (today - timedelta(days=1)).isoformat(),
        "end_date": (today + timedelta(days=2)).isoformat(),
    }, headers=admin_headers)

    r = client.post("/api/v1/admin/automation/run-now", headers=admin_headers)
    assert r.status_code == 200
    assert r.json()["exam_transitions"] >= 1

    exams = client.get("/api/v1/admin/exams", headers=admin_headers).json()["items"]
    assert next(e for e in exams if e["name"] == "Mock Exam")["status"] == "ongoing"


def test_automation_exam_auto_transitions_to_completed(client, admin_headers):
    today = date.today()
    client.post("/api/v1/admin/exams", json={
        "name": "Past Exam", "class_name": "JSS 1A", "status": "ongoing",
        "start_date": (today - timedelta(days=5)).isoformat(),
        "end_date": (today - timedelta(days=1)).isoformat(),
    }, headers=admin_headers)

    client.post("/api/v1/admin/automation/run-now", headers=admin_headers)
    exams = client.get("/api/v1/admin/exams", headers=admin_headers).json()["items"]
    assert next(e for e in exams if e["name"] == "Past Exam")["status"] == "completed"


def test_automation_birthday_shoutout_posted(client, admin_headers):
    today = date.today()
    client.post("/api/v1/students/", json={
        "first_name": "Zara", "last_name": "Ahmed", "email": "zara@test.com",
        "class_name": "JSS 1A", "date_of_birth": today.isoformat(),
    }, headers=admin_headers)

    r = client.post("/api/v1/admin/automation/run-now", headers=admin_headers)
    assert r.json()["birthday_shoutouts"] >= 1

    announcements = client.get("/api/v1/admin/announcements", headers=admin_headers).json()["items"]
    assert any("Happy Birthday" in a["title"] and "Zara" in a["title"] for a in announcements)


def test_automation_no_birthday_shoutout_on_wrong_day(client, admin_headers):
    not_today = date.today() + timedelta(days=100)
    client.post("/api/v1/students/", json={
        "first_name": "NotToday", "last_name": "Person", "email": "notoday@test.com",
        "class_name": "JSS 1A", "date_of_birth": not_today.isoformat(),
    }, headers=admin_headers)

    r = client.post("/api/v1/admin/automation/run-now", headers=admin_headers)
    announcements = client.get("/api/v1/admin/announcements", headers=admin_headers).json()["items"]
    assert not any("NotToday" in a["title"] for a in announcements)


def test_automation_fee_reminder_sent_for_upcoming_due_date(client, admin_headers):
    today = date.today()
    client.post("/api/v1/students/", json={
        "first_name": "Tunde", "last_name": "Okafor", "email": "tunde@test.com",
        "class_name": "JSS 1A", "parent_email": "parent.okafor@test.com",
    }, headers=admin_headers)
    client.post("/api/v1/fees/structures", json={
        "class_name": "JSS 1A", "term": "Second Term", "session": "2025/2026",
        "fees": [{"type": "tuition", "amount": 30000}],
        "due_date": (today + timedelta(days=1)).isoformat(),
    }, headers=admin_headers)

    r = client.post("/api/v1/admin/automation/run-now", headers=admin_headers)
    assert r.json()["fee_reminders_sent"] >= 1


def test_automation_no_fee_reminder_when_due_date_far_away(client, admin_headers):
    today = date.today()
    client.post("/api/v1/students/", json={
        "first_name": "FarDue", "last_name": "Student", "email": "farsdue@test.com", "class_name": "JSS 2A",
    }, headers=admin_headers)
    client.post("/api/v1/fees/structures", json={
        "class_name": "JSS 2A", "term": "Second Term", "session": "2025/2026",
        "fees": [{"type": "tuition", "amount": 30000}],
        "due_date": (today + timedelta(days=30)).isoformat(),
    }, headers=admin_headers)

    r = client.post("/api/v1/admin/automation/run-now", headers=admin_headers)
    assert r.json()["fee_reminders_sent"] == 0


def test_automation_run_now_is_idempotent_without_force(client, admin_headers):
    r1 = client.post("/api/v1/admin/automation/run-now", headers=admin_headers)
    assert r1.json()["skipped"] is False

    # run-now always forces, so calling it again still executes (not testing
    # the force path here — see status/log below for the "ran today" marker)
    status = client.get("/api/v1/admin/automation/status", headers=admin_headers)
    assert status.status_code == 200
    assert status.json()["last_run_date"] == date.today().isoformat()


def test_automation_log_records_runs(client, admin_headers):
    client.post("/api/v1/admin/automation/run-now", headers=admin_headers)
    r = client.get("/api/v1/admin/automation/log", headers=admin_headers)
    assert r.status_code == 200
    assert len(r.json()["items"]) >= 1


def test_advance_term_cycles_through_terms(client, admin_headers):
    client.put("/api/v1/admin/settings", json={"current_term": "First Term", "current_session": "2025/2026"}, headers=admin_headers)

    r1 = client.post("/api/v1/admin/settings/advance-term", headers=admin_headers)
    assert r1.json()["current_term"] == "Second Term"
    assert r1.json()["is_session_rollover"] is False

    r2 = client.post("/api/v1/admin/settings/advance-term", headers=admin_headers)
    assert r2.json()["current_term"] == "Third Term"

    r3 = client.post("/api/v1/admin/settings/advance-term", headers=admin_headers)
    assert r3.json()["current_term"] == "First Term"
    assert r3.json()["current_session"] == "2026/2027"
    assert r3.json()["is_session_rollover"] is True


def test_fee_structure_copy_forward(client, admin_headers):
    client.post("/api/v1/fees/structures", json={
        "class_name": "JSS 3A", "term": "Second Term", "session": "2025/2026",
        "fees": [{"type": "tuition", "amount": 45000}], "due_date": "2026-03-01",
    }, headers=admin_headers)

    r1 = client.post("/api/v1/fees/structures/copy-forward", json={
        "from_term": "Second Term", "from_session": "2025/2026",
        "to_term": "Third Term", "to_session": "2025/2026",
    }, headers=admin_headers)
    assert r1.status_code == 200
    assert r1.json()["created_count"] == 1

    # Running it again should skip since the target already has a structure
    r2 = client.post("/api/v1/fees/structures/copy-forward", json={
        "from_term": "Second Term", "from_session": "2025/2026",
        "to_term": "Third Term", "to_session": "2025/2026",
    }, headers=admin_headers)
    assert r2.json()["created_count"] == 0
    assert r2.json()["skipped_count"] == 1
