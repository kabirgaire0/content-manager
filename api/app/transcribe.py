"""Local Whisper transcription via faster-whisper.

The model is lazy-loaded once and cached. transcribe_item() is meant to be
run as a FastAPI BackgroundTask: it opens its own DB session, reads the
voice memo, runs Whisper, and writes the transcript back. A module-level
threading.Lock serializes runs so two concurrent uploads don't fight
over the CPU.
"""

from __future__ import annotations

import logging
import threading

from .config import settings
from .db import SessionLocal
from .models import Item

logger = logging.getLogger(__name__)

_model = None
_model_lock = threading.Lock()
_run_lock = threading.Lock()


def get_model():
    """Lazy-load the faster-whisper model. First call may download (~150MB for base)."""
    global _model
    if _model is not None:
        return _model
    with _model_lock:
        if _model is None:
            # Imported lazily so the API can boot without the model dependency loaded.
            from faster_whisper import WhisperModel

            logger.info(
                "loading whisper model=%s device=%s compute=%s",
                settings.whisper_model,
                settings.whisper_device,
                settings.whisper_compute_type,
            )
            _model = WhisperModel(
                settings.whisper_model,
                device=settings.whisper_device,
                compute_type=settings.whisper_compute_type,
            )
    return _model


def transcribe_item(item_id: int) -> None:
    """Transcribe the audio attached to a voice_memo and persist the result.

    Reads/writes its own DB session — safe to run from a background task.
    Failures are recorded as transcript_status='failed' with the error
    message stuffed into transcript so it surfaces in the UI.
    """
    db = SessionLocal()
    try:
        item = db.get(Item, item_id)
        if not item or item.kind != "voice_memo" or not item.audio_path:
            return

        # Single-flight: hold the run lock for the whole transcription so a
        # second voice memo uploaded back-to-back queues instead of fighting
        # over CPU.
        with _run_lock:
            try:
                model = get_model()
                from pathlib import Path

                audio_path = Path("data") / item.audio_path
                segments_iter, info = model.transcribe(
                    str(audio_path),
                    beam_size=1,
                    vad_filter=True,
                )
                text = "".join(s.text for s in segments_iter).strip()
            except Exception as e:  # noqa: BLE001 — we want to capture any failure
                logger.exception("transcription failed for item %s", item_id)
                # Re-read inside the same session in case the row changed.
                item = db.get(Item, item_id)
                if item is None:
                    return
                item.transcript = f"[transcription error] {e}"
                item.transcript_status = "failed"
                item.transcript_lang = None
                db.commit()
                return

            item = db.get(Item, item_id)
            if item is None:
                return
            item.transcript = text
            item.transcript_status = "done"
            item.transcript_lang = info.language
            db.commit()
    finally:
        db.close()


def mark_pending(db, item: Item) -> None:
    """Reset transcript state when a new audio is attached. Caller commits."""
    item.transcript = None
    item.transcript_status = "pending"
    item.transcript_lang = None
