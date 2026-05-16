# content-manager

A personal content manager and daily-driver app. Long-term goal: memos, voice memos, reminders, alarms, syncable across iOS / web / PC. Targets a Linux VPS / GCP deployment.

Phase 1 ships a generalized **item** model — one table that backs notes, memos, bookmarks, saved videos, diary entries, schedule items, and quick links — with a Google Keep–style dashboard (pinned first, kind filter chips, tag filter, masonry grid). Phase 2 adds a **Spotify** now-playing widget with transport controls.

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

Open `http://localhost:3000`. First visit you'll be redirected to `/setup` to pick a PIN — that PIN locks the app from then on. Subsequent sessions land on `/login`.

The frontend reads `API_BASE_URL` (server-only env, default `http://127.0.0.1:8000`).

## Auth

- Single-user PIN (≥ 4 chars), hashed with bcrypt
- 30-day server-side sessions; logging out invalidates the session row
- Web: `cm_session` HTTP-only cookie on `localhost:3000`
- API: `Authorization: Bearer <token>` — the Next.js layer reads the cookie and forwards it
- Public endpoints: `/health`, `/auth/status`, `/auth/setup`, `/auth/login`, `/spotify/login`, `/spotify/callback`
- Everything else (items, audio, Spotify state/control, logout, `/me`) requires a session

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
| `voice_memo` | `audio_path`, `audio_mime`, `audio_duration_ms` | Recorded audio captured in-browser |

All kinds share `title, body, tags[], pinned, color, archived, created_at, updated_at`. Audio files for voice memos live on disk under `api/data/audio/{id}.{ext}`; the DB just stores the relative path.

## Spotify setup

The Spotify widget on the dashboard needs a Spotify Developer app:

1. Go to https://developer.spotify.com/dashboard and create an app.
2. In the app's settings, add this Redirect URI:

   ```
   http://127.0.0.1:8000/spotify/callback
   ```

3. Copy `api/.env.example` to `api/.env` and fill in:

   ```env
   SPOTIFY_CLIENT_ID=...
   SPOTIFY_CLIENT_SECRET=...
   ```

4. Restart the API (`uv run uvicorn app.main:app --reload --port 8000`).
5. Open `http://localhost:3000` and click **Connect Spotify** in the widget.

Notes:
- Playback control requires **Spotify Premium** and an active Spotify device (the desktop/web app open, or a Connect-capable speaker).
- Tokens are stored in the API's SQLite DB and refreshed automatically.
- Disconnect any time from the widget.

## Roadmap

- [x] Phase 1 — items + Keep-style dashboard
- [x] Phase 2 — Spotify (OAuth + Now Playing + transport)
- [x] Phase 3 — Voice memos (MediaRecorder upload + playback)
- [ ] Phase 3.5 — Voice memo transcription (deferred)
- [x] Phase 4 — Single-user PIN auth
- [ ] Phase 4.5 — Multi-device sync (per-user, not just per-PIN)
- [ ] Phase 5 — iOS client + VPS / GCP deploy
