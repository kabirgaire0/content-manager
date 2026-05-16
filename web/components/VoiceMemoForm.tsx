"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Item } from "@/lib/api";

const COLORS = ["", "yellow", "green", "blue", "pink", "purple", "orange"];

type RecorderState =
  | { phase: "idle" }
  | { phase: "recording"; startedAt: number }
  | { phase: "recorded"; blob: Blob; mime: string; durationMs: number }
  | { phase: "denied" };

function formatTime(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function pickMimeType(): string | undefined {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/mp4",
  ];
  if (typeof MediaRecorder === "undefined") return undefined;
  for (const t of candidates) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return undefined;
}

type Props = {
  initial?: Item;
};

export function VoiceMemoForm({ initial }: Props) {
  const router = useRouter();
  const [recState, setRecState] = useState<RecorderState>({ phase: "idle" });
  const [elapsed, setElapsed] = useState(0);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [tags, setTags] = useState(initial?.tags.join(", ") ?? "");
  const [color, setColor] = useState(initial?.color ?? "");
  const [pinned, setPinned] = useState(initial?.pinned ?? false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const previewUrlRef = useRef<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Latest transcript state for the existing item (live-polled when pending).
  const [transcriptStatus, setTranscriptStatus] = useState(
    initial?.transcript_status ?? null,
  );
  const [transcriptText, setTranscriptText] = useState(
    initial?.transcript ?? null,
  );
  const [retrying, setRetrying] = useState(false);

  const refreshTranscript = useCallback(async () => {
    if (!initial) return null;
    try {
      const res = await fetch(`/api/items/${initial.id}`, {
        cache: "no-store",
      });
      if (!res.ok) return null;
      return (await res.json()) as Item;
    } catch {
      return null;
    }
  }, [initial]);

  // Poll while transcription is pending.
  useEffect(() => {
    if (!initial || transcriptStatus !== "pending") return;
    let cancelled = false;
    const tick = async () => {
      const fresh = await refreshTranscript();
      if (cancelled || !fresh) return;
      setTranscriptStatus(fresh.transcript_status ?? null);
      setTranscriptText(fresh.transcript ?? null);
    };
    const timer = setInterval(tick, 4000);
    tick();
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [initial, transcriptStatus, refreshTranscript]);

  async function retryTranscribe() {
    if (!initial) return;
    setRetrying(true);
    const res = await fetch(`/api/items/${initial.id}/transcribe`, {
      method: "POST",
    });
    if (res.ok) {
      const fresh = (await res.json()) as Item;
      setTranscriptStatus(fresh.transcript_status ?? null);
      setTranscriptText(fresh.transcript ?? null);
    }
    setRetrying(false);
  }

  useEffect(() => {
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  async function startRecording() {
    setError(null);
    chunksRef.current = [];
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setRecState({ phase: "denied" });
      return;
    }
    const mimeType = pickMimeType();
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    recorder.ondataavailable = (ev) => {
      if (ev.data.size > 0) chunksRef.current.push(ev.data);
    };
    recorder.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      const usedMime = recorder.mimeType || mimeType || "audio/webm";
      const blob = new Blob(chunksRef.current, { type: usedMime });
      const startedAt = recorderRef.current
        ? (recorderRef.current as MediaRecorder & { _startedAt?: number })
            ._startedAt ?? Date.now()
        : Date.now();
      const durationMs = Date.now() - startedAt;
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
      const url = URL.createObjectURL(blob);
      previewUrlRef.current = url;
      setPreviewUrl(url);
      setRecState({ phase: "recorded", blob, mime: usedMime, durationMs });
      if (tickRef.current) {
        clearInterval(tickRef.current);
        tickRef.current = null;
      }
    };
    const startedAt = Date.now();
    (recorder as MediaRecorder & { _startedAt: number })._startedAt = startedAt;
    recorderRef.current = recorder;
    recorder.start();
    setRecState({ phase: "recording", startedAt });
    setElapsed(0);
    tickRef.current = setInterval(() => {
      setElapsed(Date.now() - startedAt);
    }, 200);
  }

  function stopRecording() {
    recorderRef.current?.stop();
  }

  function discard() {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setPreviewUrl(null);
    setRecState({ phase: "idle" });
    setElapsed(0);
  }

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    setError(null);

    const tagList = tags
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    if (!initial) {
      // Create flow: audio is required.
      if (recState.phase !== "recorded") {
        setError("Record something before saving.");
        return;
      }
      const fd = new FormData();
      fd.append("title", title.trim());
      fd.append("body", "");
      fd.append("tags", JSON.stringify(tagList));
      if (color) fd.append("color", color);
      fd.append("pinned", pinned ? "true" : "false");
      fd.append("duration_ms", String(recState.durationMs));
      fd.append(
        "audio",
        new File([recState.blob], "voice.webm", { type: recState.mime }),
      );

      setSubmitting(true);
      const res = await fetch("/api/items/voice", { method: "POST", body: fd });
      setSubmitting(false);
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.detail ? String(d.detail) : `upload failed (${res.status})`);
        return;
      }
      router.push("/");
      router.refresh();
      return;
    }

    // Edit flow: optionally replace audio, then update metadata via JSON.
    setSubmitting(true);
    try {
      if (recState.phase === "recorded") {
        const fd = new FormData();
        fd.append("duration_ms", String(recState.durationMs));
        fd.append(
          "audio",
          new File([recState.blob], "voice.webm", { type: recState.mime }),
        );
        const audioRes = await fetch(`/api/items/${initial.id}/audio`, {
          method: "POST",
          body: fd,
        });
        if (!audioRes.ok) {
          const d = await audioRes.json().catch(() => ({}));
          throw new Error(d.detail ?? `audio upload failed (${audioRes.status})`);
        }
      }

      const metaRes = await fetch(`/api/items/${initial.id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          kind: "voice_memo",
          title: title.trim(),
          body: "",
          tags: tagList,
          color: color || null,
          pinned,
          archived: initial.archived,
        }),
      });
      if (!metaRes.ok) {
        const d = await metaRes.json().catch(() => ({}));
        throw new Error(d.detail ?? `update failed (${metaRes.status})`);
      }
      router.push("/");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "save failed");
    } finally {
      setSubmitting(false);
    }
  }

  const isRecording = recState.phase === "recording";
  const hasNewRecording = recState.phase === "recorded";

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-medium">
            {initial
              ? hasNewRecording
                ? "New recording (will replace existing)"
                : "Re-record (optional)"
              : "Record audio"}
          </p>
          <p className="font-mono text-sm text-neutral-500">
            {isRecording
              ? formatTime(elapsed)
              : hasNewRecording
                ? formatTime(recState.durationMs)
                : "0:00"}
          </p>
        </div>

        {recState.phase === "denied" && (
          <p className="mb-3 text-sm text-red-500">
            Microphone access was denied. Allow it in your browser settings and
            try again.
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2">
          {!isRecording && !hasNewRecording && (
            <button
              type="button"
              onClick={startRecording}
              className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500"
            >
              ● Record
            </button>
          )}
          {isRecording && (
            <button
              type="button"
              onClick={stopRecording}
              className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
            >
              ■ Stop
            </button>
          )}
          {hasNewRecording && (
            <button
              type="button"
              onClick={discard}
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-900"
            >
              Discard & re-record
            </button>
          )}
        </div>

        {previewUrl && (
          <div className="mt-3">
            <audio src={previewUrl} controls className="w-full" />
          </div>
        )}

        {initial?.audio_path && recState.phase !== "recorded" && (
          <div className="mt-3 space-y-1">
            <p className="text-xs text-neutral-500">Current recording</p>
            <audio
              src={`/api/items/${initial.id}/audio`}
              controls
              className="w-full"
            />
          </div>
        )}
      </div>

      {initial && (
        <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium">Transcript</p>
            {transcriptStatus !== "pending" && initial.audio_path && (
              <button
                type="button"
                onClick={retryTranscribe}
                disabled={retrying}
                className="text-xs text-neutral-500 hover:underline disabled:opacity-50"
              >
                {transcriptStatus === "done"
                  ? "Re-transcribe"
                  : transcriptStatus === "failed"
                    ? "Retry"
                    : "Transcribe"}
              </button>
            )}
          </div>
          {transcriptStatus === "pending" && (
            <p className="text-sm italic text-neutral-500">Transcribing…</p>
          )}
          {transcriptStatus === "failed" && (
            <p className="text-sm text-red-500">{transcriptText}</p>
          )}
          {transcriptStatus === "done" && (
            <p className="whitespace-pre-wrap text-sm text-neutral-700 dark:text-neutral-300">
              {transcriptText}
            </p>
          )}
          {transcriptStatus === null && (
            <p className="text-sm text-neutral-500">
              No transcript yet — click Transcribe to run Whisper on this audio.
            </p>
          )}
        </div>
      )}

      <div className="space-y-1.5">
        <label htmlFor="title" className="block text-sm font-medium">
          Title (optional)
        </label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-neutral-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label htmlFor="tags" className="block text-sm font-medium">
            Tags (comma-separated)
          </label>
          <input
            id="tags"
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-neutral-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="color" className="block text-sm font-medium">
            Color
          </label>
          <select
            id="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-neutral-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900"
          >
            {COLORS.map((c) => (
              <option key={c} value={c}>
                {c || "default"}
              </option>
            ))}
          </select>
        </div>
      </div>

      <label className="inline-flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={pinned}
          onChange={(e) => setPinned(e.target.checked)}
          className="rounded border-neutral-300"
        />
        Pinned
      </label>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
        >
          {submitting ? "Saving…" : initial ? "Save changes" : "Create"}
        </button>
        <Link
          href="/"
          className="text-sm text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
