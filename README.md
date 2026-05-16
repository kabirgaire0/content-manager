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
- Web: `cm_session` HTTP-only cookie on `localhost:3000` (Secure flag flips on automatically when `NODE_ENV=production`)
- API: `Authorization: Bearer <token>` — the Next.js layer reads the cookie and forwards it
- `/auth/login` is rate-limited (5 attempts per 5 min per IP, 429 + Retry-After)
- Public endpoints: `/health`, `/auth/status`, `/auth/setup`, `/auth/login`, `/spotify/callback`
- `/spotify/login` requires a session-bound signed ticket (the Next.js `/api/spotify/connect` handler mints it from `/spotify/ticket` before redirecting the browser)
- Everything else (items, audio, Spotify state/control, logout, `/me`) requires a session

## Deploying outside localhost

For a full guide (DNS, Docker Compose, Caddy auto-HTTPS, Spotify redirect, backups, troubleshooting), see [**DEPLOY.md**](./DEPLOY.md). One-VPS Docker deploy is the supported shape; nginx as an alternative reverse proxy is included.

Minimums to remember when running outside localhost:

- Set `APP_ENV=prod` in `api/.env` — the API refuses to start unless `STATE_SECRET` has been changed from the dev default.
- Generate a real secret: `python -c "import secrets; print(secrets.token_hex(32))"`
- Set `PUBLIC_API_BASE_URL` in `web/.env` to the public API hostname (browser-facing) — internal `API_BASE_URL` stays the in-network URL.
- Update the Spotify Developer app's redirect URI to your public callback.

Web responses ship with `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: same-origin`, and a `Permissions-Policy` that disables APIs we don't use.

## Multi-device

The app is installable as a PWA on iOS and desktop (Safari → Share → Add to Home Screen; Chrome → install icon in URL bar). Manifest + theme color + maskable icon are wired into the root layout.

- **/devices** page lists every active session with user-agent label, last-seen timestamp, and a "this device" indicator. Revoke remote sessions or sign out of the current one.
- The dashboard re-renders every 15 s while the tab is visible, so a note created on your phone shows up on the laptop without manual refresh.
- Each session has a non-secret `session_id` exposed in URLs; the bearer token itself never leaves the API except in the login response.

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
| `voice_memo` | `audio_path`, `audio_mime`, `audio_duration_ms`, `transcript`, `transcript_status`, `transcript_lang` | Recorded audio + local Whisper transcript |

All kinds share `title, body, tags[], pinned, color, archived, created_at, updated_at`. Audio files for voice memos live on disk under `api/data/audio/{id}.{ext}`; the DB just stores the relative path.

## Voice memo transcription

Voice memos are auto-transcribed locally with [faster-whisper](https://github.com/SYSTRAN/faster-whisper). The model lazy-loads on first use (downloads ~150 MB for the default `base` model, cached under `~/.cache/huggingface/hub`) and runs entirely on CPU — no network calls, no API keys.

- Model size is `WHISPER_MODEL` in `api/.env` (default `base`, options `tiny` / `base` / `small` / `medium` / `large-v3`, plus `.en` variants for English-only)
- A `threading.Lock` serializes transcription so two uploads back-to-back queue instead of fighting for CPU
- Run via FastAPI `BackgroundTasks` — the upload returns immediately with `transcript_status="pending"`, the UI polls every 4s until the row flips to `done`
- The edit page has a **Re-transcribe** button if you want to redo a result

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
- [x] Phase 3.5 — Voice memo transcription (local faster-whisper)
- [x] Phase 4 — Single-user PIN auth
- [x] Phase 4.5 — Multi-device: session management, PWA install, dashboard auto-refresh
- [ ] Phase 4.7 — Real accounts (multi-user) when sharing or per-user data becomes needed
- [ ] Phase 5 — iOS client + VPS / GCP deploy
