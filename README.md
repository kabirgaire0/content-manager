# content-manager

A personal content manager and daily-driver app. Long-term goal: memos, voice memos, reminders, alarms, syncable across iOS / web / PC. Targets a Linux VPS / GCP deployment.

Phase 1 ships a generalized **item** model — one table that backs notes, memos, bookmarks, saved videos, diary entries, schedule items, and quick links — with a Google Keep–style dashboard (pinned first, kind filter chips, tag filter, masonry grid).

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

## Item kinds

| Kind | Extra fields | Notes |
| --- | --- | --- |
| `note` | — | Keep-style cards (title + body + tags + color) |
| `memo` | — | Quick text capture |
| `bookmark` | `url` | Link saves |
| `video` | `url`, `provider` | Saved videos |
| `diary` | `entry_date` | Daily journal |
| `schedule` | `event_at`, `duration_min` | Calendar items |
| `quick_link` | `url`, `icon` | Dashboard shortcuts |

All kinds share `title, body, tags[], pinned, color, archived, created_at, updated_at`.

## Roadmap

- [x] Phase 1 — items + Keep-style dashboard
- [ ] Phase 2 — Spotify (OAuth + Now Playing + transport)
- [ ] Phase 3 — Voice memos (MediaRecorder upload + transcription)
- [ ] Phase 4 — Auth + multi-device sync
- [ ] Phase 5 — iOS client + VPS / GCP deploy
