"use client";

import { Card } from "@stellar-orbit/ui";
import { useRouter, useSearchParams } from "next/navigation";
import jsQR from "jsqr";
import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, apiFetchWithAuth } from "@/lib/api";
import { useI18n } from "@/i18n/I18nProvider";
import type { Messages } from "@/i18n/messages/en";

type CheckInResponse = {
  status: string;
  pointsEarned: number;
  promoted: boolean;
};

function extractEventIdFromCheckInToken(token: string): string | null {
  const dot = token.indexOf(".");
  if (dot === -1) return null;
  const payloadB64 = token.slice(0, dot);
  try {
    const base64 = payloadB64.replace(/-/g, "+").replace(/_/g, "/");
    const pad = base64.length % 4 === 0 ? "" : "=".repeat(4 - (base64.length % 4));
    const json = JSON.parse(atob(base64 + pad)) as { eventId?: unknown };
    return typeof json.eventId === "string" ? json.eventId : null;
  } catch {
    return null;
  }
}

function describeCheckInError(error: unknown, t: Messages): string {
  if (error instanceof ApiError) {
    try {
      const body = JSON.parse(error.message) as { error?: string };
      switch (body.error) {
        case "already_checked_in":
          return t.checkin.errors.alreadyCheckedIn;
        case "token_expired":
          return t.checkin.errors.tokenExpired;
        case "invalid_token":
          return t.checkin.errors.invalidToken;
        case "token_event_mismatch":
          return t.checkin.errors.tokenMismatch;
        case "forbidden":
          return t.checkin.errors.forbidden;
        case "not_found":
          return t.checkin.errors.notFound;
        case "rate_limited":
          return t.checkin.errors.rateLimited;
      }
    } catch { /* plain text */ }
    if (error.message) return error.message;
  }
  if (error instanceof Error) return error.message;
  return t.checkin.errors.failed;
}

