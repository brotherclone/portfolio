## 1. Backend — Railway Config

- [x] 1.1 Write `backend/Dockerfile`: Python 3.12 slim, install uv, sync dependencies, copy app, expose `$PORT`, start uvicorn
- [x] 1.2 Add `GET /health` endpoint to `backend/main.py` — returns `{"status": "ok"}` after store is loaded
- [x] 1.3 Write `railway.toml`: set `startCommand`, `healthcheckPath = /health`, `healthcheckTimeout = 30`
- [x] 1.4 Replace hardcoded `_ALLOWED_ORIGINS` list in `backend/main.py` with `ALLOWED_ORIGINS` env var (comma-split, fallback to defaults)

## 2. Frontend — Vercel Config

- [x] 2.1 Write `vercel.json`: framework `nextjs`, no rewrites needed (direct Railway calls from client)
- [x] 2.2 Update `frontend/src/lib/api.ts` to read base URL from `process.env.NEXT_PUBLIC_API_URL`, fallback to `http://localhost:8000`
- [x] 2.3 Add `NEXT_PUBLIC_API_URL` to Vercel project environment variables (set to Railway public URL after deploy)

## 3. Railway Deploy

- [x] 3.1 Create Railway project, add service from `backend/` via GitHub repo
- [x] 3.2 Set `ALLOWED_ORIGINS` env var on Railway to include Vercel production URL + preview wildcard
- [x] 3.3 Confirm health check passes and `/api/graph` returns data

## 4. Vercel Deploy

- [x] 4.1 Create Vercel project, connect GitHub repo, set root directory to `frontend/`
- [x] 4.2 Set `NEXT_PUBLIC_API_URL` to Railway public URL
- [x] 4.3 Confirm production build passes and frontend loads

## 5. Cloudflare DNS

- [x] 5.1 Add `gabrielwalsh.com` to Cloudflare (free plan)
- [x] 5.2 Update nameservers at domain registrar to Cloudflare nameservers
- [x] 5.3 Add CNAME `gabrielwalsh.com` → Vercel (follow Vercel custom domain flow)
- [x] 5.4 Enable HTTPS redirect in Cloudflare (HTTP → HTTPS)
- [x] 5.5 Wait for DNS propagation; verify with `dig gabrielwalsh.com`

## 6. Smoke Test & Decommission

- [x] 6.1 Open `https://gabrielwalsh.com` — confirm graph renders with ontology data, no console errors
- [x] 6.2 Confirm `/api/graph` calls succeed from production frontend to Railway backend
- [x] 6.3 Scale Heroku app to 0 dynos
- [ ] 6.4 Schedule Heroku app for deletion after 7-day confirmation window
