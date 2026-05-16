# Deploying content-manager

Single-VPS Docker Compose deployment with auto-HTTPS via Caddy. Everything in this guide assumes a Linux box you SSH into (a $6/mo VPS is plenty) and a domain you control.

## What you need

- A server with Docker + Docker Compose (Ubuntu 22.04+, Debian 12+, any modern distro)
- A domain you control with DNS access
- Two subdomains: one for the web (e.g. `content.example.com`), one for the API (e.g. `api.content.example.com`)
- A [Spotify Developer app](https://developer.spotify.com/dashboard) (free)
- ~1 GB RAM minimum (4 GB recommended once Whisper warms up — `base` model uses ~500 MB resident)

## 1. DNS

Point both subdomains at the server's IPv4 (and AAAA for v6 if you have it):

```
content.example.com         A    1.2.3.4
api.content.example.com     A    1.2.3.4
```

Wait for propagation (`dig content.example.com +short` should return your IP).

## 2. Server setup

```bash
# Docker (skip if already installed)
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER  # then re-login

# Clone
git clone https://github.com/kabirgaire0/content-manager.git
cd content-manager
```

## 3. Configure

```bash
cd deploy

# API env (PIN/auth secrets, Spotify creds). The real .env files live
# under api/ and web/ subdirs so the project-level `.gitignore` keeps
# them out of git automatically.
cp api/.env.example api/.env
python3 -c "import secrets; print('STATE_SECRET=' + secrets.token_hex(32))" >> api/.env
$EDITOR api/.env

cp web/.env.example web/.env
$EDITOR web/.env

# Reverse proxy — replace example.com hostnames with yours
$EDITOR Caddyfile
```

In your **Spotify Developer dashboard** → App → Edit Settings → Redirect URIs, add **exactly**:

```
https://api.content.example.com/spotify/callback
```

(matching whatever you set as `SPOTIFY_REDIRECT_URI` in `api.env`).

## 4. First boot

```bash
cd deploy
docker compose up -d --build
docker compose logs -f
```

First boot does two slow things: builds the images (~2 min) and Caddy obtains certs (~10 s once DNS is right). When you see `served key authentication` from Caddy and `Application startup complete` from api, you're up.

## 5. Initial PIN setup

Open `https://content.example.com`. You'll be redirected to `/setup` to choose a PIN. After that, login with the PIN.

Connect Spotify from the widget on the dashboard. The OAuth flow will round-trip through `https://api.content.example.com/spotify/callback` — if it fails with **invalid_redirect_uri** the URI in step 3 isn't an exact match.

## 6. Backups

The whole app state lives in one Docker volume: `deploy_api-data`. Snapshot it nightly:

```bash
docker run --rm \
  -v deploy_api-data:/data:ro \
  -v $(pwd)/backups:/backup \
  alpine \
  tar czf /backup/cm-$(date +%Y%m%d).tgz -C /data .
```

This includes:
- `content.db` — SQLite database (notes, tags, Spotify token, sessions)
- `audio/` — voice memo files
- `whisper-cache/` — downloaded Whisper model (~150 MB; can be rebuilt by re-downloading, but backing up saves the redownload)

Rsync the `backups/` directory off-site.

## 7. Updates

```bash
git pull
cd deploy
docker compose up -d --build
```

Compose only rebuilds + restarts what changed. Sessions and Spotify tokens survive because the DB is on a named volume.

## Pattern B: single domain (no API subdomain)

If you don't want to register a second subdomain, you can put everything on one host with a path prefix:

Edit the `Caddyfile`:

```
content.example.com {
    encode gzip zstd

    handle_path /__api/* {
        reverse_proxy api:8000
    }

    handle {
        reverse_proxy web:3000
    }
}
```

Then:
- `api.env`: `SPOTIFY_REDIRECT_URI=https://content.example.com/__api/spotify/callback`
- `web.env`: `PUBLIC_API_BASE_URL=https://content.example.com/__api`
- Spotify dashboard: update the redirect URI to the same.

This is fine for a personal setup, slightly less idiomatic.

## Pattern C: behind your own nginx

Use `deploy/nginx.example.conf` as a starting point. Get certs via `certbot --nginx` or your tool of choice. The internals (`reverse_proxy api:8000` / `web:3000` in Caddy) become `proxy_pass http://127.0.0.1:8000` / `:3000` if you're not using Docker for the proxy itself.

## Troubleshooting

| Symptom | Likely cause |
| --- | --- |
| Caddy keeps retrying ACME challenge | DNS not propagated yet, or port 80 blocked |
| `invalid_redirect_uri` from Spotify | `SPOTIFY_REDIRECT_URI` in `api.env` ≠ what's in the Spotify app settings (must be byte-exact) |
| `Refusing to start in APP_ENV=prod` | You forgot to set `STATE_SECRET` to a real value |
| Voice memo recording fails on iPhone | Add to Home Screen first (Safari) then open from there — iOS only grants mic in PWA context |
| Whisper transcription stuck on "pending" | First run downloads ~150 MB; check `docker compose logs api` |
| Cookie not being set | Are you on HTTPS? In production the cookie is `Secure`; an HTTP page won't receive it |
| `429 too many attempts` | You triggered the login rate limiter; wait the `Retry-After` time |

## Resource sizing

| Component | Idle RAM | Active RAM | Disk |
|---|---|---|---|
| api (FastAPI) | ~80 MB | ~600 MB during transcription | 100 MB image |
| api data volume | — | — | a few MB to start, +size of voice memos + 150 MB whisper model |
| web (Next.js) | ~120 MB | ~150 MB | 200 MB image |
| caddy | ~20 MB | ~30 MB | 50 MB image |

A 1 GB VPS works. A 2 GB VPS is comfortable. Disk-wise, the bottleneck is voice memos — figure ~1 MB per minute of audio.