export default function AmbassadorCheckInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useI18n();
  const tokenFromUrl = searchParams.get("token");

  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pointsEarned, setPointsEarned] = useState<number | null>(null);
  const [promoted, setPromoted] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanningRef = useRef(false);
  const autoSubmittedRef = useRef<string | null>(null);

  const submitCheckIn = useCallback(
    async (rawToken: string) => {
      const trimmed = rawToken.trim();
      if (!trimmed) { setError(t.checkin.errors.enterCode); return; }
      const eventId = extractEventIdFromCheckInToken(trimmed);
      if (!eventId) { setError(t.checkin.errors.unreadableCode); return; }

      setBusy(true);
      setError(null);
      setMessage(null);
      setPointsEarned(null);
      setPromoted(false);

      try {
        const sessionToken = window.localStorage.getItem("stellar-orbit.sessionToken");
        if (!sessionToken) throw new Error(t.checkin.errors.notSignedIn);
        const res = await apiFetchWithAuth<CheckInResponse>(
          sessionToken,
          `/events/${eventId}/checkin`,
          { method: "POST", body: JSON.stringify({ token: trimmed }) },
        );
        stopCamera();
        setMessage(t.checkin.success);
        setPointsEarned(res.pointsEarned);
        setPromoted(res.promoted);
        window.setTimeout(() => { router.replace("/dashboard"); }, 3000);
      } catch (err) {
        setError(describeCheckInError(err, t));
        scanningRef.current = true;
        requestAnimationFrame(scanFrame);
      } finally {
        setBusy(false);
      }
    },
    [router, t],
  );

  function stopCamera() {
    scanningRef.current = false;
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) track.stop();
      streamRef.current = null;
    }
  }

  async function startCamera() {
    setCameraError(null);
    let stream: MediaStream;
    try {
      if (typeof navigator.mediaDevices.getUserMedia !== "function") {
        throw new Error("Camera API unavailable");
      }
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
    } catch {
      setCameraError(t.checkin.errors.cameraDenied);
      return;
    }
    streamRef.current = stream;
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      try {
        await videoRef.current.play();
      } catch {
        // play() may reject without user gesture; autoPlay attribute handles it
      }
    }
    scanningRef.current = true;
    requestAnimationFrame(scanFrame);
  }

  function scanFrame() {
    if (!scanningRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      requestAnimationFrame(scanFrame);
      return;
    }
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) { requestAnimationFrame(scanFrame); return; }
    ctx.drawImage(video, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height);
    if (code?.data) {
      let token = code.data;
      try {
        const url = new URL(token);
        token = url.searchParams.get("token") ?? token;
      } catch { /* not a URL, use raw */ }
      if (token) {
        scanningRef.current = false;
        void submitCheckIn(token);
        return;
      }
    }
    requestAnimationFrame(scanFrame);
  }

  useEffect(() => {
    if (tokenFromUrl && autoSubmittedRef.current !== tokenFromUrl) {
      autoSubmittedRef.current = tokenFromUrl;
      void submitCheckIn(tokenFromUrl);
    }
  }, [tokenFromUrl, submitCheckIn]);

  useEffect(() => {
    if (!message) {
      void startCamera();
    } else {
      stopCamera();
    }
    return stopCamera;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message]);

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <section className="overflow-hidden rounded-[2rem] border border-white/80 bg-white shadow-orbit-sm">
        <div className="relative p-6">
          <div
            className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(8,145,178,0.16),transparent_34%),radial-gradient(circle_at_90%_0%,rgba(245,158,11,0.16),transparent_32%)]"
            aria-hidden
          />
          <div className="relative">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-orbit-stellar">
              {t.checkin.eyebrow}
            </p>
            <h1 className="mt-3 text-3xl font-black tracking-tight">{t.checkin.title}</h1>
            <p className="mt-2 text-sm leading-6 text-orbit-text-2">{t.checkin.subtitle}</p>
          </div>
        </div>
      </section>

      {message ? (
        <Card className="overflow-hidden border-emerald-200 bg-white shadow-[0_20px_80px_rgba(5,150,105,0.14)]">
          <div className="bg-emerald-50 p-6 text-center" role="status">
            <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-600 text-3xl font-black text-white shadow-[0_12px_40px_rgba(5,150,105,0.28)]">
              ✓
            </div>
            <h2 className="mt-5 text-2xl font-black tracking-tight text-emerald-950">
              {t.checkin.successTitle}
            </h2>
            <p className="mt-2 text-sm leading-6 text-emerald-800">
              {message} {t.checkin.successBody}
            </p>
          </div>
          <div className="grid grid-cols-2 divide-x divide-orbit-border bg-white">
            <div className="p-5 text-center">
              <p className="text-3xl font-black tabular-nums text-orbit-text">
                +{pointsEarned ?? "-"}
              </p>
              <p className="mt-1 text-xs font-bold uppercase tracking-[0.16em] text-orbit-text-3">
                {t.checkin.pointsEarned}
              </p>
            </div>
            <div className="p-5 text-center">
              <p className="text-3xl font-black text-orbit-text">
                {promoted ? t.checkin.yes : t.checkin.done}
              </p>
              <p className="mt-1 text-xs font-bold uppercase tracking-[0.16em] text-orbit-text-3">
                {promoted ? t.checkin.levelUp : t.checkin.recorded}
              </p>
            </div>
          </div>
          <p className="border-t border-orbit-border bg-orbit-raised/60 px-6 py-4 text-center text-sm font-medium text-orbit-text-2">
            {t.checkin.redirecting}
          </p>
        </Card>
      ) : (
        <>
          {error ? (
            <Card className="border-red-200 bg-red-50 p-4" role="alert">
              <p className="text-sm font-semibold text-red-800">{t.checkin.needsAttention}</p>
              <p className="mt-1 text-sm leading-6 text-red-700">{error}</p>
            </Card>
          ) : null}

          <Card className="overflow-hidden border-white bg-white shadow-orbit-sm">
            {cameraError ? (
              <div className="p-5">
                <p className="text-sm font-semibold text-red-700">{t.checkin.cameraUnavailable}</p>
                <p className="mt-1 text-sm leading-6 text-red-600">{cameraError}</p>
              </div>
            ) : (
              <>
                <p className="border-b border-orbit-border bg-orbit-raised/60 px-5 py-3 text-xs font-bold uppercase tracking-[0.16em] text-orbit-text-3">
                  {busy ? t.checkin.processing : t.checkin.pointCamera}
                </p>
                <div className="relative aspect-square overflow-hidden bg-black">
                  <video
                    ref={videoRef}
                    className="h-full w-full object-cover"
                    autoPlay
                    playsInline
                    muted
                  />
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div className="h-52 w-52 rounded-[2rem] border-2 border-white/90 shadow-[0_0_0_999px_rgba(0,0,0,0.22)]" />
                  </div>
                  {busy && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                      <p className="rounded-full bg-white px-4 py-2 text-sm font-bold text-orbit-text shadow-orbit-sm">
                        {t.checkin.checkingIn}
                      </p>
                    </div>
                  )}
                </div>
                <canvas ref={canvasRef} className="hidden" />
              </>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
