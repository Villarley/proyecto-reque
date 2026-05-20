"use client";

import { Button, Card } from "@stellar-orbit/ui";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, apiFetchWithAuth } from "@/lib/api";

type CheckInResponse = {
  status: string;
  pointsEarned: number;
  promoted: boolean;
};

function extractEventIdFromCheckInToken(token: string): string | null {
  const dot = token.indexOf(".");
  if (dot === -1) {
    return null;
  }
  const payloadB64 = token.slice(0, dot);
  try {
    const base64 = payloadB64.replace(/-/g, "+").replace(/_/g, "/");
    const pad =
      base64.length % 4 === 0 ? "" : "=".repeat(4 - (base64.length % 4));
    const json = JSON.parse(atob(base64 + pad)) as { eventId?: unknown };
    return typeof json.eventId === "string" ? json.eventId : null;
  } catch {
    return null;
  }
}

function describeCheckInError(error: unknown): string {
  if (error instanceof ApiError) {
    try {
      const body = JSON.parse(error.message) as { error?: string };
      const code = body.error;
      switch (code) {
        case "already_checked_in":
          return "You have already checked in to this event.";
        case "token_expired":
          return "This QR code has expired. Ask your chapter lead for a new code.";
        case "invalid_token":
          return "Invalid check-in code. Double-check the token and try again.";
        case "token_event_mismatch":
          return "This code does not match this event.";
        case "forbidden":
          return "You are not allowed to check in to this event.";
        case "not_found":
          return "Event not found.";
        default:
          break;
      }
    } catch {
      /* plain text */
    }
    if (error.message) {
      return error.message;
    }
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Check-in failed.";
}

export default function AmbassadorCheckInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get("token");

  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pointsEarned, setPointsEarned] = useState<number | null>(null);
  const autoSubmittedRef = useRef<string | null>(null);

  useEffect(() => {
    if (tokenFromUrl) {
      setInput(tokenFromUrl);
    }
  }, [tokenFromUrl]);

  const submitCheckIn = useCallback(
    async (rawToken: string) => {
      const trimmed = rawToken.trim();
      if (!trimmed) {
        setError("Enter a check-in code.");
        return;
      }
      const eventId = extractEventIdFromCheckInToken(trimmed);
      if (!eventId) {
        setError(
          "Could not read this check-in code. Paste the full token from the QR link.",
        );
        return;
      }

      setBusy(true);
      setError(null);
      setMessage(null);
      setPointsEarned(null);

      try {
        const sessionToken = window.localStorage.getItem("stellar-orbit.sessionToken");
        if (!sessionToken) {
          throw new Error("Not signed in");
        }
        const res = await apiFetchWithAuth<CheckInResponse>(
          sessionToken,
          `/events/${eventId}/checkin`,
          {
            method: "POST",
            body: JSON.stringify({ token: trimmed }),
          },
        );
        setMessage("Check-in successful!");
        setPointsEarned(res.pointsEarned);
        window.setTimeout(() => {
          router.replace("/dashboard");
        }, 3000);
      } catch (err) {
        setError(describeCheckInError(err));
      } finally {
        setBusy(false);
      }
    },
    [router],
  );

  useEffect(() => {
    if (!tokenFromUrl || !tokenFromUrl.trim()) {
      return;
    }
    if (autoSubmittedRef.current === tokenFromUrl) {
      return;
    }
    autoSubmittedRef.current = tokenFromUrl;
    void submitCheckIn(tokenFromUrl);
  }, [tokenFromUrl, submitCheckIn]);

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Event check-in</h1>
        <p className="mt-1 text-sm text-white/50">
          Scan the QR code or paste the token from your chapter lead.
        </p>
      </div>

      <Card className="flex flex-col gap-4">
        {message ? (
          <p className="text-sm font-medium text-emerald-400" role="status">
            {message} You earned{" "}
            <span className="font-bold tabular-nums">
              {pointsEarned !== null ? pointsEarned : "—"}
            </span>{" "}
            points. Redirecting to your dashboard…
          </p>
        ) : null}
        {error ? (
          <p className="text-sm text-red-400" role="alert">
            {error}
          </p>
        ) : null}

        <label className="flex flex-col gap-1 text-sm font-medium text-white/70">
          Check-in token
          <textarea
            className="min-h-[5rem] rounded-lg border border-orbit-border bg-orbit-raised px-3 py-2 font-mono text-sm font-normal text-white focus:outline-none focus:border-orbit-violet/50"
            placeholder="Paste token…"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
            }}
            disabled={busy || !!message}
          />
        </label>

        <Button
          type="button"
          disabled={busy || !!message}
          onClick={() => {
            void submitCheckIn(input);
          }}
        >
          {busy ? "Checking in…" : "Submit check-in"}
        </Button>
      </Card>
    </div>
  );
}
