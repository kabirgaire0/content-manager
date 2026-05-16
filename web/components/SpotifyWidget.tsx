"use client";

import { useEffect, useRef, useState } from "react";

type Track = {
  id: string | null;
  name: string | null;
  duration_ms: number | null;
  artists: string[];
  album: string | null;
  image: string | null;
  url: string | null;
} | null;

type PlayerState = {
  playing: boolean;
  progress_ms?: number | null;
  device?: string | null;
  track: Track;
};

type StatusResponse = {
  configured: boolean;
  connected: boolean;
};

type Phase = "loading" | "unconfigured" | "disconnected" | "connected" | "error";

function formatTime(ms: number | null | undefined): string {
  if (!ms || ms < 0) return "0:00";
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function SpotifyWidget() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [state, setState] = useState<PlayerState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function checkStatus() {
    try {
      const res = await fetch("/api/spotify/status", { cache: "no-store" });
      if (!res.ok) {
        setPhase("error");
        return false;
      }
      const data = (await res.json()) as StatusResponse;
      if (!data.configured) {
        setPhase("unconfigured");
        return false;
      }
      if (!data.connected) {
        setPhase("disconnected");
        return false;
      }
      setPhase("connected");
      return true;
    } catch {
      setPhase("error");
      return false;
    }
  }

  async function fetchState() {
    try {
      const res = await fetch("/api/spotify/state", { cache: "no-store" });
      if (res.status === 409) {
        setPhase("disconnected");
        setState(null);
        return;
      }
      if (!res.ok) {
        setError(`state: ${res.status}`);
        return;
      }
      const data = (await res.json()) as PlayerState;
      setState(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "fetch failed");
    }
  }

  function schedulePoll() {
    if (pollTimer.current) clearTimeout(pollTimer.current);
    pollTimer.current = setTimeout(async () => {
      await fetchState();
      schedulePoll();
    }, 5000);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const ok = await checkStatus();
      if (cancelled || !ok) return;
      await fetchState();
      schedulePoll();
    })();
    return () => {
      cancelled = true;
      if (pollTimer.current) clearTimeout(pollTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function control(action: "play" | "pause" | "next" | "previous") {
    setBusy(action);
    setError(null);
    try {
      const res = await fetch(`/api/spotify/control/${action}`, {
        method: "POST",
      });
      if (!res.ok) {
        const detail = await res.json().catch(() => ({}));
        setError(detail.detail ?? `control ${action} -> ${res.status}`);
      } else {
        setTimeout(fetchState, 400);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "control failed");
    } finally {
      setBusy(null);
    }
  }

  async function disconnect() {
    setBusy("disconnect");
    await fetch("/api/spotify/disconnect", { method: "POST" });
    setBusy(null);
    setState(null);
    await checkStatus();
  }

  if (phase === "loading") {
    return (
      <Shell>
        <p className="text-sm text-neutral-500">Loading Spotify…</p>
      </Shell>
    );
  }

  if (phase === "unconfigured") {
    return (
      <Shell>
        <p className="text-sm text-neutral-500">
          Spotify isn't configured yet. Set <code>SPOTIFY_CLIENT_ID</code> and
          <code> SPOTIFY_CLIENT_SECRET</code> in <code>api/.env</code> and
          restart the API.
        </p>
      </Shell>
    );
  }

  if (phase === "error") {
    return (
      <Shell>
        <p className="text-sm text-red-500">
          Couldn't reach the API. Is it running on port 8000?
        </p>
      </Shell>
    );
  }

  if (phase === "disconnected") {
    return (
      <Shell>
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Connect your Spotify account to control playback from here.
          </p>
          <a
            href="/api/spotify/connect"
            className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-500"
          >
            Connect Spotify
          </a>
        </div>
      </Shell>
    );
  }

  const track = state?.track ?? null;
  const playing = Boolean(state?.playing);

  return (
    <Shell>
      <div className="flex items-center gap-4">
        <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded bg-neutral-200 dark:bg-neutral-800">
          {track?.image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={track.image}
              alt={track.album ?? ""}
              className="h-full w-full object-cover"
            />
          )}
        </div>

        <div className="min-w-0 flex-1">
          {track ? (
            <>
              <a
                href={track.url ?? "#"}
                target="_blank"
                rel="noreferrer"
                className="block truncate text-sm font-medium hover:underline"
              >
                {track.name}
              </a>
              <p className="truncate text-xs text-neutral-500">
                {track.artists.join(", ")} · {track.album}
              </p>
              <p className="mt-0.5 text-xs text-neutral-500">
                {formatTime(state?.progress_ms)} /{" "}
                {formatTime(track.duration_ms)}
                {state?.device ? ` · ${state.device}` : ""}
              </p>
            </>
          ) : (
            <p className="text-sm text-neutral-500">
              Nothing playing. Start something in Spotify and the controls
              here will take over.
            </p>
          )}
        </div>

        <div className="flex items-center gap-1">
          <ControlButton
            label="⏮"
            disabled={busy !== null}
            onClick={() => control("previous")}
          />
          <ControlButton
            label={playing ? "⏸" : "▶"}
            primary
            disabled={busy !== null}
            onClick={() => control(playing ? "pause" : "play")}
          />
          <ControlButton
            label="⏭"
            disabled={busy !== null}
            onClick={() => control("next")}
          />
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between text-xs text-neutral-500">
        <span>{error ? <span className="text-red-500">{error}</span> : ""}</span>
        <button
          type="button"
          onClick={disconnect}
          disabled={busy !== null}
          className="hover:underline disabled:opacity-50"
        >
          Disconnect
        </button>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
        <span aria-hidden>♪</span> Spotify
      </div>
      {children}
    </section>
  );
}

function ControlButton({
  label,
  onClick,
  disabled,
  primary,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={
        primary
          ? "h-9 w-9 rounded-full bg-neutral-900 text-base text-white hover:bg-neutral-700 disabled:opacity-50 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
          : "h-9 w-9 rounded-full text-base text-neutral-600 hover:bg-neutral-100 disabled:opacity-50 dark:text-neutral-300 dark:hover:bg-neutral-800"
      }
    >
      {label}
    </button>
  );
}
