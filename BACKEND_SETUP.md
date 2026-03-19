# Shared Data Setup (Render Free + Supabase)

`GitHub Pages` is static hosting, so browser `localStorage` is not shared across users.
This project now supports shared storage through **Supabase** while keeping the same API contract.

## 1) Create Supabase table

1. Open Supabase project -> `SQL Editor`
2. Run: [server/supabase/schema.sql](/C:/ai-study/dailyWorkLog-1/server/supabase/schema.sql)
3. In `Project Settings -> API`, copy:
   - `Project URL` (SUPABASE_URL)
   - `service_role` key (SUPABASE_SERVICE_ROLE_KEY)

## 2) Render deployment

1. Push this repo (includes [render.yaml](/C:/ai-study/dailyWorkLog-1/render.yaml))
2. Render -> `New +` -> `Web Service` (or Blueprint)
3. Use:
   - Build Command: `npm ci`
   - Start Command: `npm run api:start`
4. Add environment variables in Render:
   - `API_BASE_PATH=/api`
   - `CORS_ORIGIN=https://jungle75.github.io,http://localhost:5173`
   - `SUPABASE_URL=<your supabase project url>`
   - `SUPABASE_SERVICE_ROLE_KEY=<your service role key>`
   - `SUPABASE_TABLE=work_entries`
5. Deploy and verify:
   - `https://<render-service>.onrender.com/api/work-entries/assignees`

## 3) Connect frontend (GitHub Pages build)

In GitHub repository:

`Settings -> Secrets and variables -> Actions -> Variables`

- `VITE_API_BASE_URL=https://<render-service>.onrender.com/api`

Then push to `main` to trigger Pages deploy.

## 4) Local development

Root `.env` example:

```bash
VITE_API_BASE_URL=http://localhost:8080/api
VITE_API_TIMEOUT_MS=10000
VITE_API_USE_LOCAL_FALLBACK=false
```

Run:

```bash
npm run api:dev
npm run dev
```
