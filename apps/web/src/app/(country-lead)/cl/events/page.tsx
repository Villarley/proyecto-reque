"use client";

import type { Event, EventCategory } from "@stellar-orbit/types";
import { Button, Card } from "@stellar-orbit/ui";
import Link from "next/link";
import QRCode from "qrcode";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { ApiError, apiFetchWithAuth } from "@/lib/api";
import { useI18n } from "@/i18n/I18nProvider";
import { categoryLabel } from "@/i18n/categories";

type QRResponse = { token: string; validUntil: string; eventId: string };
type QRState = { url: string; validUntil: string; eventId: string } | null;

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

const EVENT_CATEGORIES: EventCategory[] = [
  "meetup",
  "workshop",
  "conference",
  "hackathon",
  "community_call",
  "other",
];

type EventsResponse = { events: Event[] };

function QRDisplay({ url }: { url: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !url) return;
    void QRCode.toCanvas(canvas, url, {
      width: 240,
      margin: 2,
      color: { dark: "#0f1117", light: "#f0fdf4" },
    });
  }, [url]);

  return (
    <canvas
      ref={canvasRef}
      className="rounded-lg"
      style={{ display: "block" }}
    />
  );
}

export default function CountryLeadEventsPage() {
  const { t } = useI18n();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<EventCategory>("meetup");
  const [eventDay, setEventDay] = useState("");
  const [startsAtLocal, setStartsAtLocal] = useState("");
  const [endsAtLocal, setEndsAtLocal] = useState("");
  const [location, setLocation] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [qrData, setQrData] = useState<QRState>(null);
  const [loadingQrId, setLoadingQrId] = useState<string | null>(null);

  const eventsQuery = useQuery({
    queryKey: ["country-lead", "events"],
    queryFn: async () => {
      const token = window.localStorage.getItem("stellar-orbit.sessionToken");
      if (!token) throw new Error(t.validation.notSignedIn);
      return apiFetchWithAuth<EventsResponse>(token, "/events");
    },
  });

  const createMutation = useMutation({
    mutationFn: async (): Promise<{ url: string; validUntil: string; eventId: string }> => {
      const tokenStore = window.localStorage.getItem("stellar-orbit.sessionToken");
      if (!tokenStore) throw new Error(t.validation.notSignedIn);

      const startDay = startsAtLocal.slice(0, 10);
      const endDay = endsAtLocal.slice(0, 10);
      if (!eventDay.trim()) throw new Error(t.validation.chooseEventDay);
      if (startDay !== eventDay) throw new Error(t.validation.startOnEventDay);
      if (endDay !== eventDay) throw new Error(t.validation.endOnEventDay);
      if (startsAtLocal && endsAtLocal && endsAtLocal <= startsAtLocal)
        throw new Error(t.validation.endAfterStart);

      const startsAt = new Date(startsAtLocal).toISOString();
      const endsAt = new Date(endsAtLocal).toISOString();

      const { event } = await apiFetchWithAuth<{ event: Event }>(tokenStore, "/events", {
        method: "POST",
        body: JSON.stringify({
          title,
          description: description.trim() || undefined,
          category,
          location: location.trim() || undefined,
          startsAt,
          endsAt,
        }),
      });

      const qr = await apiFetchWithAuth<QRResponse>(tokenStore, `/events/${event.id}/qr`);
      const checkInUrl = `${window.location.origin}/checkin?token=${encodeURIComponent(qr.token)}`;
      return { url: checkInUrl, validUntil: qr.validUntil, eventId: event.id };
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["country-lead", "events"] });
    },
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    setQrData(null);
    createMutation.mutate(undefined, {
      onSuccess: (data) => {
        setQrData(data);
      },
      onError: (err) => {
        setSubmitError(
          err instanceof ApiError ? err.message || t.validation.createEventFailed
          : err instanceof Error ? err.message
          : t.validation.createEventFailed,
        );
      },
    });
  }

  async function copyUrl() {
    if (qrData?.url) await navigator.clipboard.writeText(qrData.url);
  }

  async function fetchQrForEvent(eventId: string) {
    if (loadingQrId) return;
    setLoadingQrId(eventId);
    try {
      const tokenStore = window.localStorage.getItem("stellar-orbit.sessionToken");
      if (!tokenStore) throw new Error(t.validation.notSignedIn);
      const qr = await apiFetchWithAuth<QRResponse>(tokenStore, `/events/${eventId}/qr`);
      const checkInUrl = `${window.location.origin}/checkin?token=${encodeURIComponent(qr.token)}`;
      setQrData({ url: checkInUrl, validUntil: qr.validUntil, eventId });
    } catch {
      // silent: QR may be expired
    } finally {
      setLoadingQrId(null);
    }
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-10">
      <div>
        <h1 className="text-2xl font-bold">{t.events.title}</h1>
        <p className="mt-1 text-sm text-orbit-text-2">{t.events.subtitle}</p>
      </div>

      <Card className="flex flex-col gap-4 p-6">
        <h2 className="text-lg font-semibold">{t.events.createEvent}</h2>
        <form className="flex flex-col gap-4" onSubmit={onSubmit}>
          <label className="flex flex-col gap-1 text-sm font-medium text-orbit-text-2">
            {t.events.title_}
            <input
              required
              className="rounded-lg border border-orbit-border bg-orbit-raised px-3 py-2 text-sm text-orbit-text focus:outline-none focus:border-orbit-violet/50"
              value={title}
              onChange={(event) => { setTitle(event.target.value); }}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-orbit-text-2">
            {t.events.description}
            <textarea
              className="min-h-[6rem] rounded-lg border border-orbit-border bg-orbit-raised px-3 py-2 text-sm text-orbit-text focus:outline-none focus:border-orbit-violet/50"
              value={description}
              onChange={(event) => { setDescription(event.target.value); }}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-orbit-text-2">
            {t.events.category}
            <select
              className="rounded-lg border border-orbit-border bg-orbit-raised px-3 py-2 text-sm capitalize text-orbit-text focus:outline-none focus:border-orbit-violet/50"
              value={category}
              onChange={(event) => { setCategory(event.target.value as EventCategory); }}
            >
              {EVENT_CATEGORIES.map((c) => (
                <option key={c} value={c}>{categoryLabel(c, t)}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-orbit-text-2">
            {t.events.eventDay}
            <input
              type="date"
              required
              className="rounded-lg border border-orbit-border bg-orbit-raised px-3 py-2 text-sm text-orbit-text focus:outline-none focus:border-orbit-violet/50"
              value={eventDay}
              onChange={(event) => { setEventDay(event.target.value); }}
            />
            <span className="text-xs font-normal text-orbit-text-3">{t.events.dayConstraint}</span>
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-orbit-text-2">
            {t.events.startsAt}
            <input
              type="datetime-local"
              required
              className="rounded-lg border border-orbit-border bg-orbit-raised px-3 py-2 text-sm text-orbit-text focus:outline-none focus:border-orbit-violet/50"
              value={startsAtLocal}
              onChange={(event) => { setStartsAtLocal(event.target.value); }}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-orbit-text-2">
            {t.events.endsAt}
            <input
              type="datetime-local"
              required
              className="rounded-lg border border-orbit-border bg-orbit-raised px-3 py-2 text-sm text-orbit-text focus:outline-none focus:border-orbit-violet/50"
              value={endsAtLocal}
              onChange={(event) => { setEndsAtLocal(event.target.value); }}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-orbit-text-2">
            {t.events.location}
            <input
              className="rounded-lg border border-orbit-border bg-orbit-raised px-3 py-2 text-sm text-orbit-text focus:outline-none focus:border-orbit-violet/50"
              value={location}
              onChange={(event) => { setLocation(event.target.value); }}
            />
          </label>
          {submitError ? (
            <p className="text-sm text-red-400" role="alert">{submitError}</p>
          ) : null}
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? t.events.publishing : t.events.createEvent}
          </Button>
        </form>

        {qrData ? (
          <div className="mt-2 rounded-md border border-orbit-success/20 bg-orbit-success/10 p-6">
            <p className="font-medium text-orbit-success">{t.events.qrGenerated}</p>
            <p className="mt-1 text-xs text-orbit-success/70">
              Valid until {new Date(qrData.validUntil).toLocaleDateString()}. Ambassadors scan this to check in.
            </p>
            <div className="mt-4 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <QRDisplay url={qrData.url} />
              <div className="flex flex-col gap-2">
                <p className="text-xs text-orbit-success/70 break-all font-mono max-w-[280px]">
                  {qrData.url}
                </p>
                <Button type="button" variant="secondary" onClick={() => { void copyUrl(); }}>
                  {t.events.copyLink}
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </Card>

      <Card className="flex flex-col gap-4 p-6">
        <h2 className="text-lg font-semibold">{t.events.myEvents}</h2>
        {eventsQuery.isLoading ? (
          <p className="text-sm text-orbit-text-2">{t.common.loading}</p>
        ) : eventsQuery.isError ? (
          <p className="text-sm text-red-400">{t.common.error}</p>
        ) : !eventsQuery.data?.events?.length ? (
          <p className="text-sm text-orbit-text-2">{t.events.noEvents}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {eventsQuery.data.events.map((evt) => (
              <li key={evt.id} className="flex flex-col gap-2 rounded-lg border border-orbit-border bg-orbit-raised px-4 py-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{evt.title}</p>
                    <p className="text-xs text-orbit-text-2">{formatDate(evt.startsAt)}</p>
                    <span className="mt-2 inline-flex rounded-full bg-orbit-raised px-2 py-0.5 text-xs font-medium capitalize text-orbit-text-2 ring-1 ring-orbit-border">
                      {categoryLabel(evt.category, t)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      className="text-sm font-semibold text-orbit-violet-light hover:underline disabled:opacity-50"
                      disabled={loadingQrId === evt.id}
                      onClick={() => {
                        if (qrData?.eventId === evt.id) {
                          setQrData(null);
                        } else {
                          void fetchQrForEvent(evt.id);
                        }
                      }}
                    >
                      {loadingQrId === evt.id ? t.events.loadingQr : qrData?.eventId === evt.id ? t.events.hideQr : t.events.showQr}
                    </button>
                    <Link
                      href={`/cl/attendance?eventId=${encodeURIComponent(evt.id)}`}
                      className="text-sm font-semibold text-orbit-violet-light hover:underline"
                    >
                      {t.events.viewAttendance}
                    </Link>
                  </div>
                </div>

                {qrData?.eventId === evt.id && (
                  <div className="rounded-md border border-orbit-success/20 bg-orbit-success/10 p-4">
                    <p className="text-xs text-orbit-success/70 mb-3">
                      Valid until {new Date(qrData.validUntil).toLocaleDateString()}.
                    </p>
                    <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                      <QRDisplay url={qrData.url} />
                      <div className="flex flex-col gap-2">
                        <p className="text-xs text-orbit-success/70 break-all font-mono max-w-[260px]">{qrData.url}</p>
                        <Button type="button" variant="secondary" onClick={() => { void copyUrl(); }}>
                          {t.events.copyLink}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
