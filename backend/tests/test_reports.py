"""Reports — verify the actual response shape for each report type."""


def test_generate_student_performance_report(client, admin_headers):
    r = client.get("/api/v1/admin/reports/generate/student_performance", headers=admin_headers)
    assert r.status_code == 200
    body = r.json()
    assert body["type"] == "student_performance"
    assert "total_students" in body["summary"]
    assert "grade_distribution" in body["summary"]
    assert isinstance(body["data"], list)


def test_generate_financial_summary_report(client, admin_headers):
    r = client.get("/api/v1/admin/reports/generate/financial_summary", headers=admin_headers)
    assert r.status_code == 200
    body = r.json()
    assert body["type"] == "financial_summary"
    assert "total_collected" in body["summary"]
    assert "by_type" in body["summary"]


def test_generate_attendance_analysis_report(client, admin_headers):
    r = client.get("/api/v1/admin/reports/generate/attendance_analysis", headers=admin_headers)
    assert r.status_code == 200
    body = r.json()
    assert body["type"] == "attendance_analysis"
    assert "rate" in body["summary"]


def test_generate_examination_results_report(client, admin_headers):
    r = client.get("/api/v1/admin/reports/generate/examination_results", headers=admin_headers)
    assert r.status_code == 200
    body = r.json()
    assert body["type"] == "examination_results"
    assert "total_exams" in body["summary"]


def test_generate_invalid_report_type_rejected(client, admin_headers):
    r = client.get("/api/v1/admin/reports/generate/not_a_real_type", headers=admin_headers)
    assert r.status_code == 400


def test_reports_require_staff_auth(client):
    r = client.get("/api/v1/admin/reports/generate/student_performance")
    assert r.status_code == 401
