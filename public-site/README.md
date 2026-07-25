# FUGUSAU Public Website

A separate app from the student portal (`../frontend`) — this is the public-facing
marketing/info site meant to be what shows up when someone searches "Federal
University Gusau".

## Stack (all free/open-source)
- React + TypeScript + Vite
- Tailwind CSS
- GSAP + ScrollTrigger (core + all plugins are free since GSAP joined Webflow in 2024)
- Bootstrap Icons
- React Router

## Run it
```
npm install
cp .env.example .env   # point VITE_API_URL at your backend if not localhost
npm run dev
```

## What's real vs. placeholder — please read before deploying

**Fully built & real:**
- Homepage: hero slider, animated stats, search bar, quick access, news/events/countdown
  layout, testimonials layout, partners marquee, footer — all wired and animated.
- Smart Search (`/ai` page, and the homepage search bar) — genuinely queries the
  backend's Postgres full-text search endpoint (`GET /api/v1/search/`). Free, no
  Elasticsearch or paid API involved.
- AI FAQ Assistant (`/ai` page) — real keyword-matching bot running entirely in
  the browser. Free, no LLM API involved.
- Contact page — real form UI (currently falls back to `mailto:` since there's
  no contact-form backend endpoint yet — wire one up when ready), embedded map.
- About page — real structure/design, but the actual History/Vision/Mission/etc.
  text is placeholder. Look for `[bracketed placeholder text]`.

**Deliberately NOT fabricated:**
- Administration, Academics, Students, Services, Research, Library, News,
  Downloads all render through `SectionPage` — a generic component that shows
  each sub-topic as a card. Cards with real backing (e.g. "Apply Now", "Student
  Portal") link out to the actual student portal. Everything else shows an
  honest "Coming soon" pill instead of invented names, bios, or history for a
  real university.
- No fake Vice Chancellor name/quote, no fake leadership bios, no fake
  convocation photos — those need real content from the University.

## Before deploying
1. Add this site's deployed domain to the backend's `CORS_ALLOWED_ORIGINS`
   (see `../backend/fugusau/settings/`), or the search calls will be blocked
   by the browser.
2. Replace placeholder text (search for `[` in `src/pages` and
   `src/components/home`) with real copy.
3. Swap `PORTAL_URL` in `src/data/nav.ts` for the real portal domain if it's
   not staying at `fugusau-portal.vercel.app`.
4. Update `sitemap.xml` / `robots.txt` in `public/` if the real domain differs
   from `www.fugusau.edu.ng`.
