"""
Daily background automation.

Runs once per calendar day (guarded by a persisted "last run date" so it's
safe even if uvicorn --reload spins up multiple processes) and handles:

  1. Fee payment reminders (upcoming + overdue)
  2. Library overdue book reminders
  3. Exam status auto-transition (scheduled -> ongoing -> completed)
  4. Parent alerts after N consecutive student absences
  5. Birthday shout-outs posted as announcements

A manual "run now" trigger and a run-history log are exposed via
app/api/v1/endpoints/automation.py so this can be verified without waiting
a full day.
"""
import json
import logging
import uuid
from datetime import date, datetime, timezone

from apscheduler.schedulers.background import BackgroundScheduler

from app.core.database import SessionLocal
from app.core.email_service import _send, send_fee_reminder
from app.models.user import User
from app.api.v1.endpoints.complete_system import _load, _save
from app.api.v1.endpoints.complete_system import send_library_reminders

logger = logging.getLogger(__name__)

ABSENCE_ALERT_THRESHOLD = 3
FEE_REMINDER_LEAD_DAYS = 3
STATE_KEY = "automation_state"
RUN_LOG_KEY = "automation_run_log"


def _extra(user: User) -> dict:
    try:
        return json.loads(user.preferences) if user.preferences else {}
    except Exception:
        return {}


def _load_state(db) -> dict:
    raw = _load(db, STATE_KEY)
    return raw if isinstance(raw, dict) else {}


def _run_fee_reminders(db) -> int:
    structures = _load(db, "fee_structures")
    payments = _load(db, "payments")
    students = db.query(User).filter(User.role == "student", User.is_active == True).all()
    class_structure = {s.get("class_name", ""): s for s in structures}
    today = date.today()
    log = _load(db, "fee_reminder_log")
    reminded = {(r["student_id"], r["structure_id"]) for r in log}
    sent = 0

    for student in students:
        extra = _extra(student)
        structure = class_structure.get(extra.get("class_name", ""))
        if not structure:
            continue
        try:
            due = datetime.strptime(structure.get("due_date", ""), "%Y-%m-%d").date()
        except ValueError:
            continue
        if (due - today).days > FEE_REMINDER_LEAD_DAYS:
            continue  # too early to remind
        if (str(student.id), structure["id"]) in reminded:
            continue  # already reminded for this fee structure

        paid = sum(
            float(p.get("amount", 0)) for p in payments
            if p.get("student_name", "").lower() == student.full_name.lower() or p.get("student_id") == str(student.id)
        )
        owed = max(0.0, float(structure.get("total_amount", 0)) - paid)
        if owed <= 0:
            continue

        contact_email = extra.get("parent_email") or student.email
        if contact_email:
            send_fee_reminder(
                contact_email, extra.get("parent_name", "Parent/Guardian"), student.full_name,
                extra.get("class_name", ""), structure.get("term", ""), owed, structure.get("due_date", ""),
            )
            log.append({"student_id": str(student.id), "structure_id": structure["id"], "date": today.isoformat()})
            sent += 1

    _save(db, "fee_reminder_log", log[-2000:], "finance")
    return sent


def _run_exam_status_transitions(db) -> int:
    exams = _load(db, "exams")
    today = date.today().isoformat()
    changed = 0
    for e in exams:
        status = e.get("status")
        start, end = e.get("start_date", ""), e.get("end_date", "")
        if status == "scheduled" and start and start <= today <= (end or start):
            e["status"] = "ongoing"
            changed += 1
        elif status in ("scheduled", "ongoing") and end and today > end:
            e["status"] = "completed"
            changed += 1
    if changed:
        _save(db, "exams", exams, "academics")
    return changed


def _run_absence_alerts(db) -> int:
    records = _load(db, "attendance_records")
    students = db.query(User).filter(User.role == "student", User.is_active == True).all()
    log = _load(db, "absence_alert_log")
    already = {(a["student_id"], a["streak_start"]) for a in log}
    alerted = 0

    by_student: dict = {}
    for r in records:
        key = r.get("student_id") or r.get("student_name", "")
        by_student.setdefault(key, []).append(r)

    for student in students:
        sid = str(student.id)
        recs = sorted(by_student.get(sid, []) + by_student.get(student.full_name, []), key=lambda r: r.get("date", ""))
        if not recs:
            continue

        streak, streak_start = 0, None
        for r in reversed(recs):
            if r.get("status") == "absent":
                streak += 1
                streak_start = r.get("date")
            else:
                break

        if streak < ABSENCE_ALERT_THRESHOLD or (sid, streak_start) in already:
            continue

        extra = _extra(student)
        contact_email = extra.get("parent_email") or student.email
        if contact_email:
            html = f"""<div style="font-family:Arial,sans-serif;padding:20px">
                <h3>Attendance Alert</h3>
                <p>Dear {extra.get('parent_name', 'Parent/Guardian')},</p>
                <p><strong>{student.full_name}</strong> has been marked absent for
                <strong>{streak} consecutive recorded school days</strong>.</p>
                <p>Please contact the school office if there's anything we should know.</p></div>"""
            _send(contact_email, f"Attendance Alert — {student.full_name}", html)
        log.append({"student_id": sid, "streak_start": streak_start, "streak": streak, "alerted_at": datetime.now(timezone.utc).isoformat()})
        alerted += 1

    _save(db, "absence_alert_log", log[-2000:], "academics")
    return alerted


