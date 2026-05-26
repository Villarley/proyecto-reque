"use client";

import { Button, Card } from "@stellar-orbit/ui";
import { type FormEvent, useState } from "react";
import { ApiError, apiFetchWithAuth } from "@/lib/api";
import { useI18n } from "@/i18n/I18nProvider";
import { formatMessage } from "@/i18n/format";

export default function CountryLeadAnnouncementsPage() {
  const { t } = useI18n();
  const [subject, setSubject] = useState("");
  const [title, setTitle] = useState("");
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
      if (!trimmed) throw new Error(t.announcements.emptyMessage);
      const token = window.localStorage.getItem("stellar-orbit.sessionToken");
      if (!token) throw new Error(t.validation.notSignedIn);

      const res = await apiFetchWithAuth<{ sent: number }>(
        token,
        "/notifications/announcement",
        {
          method: "POST",
          body: JSON.stringify({
            message: trimmed,
            audience,
            title: title.trim() || t.announcements.defaultTitle,
            subject: subject.trim() || title.trim() || t.announcements.defaultTitle,
          }),
        },
      );
      setConfirmation(formatMessage(t.announcements.sentTo, { count: res.sent }));
      setBody("");
      setTitle("");
      setSubject("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : t.announcements.sendFailed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold">{t.announcements.title}</h1>
        <p className="mt-1 text-sm text-orbit-text-2">{t.announcements.subtitle}</p>
      </div>

      <Card className="flex flex-col gap-5 p-6">
        <form className="flex flex-col gap-4" onSubmit={onSubmit}>
          <label className="flex flex-col gap-1 text-sm font-medium text-orbit-text-2">
            {t.announcements.emailSubject}
            <input
              className="rounded-lg border border-orbit-border bg-orbit-raised px-3 py-2 text-sm text-orbit-text focus:outline-none focus:border-orbit-violet/50 font-normal"
              placeholder={t.announcements.subjectPlaceholder}
              value={subject}
              onChange={(e) => { setSubject(e.target.value); }}
              disabled={busy}
            />
            <span className="text-xs text-orbit-text-3">{t.announcements.subjectHint}</span>
          </label>

          <label className="flex flex-col gap-1 text-sm font-medium text-orbit-text-2">
            {t.announcements.titleLabel}
            <input
              className="rounded-lg border border-orbit-border bg-orbit-raised px-3 py-2 text-sm text-orbit-text focus:outline-none focus:border-orbit-violet/50 font-normal"
              placeholder={t.announcements.titlePlaceholder}
              value={title}
              onChange={(e) => { setTitle(e.target.value); }}
              disabled={busy}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm font-medium text-orbit-text-2">
            {t.announcements.messageLabel}
            <textarea
              className="min-h-[10rem] rounded-lg border border-orbit-border bg-orbit-raised px-3 py-2 text-sm text-orbit-text focus:outline-none focus:border-orbit-violet/50 font-normal"
              placeholder={t.announcements.messagePlaceholder}
              value={body}
              onChange={(e) => { setBody(e.target.value); }}
              disabled={busy}
              required
            />
          </label>

          <fieldset className="flex flex-col gap-2 rounded-md border border-orbit-border p-4">
            <legend className="px-2 text-xs font-semibold uppercase tracking-wide text-orbit-text-3">
              {t.announcements.audience}
            </legend>
            <label className="flex items-center gap-2 text-sm text-orbit-text-2">
              <input type="radio" name="aud" checked={audience === "all"} onChange={() => { setAudience("all"); }} />
              {t.announcements.allMembers}
            </label>
            <label className="flex items-center gap-2 text-sm text-orbit-text-2">
              <input type="radio" name="aud" checked={audience === "verified"} onChange={() => { setAudience("verified"); }} />
              {t.announcements.verifiedOnly}
            </label>
          </fieldset>

          {error ? (
            <p className="text-sm text-red-400" role="alert">{error}</p>
          ) : null}
          {confirmation ? (
            <p className="text-sm font-semibold text-emerald-400" role="status">{confirmation}</p>
          ) : null}

          <Button type="submit" disabled={busy}>
            {busy ? t.announcements.sending : t.announcements.send}
          </Button>
        </form>
      </Card>
    </div>
  );
}
