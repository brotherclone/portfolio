# Deployment Checklist

## Railway (backend)

- [ ] New project → deploy from GitHub → set root to `backend/`
- [ ] Set env var: `ALLOWED_ORIGINS=https://gabrielwalsh.com,https://*.vercel.app`
- [ ] Confirm `https://<railway-url>/health` returns `{"status":"ok"}`

## Vercel (frontend)

- [ ] New project → connect GitHub → set root directory to `frontend/`
- [ ] Set env var: `NEXT_PUBLIC_API_URL=https://<railway-url>`
- [ ] Deploy and confirm graph loads

## Cloudflare + DNS

- [ ] Add `gabrielwalsh.com` to Cloudflare (free plan)
- [ ] Update nameservers at registrar to Cloudflare nameservers
- [ ] Add CNAME `gabrielwalsh.com` → Vercel domain (follow Vercel custom domain flow)
- [ ] Enable HTTPS redirect in Cloudflare
- [ ] Verify with `dig gabrielwalsh.com`

## Smoke Test

- [ ] Open `https://gabrielwalsh.com` — graph renders, no console errors
- [ ] Confirm `/api/graph` calls succeed from production frontend to Railway backend

## Decommission Heroku

- [ ] Scale Heroku app to 0 dynos
- [ ] Schedule app for deletion after 7-day confirmation window
