"""Aggregated v1 router."""
from fastapi import APIRouter
from app.api.v1.endpoints import (
    auth, users, school, management, students, academics,
    attendance, examinations, finance, uniforms, gallery,
    cms, reports, settings, search, analytics,
    ai, academics_v2, public, website_v2,
    notifications, files, settings_v2, backups, seo,
    reports_v2,
)
from app.api.v1.endpoints.admission import public as admission_public, admin as admission_admin
from app.api.v1.endpoints.student_v2 import students as students_v2
from app.api.v1.endpoints.academic_v2 import subjects, assignments, timetables
from app.api.v1.endpoints.hr import teachers, staff
from app.api.v1.endpoints.exam_v2 import exams, scores, results, analytics as exam_analytics
from app.api.v1.endpoints.finance_v2 import fees, payments, invoices, expenses, income, payroll, analytics as finance_analytics
from app.api.v1.endpoints.communication import announcements, events, news, email, sms
from app.api.v1.endpoints.cms_v3 import (
    pages as cms_pages, menus as cms_menus, media as cms_media,
    contact as cms_contact, analytics as cms_analytics,
    seo as cms_seo, ai_sync as cms_ai_sync, public as cms_public,
)
from app.api.v1.endpoints import qr as qr_codes, installation, seed

router = APIRouter()

# Previous parts (1A-3B)
router.include_router(auth.router, prefix="/auth", tags=["auth"])
router.include_router(users.router, prefix="/users", tags=["users"])
router.include_router(school.router, prefix="/school", tags=["school"])
router.include_router(management.router, prefix="/management", tags=["management"])
router.include_router(students.router, prefix="/students-legacy", tags=["students-legacy"])
router.include_router(academics.router, prefix="/academics-legacy", tags=["academics-legacy"])
router.include_router(attendance.router, prefix="/attendance", tags=["attendance"])
router.include_router(examinations.router, prefix="/examinations-legacy", tags=["examinations-legacy"])
router.include_router(finance.router, prefix="/finance-legacy", tags=["finance-legacy"])
router.include_router(uniforms.router, prefix="/uniforms", tags=["uniforms"])
router.include_router(gallery.router, prefix="/gallery-legacy", tags=["gallery-legacy"])
router.include_router(cms.router, prefix="/cms-legacy", tags=["cms-legacy"])
router.include_router(reports.router, prefix="/reports-legacy", tags=["reports-legacy"])
router.include_router(settings.router, prefix="/settings-legacy", tags=["settings-legacy"])
router.include_router(search.router, prefix="/search", tags=["search"])
router.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
router.include_router(ai.router, prefix="/ai", tags=["ai-receptionist"])
router.include_router(academics_v2.router, prefix="/academics-v2-legacy", tags=["academics-v2-legacy"])
router.include_router(public.router, prefix="/public-legacy", tags=["public-legacy"])
router.include_router(website_v2.router, prefix="/website-v2", tags=["website-v2-admin"])
router.include_router(notifications.router, prefix="/notifications", tags=["notifications"])
router.include_router(files.router, prefix="/files", tags=["files"])
router.include_router(settings_v2.router, prefix="/settings", tags=["settings"])
router.include_router(backups.router, prefix="/backups", tags=["backups"])
router.include_router(seo.router, prefix="/seo-legacy", tags=["seo-legacy"])
router.include_router(reports_v2.router, prefix="/reports", tags=["reports"])
router.include_router(admission_public.router, prefix="/admissions", tags=["admissions-public"])
router.include_router(admission_admin.router, prefix="/admin/admissions", tags=["admissions-admin"])
router.include_router(students_v2.router, prefix="/students", tags=["students"])
router.include_router(subjects.router, prefix="/subjects", tags=["subjects"])
router.include_router(assignments.router, prefix="/teacher-assignments", tags=["teacher-assignments"])
router.include_router(timetables.router, prefix="/timetables", tags=["timetables"])
router.include_router(teachers.router, prefix="/teachers", tags=["teachers"])
router.include_router(staff.router, prefix="/staff", tags=["staff"])
router.include_router(exams.router, prefix="/exams", tags=["exams"])
router.include_router(scores.router, prefix="/scores", tags=["scores"])
router.include_router(results.router, prefix="/results", tags=["results"])
router.include_router(exam_analytics.router, prefix="/academic-analytics", tags=["academic-analytics"])
router.include_router(fees.router, prefix="/finance/fees", tags=["finance-fees"])
router.include_router(payments.router, prefix="/finance/payments", tags=["finance-payments"])
router.include_router(invoices.router, prefix="/finance/invoices", tags=["finance-invoices"])
router.include_router(expenses.router, prefix="/finance/expenses", tags=["finance-expenses"])
router.include_router(income.router, prefix="/finance/income", tags=["finance-income"])
router.include_router(payroll.router, prefix="/finance/payroll", tags=["finance-payroll"])
router.include_router(finance_analytics.router, prefix="/finance/analytics", tags=["finance-analytics"])
router.include_router(announcements.router, prefix="/communication/announcements", tags=["communication-announcements"])
router.include_router(events.router, prefix="/communication/events", tags=["communication-events"])
router.include_router(news.router, prefix="/communication/news", tags=["communication-news"])
router.include_router(email.router, prefix="/communication/email", tags=["communication-email"])
router.include_router(sms.router, prefix="/communication/sms", tags=["communication-sms"])
router.include_router(cms_pages.router, prefix="/cms-v3/pages", tags=["cms-pages"])
router.include_router(cms_menus.router, prefix="/cms-v3/menus", tags=["cms-menus"])
router.include_router(cms_media.router, prefix="/cms-v3/media", tags=["cms-media"])
router.include_router(cms_contact.router, prefix="/cms-v3/contact", tags=["cms-contact"])
router.include_router(cms_analytics.router, prefix="/cms-v3/analytics", tags=["cms-analytics"])
router.include_router(cms_seo.router, prefix="/cms-v3/seo", tags=["cms-seo"])
router.include_router(cms_ai_sync.router, prefix="/cms-v3/ai-sync", tags=["cms-ai-sync"])
router.include_router(cms_public.router, prefix="/cms-v3/public", tags=["cms-public"])

# Part 3C
router.include_router(qr_codes.codes.router, prefix="/qr", tags=["qr-codes"])
router.include_router(installation.router, prefix="/installation", tags=["installation"])
router.include_router(seed.router, prefix="/seed", tags=["seed-data"])
