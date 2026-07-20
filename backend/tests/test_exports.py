"""PDF/Excel export endpoint tests."""


def test_excel_students_downloads(client, admin_headers):
    r = client.get("/api/v1/exports/excel/students", headers=admin_headers)
    assert r.status_code == 200
    assert "spreadsheetml" in r.headers["content-type"]


def test_pdf_receipt_downloads(client, admin_headers):
    r = client.post("/api/v1/finance/payments", json={
        "student_name": "A", "amount": 1000, "type": "tuition", "method": "cash",
    }, headers=admin_headers)
    pay_id = r.json()["id"]

    r2 = client.get(f"/api/v1/exports/pdf/receipt/{pay_id}", headers=admin_headers)
    assert r2.status_code == 200
    assert r2.headers["content-type"] == "application/pdf"
    assert len(r2.content) > 100


def test_pdf_receipt_404_for_unknown_payment(client, admin_headers):
    r = client.get("/api/v1/exports/pdf/receipt/does-not-exist", headers=admin_headers)
    assert r.status_code == 404


def test_pdf_report_card_downloads(client, admin_headers, make_user):
    make_user(
        id="student-fixture-id", email="student@test.com", username="cis001",
        full_name="Amina Yusuf", role="student",
        preferences='{"class_name":"JSS 1","gender":"female"}',
    )

    client.post("/api/v1/system/results", json={
        "student_name": "Amina Yusuf", "student_id": "student-fixture-id", "class_name": "JSS 1",
        "subject": "Maths", "ca_score": 30, "exam_score": 58, "term": "Second Term", "session": "2025/2026",
    }, headers=admin_headers)

    r = client.get("/api/v1/exports/pdf/report-card/student-fixture-id?term=Second Term&session=2025/2026", headers=admin_headers)
    assert r.status_code == 200
    assert r.headers["content-type"] == "application/pdf"


def test_admission_letter_requires_approved_status(client, admin_headers):
    r = client.post("/api/v1/admin/admissions", json={
        "applicant_name": "New Kid", "email": "newkid@test.com", "phone": "1", "class_applying": "JSS 1",
    }, headers=admin_headers)
    adm_id = r.json()["id"]

    r2 = client.get(f"/api/v1/exports/pdf/admission-letter/{adm_id}", headers=admin_headers)
    assert r2.status_code == 400  # still pending, not approved

    client.put(f"/api/v1/admin/admissions/{adm_id}/status?status=approved", headers=admin_headers)
    r3 = client.get(f"/api/v1/exports/pdf/admission-letter/{adm_id}", headers=admin_headers)
    assert r3.status_code == 200
