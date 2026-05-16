"""Audio file storage for voice memos.

Files are stored on disk at `data/audio/{item_id}.{ext}`; the DB only
keeps the relative path (so the DB stays portable and the audio is just
plain files you can back up or migrate independently).
"""

from __future__ import annotations

from pathlib import Path

from fastapi import HTTPException

# Common browser MediaRecorder MIME types -> file extension.
MIME_EXT = {
    "audio/webm": "webm",
    "audio/webm;codecs=opus": "webm",
    "audio/ogg": "ogg",
    "audio/ogg;codecs=opus": "ogg",
    "audio/mp4": "m4a",
    "audio/mpeg": "mp3",
    "audio/wav": "wav",
    "audio/x-wav": "wav",
}

ALLOWED_PREFIX = "audio/"
MAX_BYTES = 50 * 1024 * 1024  # 50 MB cap


def audio_dir() -> Path:
    p = Path("data") / "audio"
    p.mkdir(parents=True, exist_ok=True)
    return p


def normalize_mime(raw: str | None) -> str:
    if not raw or not raw.startswith(ALLOWED_PREFIX):
        raise HTTPException(status_code=415, detail="unsupported audio type")
    return raw.split(";")[0].strip()


def ext_for(mime: str) -> str:
    return MIME_EXT.get(mime, "bin")


def write_audio(item_id: int, raw_mime: str, data: bytes) -> tuple[str, str]:
    if len(data) > MAX_BYTES:
        raise HTTPException(status_code=413, detail="audio too large")
    if not data:
        raise HTTPException(status_code=400, detail="empty audio file")

    mime = normalize_mime(raw_mime)
    # Match raw value first (might include codec info), then the base MIME.
    ext = MIME_EXT.get(raw_mime) or MIME_EXT.get(mime) or "bin"

    # Remove any prior file with a different extension for this item.
    for existing in audio_dir().glob(f"{item_id}.*"):
        existing.unlink()

    rel_path = f"audio/{item_id}.{ext}"
    abs_path = Path("data") / rel_path
    abs_path.write_bytes(data)
    return rel_path, mime


def delete_audio(rel_path: str | None) -> None:
    if not rel_path:
        return
    abs_path = Path("data") / rel_path
    if abs_path.exists():
        abs_path.unlink()


def absolute_path(rel_path: str) -> Path:
    p = (Path("data") / rel_path).resolve()
    # Guard against path traversal — must stay under data/audio
    base = audio_dir().resolve()
    if base not in p.parents:
        raise HTTPException(status_code=400, detail="invalid audio path")
    return p
