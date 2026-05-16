# content-manager

A personal content manager and daily-driver app. Long-term goal: memos, voice memos, reminders, alarms, syncable across iOS / web / PC. Targets a Linux VPS / GCP deployment.

This first cut implements **posts** (title + body + draft/published) end to end so the architecture is in place; more content types build on the same plumbing.

## Stack

| Layer | Choice |
| --- | --- |
| Frontend | Next.js 16 (App Router, React 19, Server Actions) + Tailwind |
| Backend | FastAPI + SQLAlchemy 2.0 |
| Database | SQLite (Postgres-ready via `DATABASE_URL`) |
| Python tooling | uv |

The frontend speaks to the backend via server-side `fetch` from React Server Components and Server Actions — the API base URL never leaks to the browser.

## Layout

```
api/   FastAPI service (Python)
web/   Next.js frontend (TypeScript)
```

## Running locally

You need two terminals.

**Backend** (port 8000):

```bash
cd api
uv sync
uv run uvicorn app.main:app --reload --port 8000
```

Interactive API docs: `http://127.0.0.1:8000/docs`.

**Frontend** (port 3000):

```bash
cd web
npm install
npm run dev
```

Open `http://localhost:3000`.

The frontend reads `API_BASE_URL` (server-only env, default `http://127.0.0.1:8000`).

## Roadmap

- [x] Posts CRUD (proof of architecture)
- [ ] Memos
- [ ] Voice memos (audio upload + transcription)
- [ ] Reminders / alarms
- [ ] Auth (single-user → multi-device sync)
- [ ] iOS client
- [ ] VPS / GCP deploy
