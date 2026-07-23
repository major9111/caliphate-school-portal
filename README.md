# Fixes — apply into your project at matching paths (overwrite existing files)

## Frontend (frontend/src/...)
1. pages/auth/Register.tsx
   - Email and Phone fields stacked into one column instead of a 2-col grid.
2. hooks/useGsapPublic.ts
   - Added `useHeaderReveal()` — opacity+y reveal (no `scale`) for sticky/fixed
     headers, avoiding the scroll jank scale transforms cause on `position: sticky`.
3. components/layout/PublicLayout.tsx
   - Sticky `<header>` now uses `useHeaderReveal()` instead of `useHeroReveal()`.
4. pages/public/Admissions.tsx  (NEW FIX)
   - The public "Apply for Admission" form was posting to `/admin/admissions`,
     which requires staff login — so anonymous applicants always got rejected.
     Now posts to the new public `/public/admissions` endpoint (see backend below).

## Backend (backend/app/api/v1/...)
5. endpoints/public_admissions.py  (NEW FILE)
   - Unauthenticated POST /public/admissions — lets a visitor submit an
     application. Staff-only admissions management (list/approve/enroll)
     is untouched at /admin/admissions.
6. router.py
   - Registers the new public_admissions router at prefix /public, no auth
     dependency.

## Still outstanding (needs action on your end, not a code fix)
- Set VITE_API_URL on Vercel to your Render backend + /api/v1, then redeploy
  (Vite only bakes env vars in at build time).
- Run backend/scripts/seed_admin.py against your production DATABASE_URL to
  create your admin login.
