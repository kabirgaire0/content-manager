# content-manager-api

FastAPI backend for content-manager. SQLite via SQLAlchemy 2.0.

## Setup

Requires [uv](https://docs.astral.sh/uv/) and Python 3.12+.

```bash
cd api
uv sync
uv run uvicorn app.main:app --reload --port 8000
```

API is then on `http://127.0.0.1:8000`. Interactive docs at `http://127.0.0.1:8000/docs`.

## Endpoints

| Method | Path | |
| --- | --- | --- |
| GET | `/health` | health check |
| GET | `/posts` | list posts |
| POST | `/posts` | create post |
| GET | `/posts/{id}` | get a post |
| PUT | `/posts/{id}` | update a post |
| DELETE | `/posts/{id}` | delete a post |

## Layout

```
app/
  main.py        FastAPI app + CORS + lifespan
  config.py      Settings (env-driven)
  db.py          SQLAlchemy engine + session
  models.py      ORM models
  schemas.py     Pydantic request/response models
  routers/
    posts.py     /posts CRUD
```
