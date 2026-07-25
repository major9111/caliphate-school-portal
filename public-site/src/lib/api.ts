// Public site talks to the SAME Django backend as the student portal, but
// only ever calls public, unauthenticated endpoints (search, etc.).
// IMPORTANT: once deployed, add this site's domain to the backend's
// CORS_ALLOWED_ORIGINS (see backend/fugusau/settings/*.py) or these calls
// will be blocked by the browser.
export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'
