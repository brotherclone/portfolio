## ADDED Requirements

### Requirement: Railway Backend Deployment
The backend SHALL be deployable to Railway via a `Dockerfile` in `backend/`. The container MUST run `uvicorn` on the port Railway injects via `$PORT`, start within 30 seconds, and expose a `GET /health` endpoint returning HTTP 200.

#### Scenario: Health check passes
- **WHEN** Railway hits `GET /health` after container start
- **THEN** the response is HTTP 200 and the Oxigraph store has loaded `portfolio.ttl`

#### Scenario: Port binding
- **WHEN** the container starts with `PORT=8080`
- **THEN** uvicorn binds to `0.0.0.0:8080`

---

### Requirement: Environment-Driven CORS Origins
The FastAPI app SHALL read allowed origins from a `ALLOWED_ORIGINS` environment variable (comma-separated) at startup, falling back to `https://gabrielwalsh.com,http://localhost:3000` if unset. Hardcoded origin list MUST be removed.

#### Scenario: Production origins from env
- **WHEN** `ALLOWED_ORIGINS=https://gabrielwalsh.com,https://portfolio.vercel.app` is set
- **THEN** CORS headers permit requests from both origins and block all others

#### Scenario: Fallback origins in local dev
- **WHEN** `ALLOWED_ORIGINS` is not set
- **THEN** only `https://gabrielwalsh.com` and `http://localhost:3000` are permitted

---

### Requirement: Vercel Frontend Deployment
The frontend SHALL deploy to Vercel via a `vercel.json` config. `NEXT_PUBLIC_API_URL` MUST be set in the Vercel project environment variables to the Railway backend URL. All API calls in `frontend/src/lib/api.ts` MUST read from this variable — no hardcoded backend URLs.

#### Scenario: API URL consumed from env
- **WHEN** `NEXT_PUBLIC_API_URL=https://portfolio-api.railway.app` is set
- **THEN** all fetch calls in `api.ts` use that base URL

#### Scenario: Production build passes
- **WHEN** `vercel build` runs
- **THEN** it exits 0 with no TypeScript errors

---

### Requirement: Cloudflare DNS
`gabrielwalsh.com` SHALL resolve via Cloudflare DNS to the Vercel deployment. Nameservers at the domain registrar MUST point to Cloudflare. A CNAME or A record MUST route the apex domain to Vercel.

#### Scenario: DNS resolution
- **WHEN** `dig gabrielwalsh.com`
- **THEN** it resolves to a Vercel IP with Cloudflare as the authoritative nameserver

#### Scenario: HTTPS enforced
- **WHEN** a request is made to `http://gabrielwalsh.com`
- **THEN** Cloudflare redirects to `https://gabrielwalsh.com`

---

### Requirement: End-to-End Smoke Test
After deployment, a manual smoke test SHALL confirm the full stack is live: frontend loads, graph data is fetched from the Railway backend, and no console errors appear.

#### Scenario: Graph data loads in production
- **WHEN** `https://gabrielwalsh.com` is opened in a browser
- **THEN** the graph canvas renders with nodes from the ontology within 5 seconds

#### Scenario: Heroku decommissioned
- **WHEN** smoke test passes and DNS propagation is confirmed
- **THEN** the Heroku app is scaled to zero and scheduled for deletion
