# Changes in this pass

## Fixed bugs
- **`POST /students/` crashed with a 500** (unhandled DB IntegrityError) when
  `email` or name fields were missing. Now returns a clean 422, matching the
  validation pattern already used on the teachers endpoint.
  (`backend/app/api/v1/endpoints/students.py`)
- **`npm install` was broken** for anyone without `--legacy-peer-deps`:
  - `frontend/npmrc` was missing its leading dot, so `legacy-peer-deps=true`
    was never actually applied. Renamed to `.npmrc`.
  - `framer-motion` was listed as a dependency but not imported anywhere in
    the codebase, and its React 18 peer-dependency conflicted with this
    project's React 19. Removed it.
  - `lucide-react` was pinned to `0.294.0`, which predates React 19 support.
    Bumped to `^0.454.0`.
  - Verified: clean `npm install` + full `npm run build` (type-check +
    production bundle) now succeed with no errors, covering all 39+ routes.

## Why registration (and login) don't work on your live site
The backend itself is correct — I ran it and tested register/login directly.
The problem is deployment configuration, not code:
1. **No `VITE_API_URL` is set anywhere** for the frontend (no `.env`, no
   Vercel env var). It falls back to `http://localhost:8000/api/v1`, which
   doesn't exist for site visitors — every API call silently fails with
   "Cannot connect to server."
2. I found no evidence a backend is deployed to Railway/Render/anywhere yet.

**To fix, you need to:**
1. Deploy `backend/` to Railway or Render (a `Procfile` and `Dockerfile`
   are already in the repo).
2. On the backend host, set:
   - `SECRET_KEY` — a long random string (the app refuses to start in
     production with the placeholder default).
   - `DATABASE_URL` — your Neon Postgres connection string.
   - `CORS_ORIGINS` — your Vercel domain, e.g.
     `https://caliphate-school-portal-psxf.vercel.app`.
3. On Vercel (frontend), add an environment variable:
   - `VITE_API_URL=https://<your-backend-domain>/api/v1`
   Then redeploy — Vercel only bakes env vars in at build time.
4. Once that's live, seed your admin account by running (from `backend/`,
   with `DATABASE_URL` pointed at your production DB):
   ```
   ADMIN_EMAIL="you@school.com" ADMIN_PASSWORD="SomeStrongPass123" \
       python scripts/seed_admin.py
   ```
   Re-running this script later just resets the password on the same
   account — it's safe to run again.
5. Optional — seed realistic demo data by calling the live API:
   ```
   BASE_URL="https://<your-backend-domain>/api/v1" \
       ADMIN_EMAIL="you@school.com" ADMIN_PASSWORD="SomeStrongPass123" \
       python scripts/seed_demo.py
   ```
   This also doubles as a smoke test — it prints ✅/❌ per request and
   exits non-zero if anything unexpectedly fails.

If you'd rather I not touch your Vercel/Railway/Render accounts directly, I
can't — I don't have access to them. But I can walk through the exact
screens with you if useful.

## UI fixes
- **Footer**: was using a 55%-opacity `glass-dark` background *and* a
  scroll-triggered fade-in that only fired once scrolled ~85% into view —
  that's why it looked washed-out gray and showed up late. Now a solid
  navy gradient (`.site-footer` in `index.css`), rendered immediately with
  the rest of the page.
- **Back button**: added to the admin dashboard header (was missing
  entirely there); confirmed public/auth pages already had one, and added
  one more to the login page and the main reset-password screen for
  consistency.
- **Demo placeholder removed**: the login username field had
  `placeholder="superadmin"` — replaced with a neutral hint.

## Password reset flow
Already fully implemented on both sides — no missing pieces found:
- Backend: `POST /auth/forgot-password`, `GET /auth/verify-reset-token/{token}`,
  `POST /auth/reset-password` (1-hour token expiry, always returns 200 from
  forgot-password to prevent email enumeration).
- Frontend: `/forgot-password` and `/reset-password` pages, both routed and
  linked from the login page.
- Note: actual emails require `SMTP_HOST`/`SMTP_USER`/`SMTP_PASSWORD` to be
  set on the backend; without them, reset tokens are still generated
  correctly but no email is sent (check `backend/app/core/email_service.py`
  and `.env.example` for what to configure).

## Admin & demo seeding
- `backend/scripts/seed_admin.py` — new. Idempotent create-or-reset for a
  `super_admin` account, driven by `ADMIN_EMAIL`/`ADMIN_PASSWORD` (env vars
  or `--email`/`--password` flags). Safe to run against production.
- `backend/scripts/seed_demo.py` — new. Seeds a teacher, class, student, fee
  structure, payment, homework item, event, and announcement through the
  real API (not direct DB writes), then sanity-checks ~20 read endpoints.
  Tested end-to-end against a live server — all passing.
- `backend/scripts/reset_password.py` — pre-existing, still works, useful
  for resetting *any* user's password directly (not just admin) without
  needing SMTP configured.

## Tests
- Pre-existing suite: 90 tests, all passing, unchanged.
- New: `backend/tests/test_smoke_all_routes.py` — reads the live OpenAPI
  schema (152 operations across 110 paths) and calls every one of them,
  both unauthenticated and as an authenticated super_admin, asserting none
  crash with a 500. This is what caught the `/students/` bug above.
- **Total: 93 tests passing.** Run with:
  ```
  cd backend && python -m pytest -q
  ```

## Not done in this pass
- No live browser was available to me to click through every modal/button
  by hand. I substituted the OpenAPI-driven smoke sweep (catches backend
  crashes) plus a full frontend production build (catches compile/type
  errors across every page) — this covers reachability and correctness at
  the code level, not pixel-level UX review of every modal.
- I don't have access to your Vercel/Railway/Render/Neon accounts, so the
  actual production deployment and env-var configuration described above
  still needs to be done on your end.
