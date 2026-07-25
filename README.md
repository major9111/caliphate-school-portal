# Fixes — apply into your project at matching paths (overwrite existing files)

## Frontend (frontend/src/...)
1. pages/auth/Register.tsx — Email/Phone stacked into one column.
2. hooks/useGsapPublic.ts — added `useHeaderReveal()` (no `scale`) for sticky headers.
3. components/layout/PublicLayout.tsx — sticky header uses `useHeaderReveal()`.
4. pages/public/Admissions.tsx — public Apply form now posts to /public/admissions
   instead of the staff-only /admin/admissions.

## Backend (backend/app/...)
5. api/v1/endpoints/public_admissions.py (NEW) — unauthenticated POST /public/admissions.
6. api/v1/router.py — registers the new public_admissions router at /public, no auth.
7. core/config.py (NEW FIX) — adds optional ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_NAME settings.
8. main.py (NEW FIX) — on every startup, if ADMIN_EMAIL + ADMIN_PASSWORD are set as env vars,
   creates or resets that super_admin account directly against THIS service's own database.
   This replaces needing to run scripts/seed_admin.py by hand, and — importantly — guarantees
   the admin account exists in whichever database this exact running service is using (helpful
   if you've been unsure whether your Render service and your local seed script were even
   hitting the same database).

   To use it: on Render → Environment, add:
     ADMIN_EMAIL=abdullahisadiq647@gmail.com
     ADMIN_PASSWORD=Admin@123
   Then redeploy/restart the service. Check the deploy logs for:
     ✅ Admin account 'abdullahisadiq647@gmail.com' created from ADMIN_EMAIL/ADMIN_PASSWORD env vars.
   You can leave these env vars in place — every restart just re-confirms the same account/password,
   it won't create duplicates. Remove them later if you'd rather manage the password only via the
   app itself.

## Still outstanding (needs action on your end, not a code fix)
- Set VITE_API_URL on Vercel to your Render backend + /api/v1, then redeploy.
- Confirm which Render backend URL your Vercel VITE_API_URL actually points to — your login
  failing despite a correctly-seeded account strongly suggests it's hitting a different
  backend/database than the one you seeded directly. The ADMIN_EMAIL/ADMIN_PASSWORD env var
  approach above sidesteps this by seeding whichever backend is actually running.
