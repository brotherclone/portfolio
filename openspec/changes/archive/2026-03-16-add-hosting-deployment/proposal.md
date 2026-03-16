# Change: Add Hosting Deployment

## Why

The portfolio currently lives on Heroku. Moving to Vercel (frontend) + Railway (backend) reduces cost, improves DX, and aligns with the stack. Cloudflare takes over DNS/CDN from Heroku's DNS. This change produces all deployment config needed to go live and decommission Heroku.

## What Changes

- Add `backend/Dockerfile` for Railway deployment (Python 3.12, uv, FastAPI/uvicorn)
- Add `railway.toml` for Railway service config (start command, health check, port)
- Add `vercel.json` for Vercel config (Next.js, environment variable references)
- Wire `NEXT_PUBLIC_API_URL` env var on Vercel → Railway backend URL
- Wire `ALLOWED_ORIGINS` env var on backend → production + preview origins
- Configure Cloudflare: add site, update nameservers at registrar, add DNS records pointing `gabrielwalsh.com` → Vercel
- Verify end-to-end: frontend loads graph data from Railway backend in production
- Deprovision Heroku after DNS propagation confirmed

## Impact

- Affected specs: `hosting` (new)
- Affected code: `backend/Dockerfile`, `railway.toml`, `vercel.json`, `backend/main.py` (env-driven CORS origins)
- **BREAKING** for current Heroku deploy — Heroku decommissioned as final step