def _run_birthday_shoutouts(db) -> int:
    students = db.query(User).filter(User.role == "student", User.is_active == True).all()
    today = date.today()
    log = _load(db, "birthday_log")
    already_this_year = {(b["student_id"], b["year"]) for b in log}
    announcements = _load(db, "announcements")
    posted = 0

    for student in students:
        extra = _extra(student)
        dob = extra.get("date_of_birth", "")
        if not dob:
            continue
        try:
            dob_date = datetime.strptime(dob, "%Y-%m-%d").date()
        except ValueError:
            continue
        if (dob_date.month, dob_date.day) != (today.month, today.day):
            continue
        if (str(student.id), today.year) in already_this_year:
            continue

        first_name = student.full_name.split()[0] if student.full_name else "Student"
        announcements.insert(0, {
            "id": str(uuid.uuid4()),
            "title": f"🎉 Happy Birthday, {first_name}!",
            "content": f"Wishing {student.full_name} a very happy birthday from all of us at the school!",
            "type": "general",
            "audience": "all",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        log.append({"student_id": str(student.id), "year": today.year, "posted_at": datetime.now(timezone.utc).isoformat()})
        posted += 1

    if posted:
        _save(db, "announcements", announcements, "communication")
    _save(db, "birthday_log", log[-2000:], "communication")
    return posted


def run_daily_automations(db=None, force: bool = False) -> dict:
    """Run all daily automations once. Safe to call multiple times per day —
    only actually executes once unless `force=True` (used by the manual
    'Run Now' button so admins can test without waiting).

    Pass `db` when calling from a FastAPI request handler (via Depends(get_db))
    so it operates on the same session/connection as the rest of the request
    — and so tests can point it at an isolated test database. If omitted (the
    background scheduler's own periodic tick has no request to inject from),
    it opens its own session against the app's real database."""
    owns_session = db is None
    if owns_session:
        db = SessionLocal()
    try:
        today = date.today().isoformat()
        state = _load_state(db)

        if not force and state.get("last_run_date") == today:
            return {"skipped": True, "reason": f"Already ran today ({today})"}

        tasks = {
            "fee_reminders_sent": _run_fee_reminders,
            "exam_transitions": _run_exam_status_transitions,
            "absence_alerts_sent": _run_absence_alerts,
            "birthday_shoutouts": _run_birthday_shoutouts,
        }
        results = {}
        errors = {}
        for name, fn in tasks.items():
            try:
                results[name] = fn(db)
            except Exception as e:
                logger.error(f"[automation] task '{name}' failed: {e}")
                results[name] = 0
                errors[name] = str(e)
        try:
            results["library_reminders"] = send_library_reminders(db=db).get("sent", 0)
        except Exception as e:
            logger.error(f"[automation] task 'library_reminders' failed: {e}")
            results["library_reminders"] = 0
            errors["library_reminders"] = str(e)

        state["last_run_date"] = today
        state["last_run_at"] = datetime.now(timezone.utc).isoformat()
        _save(db, STATE_KEY, state, "system")

        run_log = _load(db, RUN_LOG_KEY)
        run_log.insert(0, {"id": str(uuid.uuid4()), "date": today, "ran_at": state["last_run_at"], **results, "errors": errors})
        _save(db, RUN_LOG_KEY, run_log[:100], "system")

        logger.info(f"[automation] daily run complete: {results}" + (f" (errors: {errors})" if errors else ""))
        return {"skipped": False, **results, "errors": errors}
    except Exception as e:
        logger.error(f"[automation] daily run failed: {e}")
        return {"skipped": True, "reason": str(e)}
    finally:
        if owns_session:
            db.close()


_scheduler: BackgroundScheduler | None = None


def start_scheduler():
    """Called once at app startup. Checks every hour whether today's run has
    already happened; if not, runs it. Hourly polling (rather than a fixed
    time-of-day trigger) means it self-heals if the server was offline when
    it would normally have fired."""
    global _scheduler
    if _scheduler is not None:
        return
    _scheduler = BackgroundScheduler(daemon=True)
    _scheduler.add_job(run_daily_automations, "interval", hours=1, next_run_time=datetime.now(), id="daily_automations")
    _scheduler.start()
    logger.info("[automation] scheduler started (hourly check, once-per-day execution)")
