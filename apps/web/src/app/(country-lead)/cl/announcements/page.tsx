"use client";

import { Button, Card } from "@stellar-orbit/ui";
import { type FormEvent, useState } from "react";
import { ApiError, apiFetchWithAuth } from "@/lib/api";

export default function CountryLeadAnnouncementsPage() {
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<"all" | "verified">("all");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setConfirmation(null);

    try {
      const trimmed = body.trim();
      if (!trimmed) {
        throw new Error("Announcement text cannot be empty.");
      }
      const token = window.localStorage.getItem("stellar-orbit.sessionToken");
      if (!token) {
        throw new Error("Not signed in");
      }
      const res = await apiFetchWithAuth<{ sent: number }>(
        token,
        "/notifications/announcement",
        {
          method: "POST",
          body: JSON.stringify({
            message: trimmed,
            audience,
          }),
        },
      );
      setConfirmation(`Sent to ${String(res.sent)} members.`);
      setBody("");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Could not send announcement.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold">Announcements</h1>
        <p className="mt-1 text-sm text-white/50">
          Blast a chapter update to ambassadors’ in-app inbox (and emails when configured).
        </p>
      </div>

      <Card className="flex flex-col gap-5 p-6">
        <form className="flex flex-col gap-4" onSubmit={onSubmit}>
          <label className="flex flex-col gap-1 text-sm font-medium text-white/70">
            Message
            <textarea
              className="min-h-[10rem] rounded-lg border border-orbit-border bg-orbit-raised px-3 py-2 text-sm text-white focus:outline-none focus:border-orbit-violet/50 font-normal"
              placeholder="Your announcement…"
              value={body}
              onChange={(e) => {
                setBody(e.target.value);
              }}
              disabled={busy}
            />
          </label>

          <fieldset className="flex flex-col gap-2 rounded-md border border-orbit-border p-4">
            <legend className="px-2 text-xs font-semibold uppercase tracking-wide text-white/40">
              Audience
            </legend>
            <label className="flex items-center gap-2 text-sm text-white/70">
              <input
                type="radio"
                name="aud"
                checked={audience === "all"}
                onChange={() => {
                  setAudience("all");
                }}
              />
              All members
            </label>
            <label className="flex items-center gap-2 text-sm text-white/70">
              <input
                type="radio"
                name="aud"
                checked={audience === "verified"}
                onChange={() => {
                  setAudience("verified");
                }}
              />
              Verified only
            </label>
          </fieldset>

          {error ? (
            <p className="text-sm text-red-400" role="alert">
              {error}
            </p>
          ) : null}
          {confirmation ? (
            <p className="text-sm font-semibold text-emerald-800" role="status">
              {confirmation}
            </p>
          ) : null}

          <Button type="submit" disabled={busy}>
            {busy ? "Sending…" : "Send announcement"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
