"""Payments, expenses, fee structures, outstanding fees."""


def test_record_payment_generates_receipt(client, admin_headers):
    r = client.post("/api/v1/finance/payments", json={
        "student_name": "Amina Yusuf", "amount": 45000, "type": "tuition", "method": "cash",
    }, headers=admin_headers)
    assert r.status_code == 200
    data = r.json()
    assert data["receipt_number"].startswith("RCP/")
    assert data["status"] == "paid"


def test_finance_stats_reflects_payments(client, admin_headers):
    client.post("/api/v1/finance/payments", json={
        "student_name": "A", "amount": 10000, "type": "tuition", "method": "cash",
    }, headers=admin_headers)
    r = client.get("/api/v1/finance/stats", headers=admin_headers)
    assert r.status_code == 200
    assert r.json()["total_revenue"] >= 10000


def test_fee_structure_validation(client, admin_headers):
    r = client.post("/api/v1/fees/structures", json={"class_name": "JSS 1"}, headers=admin_headers)
    assert r.status_code == 422  # missing required fields


def test_fee_structure_total_calculated(client, admin_headers):
    r = client.post("/api/v1/fees/structures", json={
        "class_name": "JSS 1", "term": "Second Term", "session": "2025/2026",
        "fees": [{"type": "tuition", "amount": 45000}, {"type": "pta", "amount": 2000}],
        "due_date": "2026-03-01",
    }, headers=admin_headers)
    assert r.status_code == 200
    assert r.json()["total_amount"] == 47000


def test_outstanding_fees_report(client, admin_headers):
    client.post("/api/v1/fees/structures", json={
        "class_name": "JSS 1", "term": "Second Term", "session": "2025/2026",
        "fees": [{"type": "tuition", "amount": 45000}], "due_date": "2026-03-01",
    }, headers=admin_headers)
    r = client.get("/api/v1/fees/outstanding?term=Second Term&session=2025/2026", headers=admin_headers)
    assert r.status_code == 200
    assert "total_outstanding" in r.json()


def test_payroll_calculates_statutory_deductions(client, admin_headers):
    r = client.post("/api/v1/system/payroll", json={
        "employee_id": "T1", "employee_name": "Mr Bello", "role": "teacher",
        "basic_salary": 100000, "allowances": 10000, "month": "June", "year": "2026",
    }, headers=admin_headers)
    assert r.status_code == 200
    data = r.json()
    assert data["net_salary"] < data["basic_salary"] + data["allowances"]  # deductions applied
    assert "tax_breakdown" in data
    assert data["tax_breakdown"]["pension"] > 0


def test_payroll_bulk_run_creates_entries_for_teachers(client, admin_headers, make_user):
    make_user(email="teach_bulk@test.com", username="teach_bulk", full_name="Bulk Teacher", role="teacher")

    r = client.post("/api/v1/system/payroll/bulk-run", json={"month": "July", "year": "2026"}, headers=admin_headers)
    assert r.status_code == 200
    assert r.json()["created_count"] >= 1


def test_payroll_bulk_run_skips_duplicates(client, admin_headers, make_user):
    make_user(email="teach_dup@test.com", username="teach_dup", full_name="Dup Teacher", role="teacher")

    r1 = client.post("/api/v1/system/payroll/bulk-run", json={"month": "July", "year": "2026"}, headers=admin_headers)
    r2 = client.post("/api/v1/system/payroll/bulk-run", json={"month": "July", "year": "2026"}, headers=admin_headers)
    assert r2.json()["created_count"] == 0
    assert len(r2.json()["skipped"]) >= 1
