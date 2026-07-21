#!/usr/bin/env python3
"""
Seed realistic demo data by calling the real, running API (not the DB
directly), so every request goes through the same validation your users
hit. Doubles as a smoke test: if any of these calls 4xx/5xx unexpectedly,
it prints the failure and keeps going, then exits non-zero.

Requires an admin account to already exist — run seed_admin.py first.

Usage:
    # against local dev server (uvicorn running on :8000)
    ADMIN_EMAIL="you@school.com" ADMIN_PASSWORD="yourpassword" \
        python scripts/seed_demo.py

    # against a deployed backend
    BASE_URL="https://your-backend.onrender.com/api/v1" \
        ADMIN_EMAIL="you@school.com" ADMIN_PASSWORD="yourpassword" \
        python scripts/seed_demo.py
"""
import os
import sys
import httpx

BASE_URL = os.getenv("BASE_URL", "http://localhost:8000/api/v1")
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD")

failures = []


def call(client, method, path, expect=(200, 201), **kwargs):
    r = client.request(method, path, **kwargs)
    ok = r.status_code in expect
    tag = "✅" if ok else "❌"
    print(f"{tag} {method:6s} {path:55s} -> {r.status_code}")
    if not ok:
        failures.append((method, path, r.status_code, r.text[:300]))
    try:
        return r.json()
    except Exception:
        return {}


def main():
    if not ADMIN_EMAIL or not ADMIN_PASSWORD:
        print("❌ Set ADMIN_EMAIL and ADMIN_PASSWORD env vars (the account you created with seed_admin.py).")
        sys.exit(1)

    with httpx.Client(base_url=BASE_URL, timeout=30) as client:
        print(f"Logging in as {ADMIN_EMAIL} against {BASE_URL} ...")
        login = call(client, "POST", "/auth/login", json={"login": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        token = login.get("access_token")
        if not token:
            print("❌ Could not log in — run seed_admin.py first, or check the credentials.")
            sys.exit(1)
        client.headers["Authorization"] = f"Bearer {token}"

        print("\n-- Teachers --")
        teacher = call(client, "POST", "/teachers/", json={
            "full_name": "Amina Yusuf", "email": "amina.yusuf.demo@caliphateschools.edu.ng",
            "phone": "+2348010000001", "subject": "Mathematics", "password": "DemoPass123!",
        })
        teacher_id = teacher.get("id")

        print("\n-- Classes --")
        klass = call(client, "POST", "/admin/classes", json={
            "name": "JSS1 Gold", "level": "JSS1", "capacity": 40, "class_teacher_id": teacher_id or "",
        })

        print("\n-- Students --")
        student = call(client, "POST", "/students/", json={
            "full_name": "Fatima Bello", "email": "fatima.bello.demo@caliphateschools.edu.ng",
            "phone": "+2348010000002", "password": "DemoPass123!",
            "class_name": "JSS1 Gold", "gender": "female", "date_of_birth": "2013-05-14",
            "parent_name": "Musa Bello", "parent_phone": "+2348010000003",
            "parent_email": "musa.bello.demo@example.com",
        })
        student_id = student.get("id")

        print("\n-- Fee structure --")
        call(client, "POST", "/fees/structures", json={
            "class_name": "JSS1 Gold", "term": "First Term", "session": "2025/2026",
            "fees": [
                {"label": "Tuition", "amount": 70000},
                {"label": "Development Levy", "amount": 15000},
            ],
            "description": "JSS1 Gold fees for First Term 2025/2026 (demo)",
        })

        print("\n-- Finance: payment --")
        student_name = student.get("first_name", "") + " " + student.get("last_name", "")
        call(client, "POST", "/finance/payments", json={
            "student_id": student_id, "student_name": student_name.strip() or "Fatima Bello",
            "amount": 85000, "payment_type": "tuition",
            "term": "First Term", "session": "2025/2026", "method": "bank_transfer",
        })

        print("\n-- Homework --")
        call(client, "POST", "/system/homework", json={
            "class_name": "JSS1 Gold", "subject": "Mathematics", "title": "Demo Assignment",
            "description": "Solve exercises 1-10.", "due_date": "2026-08-01",
        })

        print("\n-- Events --")
        call(client, "POST", "/system/events", json={
            "title": "Demo Open Day", "description": "Sample event for testing.",
            "date": "2026-09-01", "location": "Main Hall",
        })

        print("\n-- Announcements --")
        call(client, "POST", "/admin/announcements", json={
            "title": "Welcome (demo)", "content": "This is seeded demo content.",
            "audience": "all",
        })

        print("\n-- Read-only sanity sweep --")
        for path in [
            "/admin/dashboard/stats", "/students/", "/teachers/", "/admin/classes",
            "/finance/stats", "/finance/payments", "/fees/structures", "/fees/outstanding",
            "/system/homework", "/system/events", "/admin/announcements",
            "/system/attendance/stats", "/system/results", "/system/library/books",
            "/system/inventory", "/system/transport/routes", "/system/payroll",
            "/admin/promotion/preview?class_name=JSS1 Gold", "/audit/audit-logs", "/system/notifications",
        ]:
            call(client, "GET", path)

    print(f"\n{'='*60}")
    if failures:
        print(f"❌ {len(failures)} unexpected failure(s):")
        for method, path, status, body in failures:
            print(f"   {method} {path} -> {status}: {body}")
        sys.exit(1)
    print("✅ Demo data seeded and all sanity checks passed.")


if __name__ == "__main__":
    main()
