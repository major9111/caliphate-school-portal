# Caliphate International Schools — Management Portal

Enterprise school management system. React 19 + TypeScript frontend, FastAPI backend, PostgreSQL-ready (Neon) with SQLite for local development.

See `AUDIT_REPORT.md` for the full audit findings and the fix log from the enterprise refactor pass.

## Stack

**Frontend:** React 19, TypeScript, Vite, Tailwind CSS, shadcn/ui, Chart.js + Recharts, React Router, TanStack Query
**Backend:** Python, FastAPI, SQLAlchemy, JWT auth (python-jose + bcrypt)
**Database:** SQLite locally, PostgreSQL (Neon) in production
**Deployment:** Frontend → Vercel. Backend → Railway or Render.

## Local development

### Backend
```bash
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # edit SECRET_KEY at minimum
uvicorn app.main:app --reload --port 8000
```
API docs available at `http://localhost:8000/docs`.

### Frontend
```bash
cd frontend
npm install
npm run dev
```
Runs at `http://localhost:5173`. Set `VITE_API_URL` in a `.env` file if the backend isn't on `localhost:8000/api/v1`.

## Architecture notes

- **Auth:** JWT bearer tokens. `/auth/register` blocks self-registration as `teacher`/`admin`/`super_admin` — those accounts must be created by an existing admin via the Teachers page or directly in the database.
- **Authorization:** Role-based. `/students`, `/teachers`, `/finance`, `/admin/*`, `/system/*` require `admin`/`super_admin`/`teacher`/`staff` roles. `/audit/*` requires `admin`/`super_admin`. `/system/portal/*` allows the resource owner (a student/parent viewing their own record) or any staff member.
- **Data storage:** `users`, `refresh_tokens`, `audit_logs`, and `activity_logs` are proper SQLAlchemy-backed relational tables. Every other module (results, finance, library, transport, inventory, payroll, CMS, events, etc.) is stored as JSON in a `system_settings` key-value table — a deliberate simplification given the project's existing state, documented as a known limitation in `AUDIT_REPORT.md`. A future migration to dedicated relational tables would be the next major architecture improvement.
- **AI Receptionist:** Uses Groq's API if `GROQ_API_KEY` is set; otherwise falls back to a canned "contact the school directly" response. Knowledge base entries are managed under Admin → AI Receptionist.

## Production checklist

- Set a real `SECRET_KEY` (the app refuses to start in `APP_ENV=production` with the default).
- Set `DATABASE_URL` to your Neon Postgres connection string.
- Set `CORS_ORIGINS` to your actual Vercel domain(s).
- Set `GROQ_API_KEY` if you want the AI Receptionist to give real answers instead of the fallback.
