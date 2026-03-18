# Shared Data Setup (for 6 users)

GitHub Pages serves only static files, so `localStorage` data is not shared between users.
To share "업무 등록" data, run/deploy the API server in this repository and connect the frontend to it.

## 1) Run API locally

```bash
npm run api:dev
```

Server default URL:
- `http://localhost:8080/api`

## 2) Frontend environment

Create `.env` in project root:

```bash
VITE_API_BASE_URL=http://localhost:8080/api
VITE_API_TIMEOUT_MS=10000
VITE_API_USE_LOCAL_FALLBACK=false
```

Then run frontend:

```bash
npm run dev
```

## 3) Deploy for real shared usage

1. Deploy `server/index.mjs` to a Node hosting service (Render, Railway, Fly.io, etc.)
2. Set backend env:
   - `PORT` (provided by host)
   - `API_BASE_PATH=/api`
   - `CORS_ORIGIN=https://jungle75.github.io`
   - `DATA_FILE=/persistent-disk/work-entries.json` (must be persistent storage path)
3. Update frontend `.env`:
   - `VITE_API_BASE_URL=https://<your-backend-domain>/api`
   - `VITE_API_USE_LOCAL_FALLBACK=false`
4. Rebuild and redeploy frontend to GitHub Pages.

## API endpoints

- `GET /api/work-entries/assignees`
- `GET /api/work-entries?date=YYYY-MM-DD&assignee=...`
- `GET /api/work-entries/download?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&assignee=...`
- `GET /api/work-entries/:id`
- `POST /api/work-entries`
- `PUT /api/work-entries/:id`
