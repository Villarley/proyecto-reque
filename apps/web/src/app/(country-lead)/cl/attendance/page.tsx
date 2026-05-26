"use client";

import { Button, Card } from "@stellar-orbit/ui";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ApiError, apiFetchWithAuth } from "@/lib/api";
import type { Event } from "@stellar-orbit/types";
import { useI18n } from "@/i18n/I18nProvider";
import { formatMessage } from "@/i18n/format";

type EventsResponse = { events: Event[] };

type AttendanceRow = {
  attendanceId: string;
  userId: string;
  ambassadorName: string | null;
  stellarPublicKey: string;
  verifiedAt: string | null;
  checkedInAt: string;
  pointsAwarded: number;
  checkInQrComplete: boolean;
};

type AttendanceListResponse = { attendanceRows: AttendanceRow[] };

function formatDt(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function truncateMiddle(value: string, left = 8, right = 6): string {
  if (value.length <= left + right) {
    return value;
  }
  return `${value.slice(0, left)}…${value.slice(-right)}`;
}

function ManualPointsModal(props: {
  open: boolean;
  onClose: () => void;
  userId: string;
  displayKey: string;
}) {
  const { t } = useI18n();
  const [amountStr, setAmountStr] = useState("10");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!props.open) {
    return null;
  }

  async function onSubmit(ev: React.SyntheticEvent<HTMLFormElement>) {
    ev.preventDefault();
    setBusy(true);
    setErr(null);
    setSuccess(null);
    try {
      const token = window.localStorage.getItem("stellar-orbit.sessionToken");
      if (!token) {
        throw new Error(t.validation.notSignedIn);
      }
      const n = Number(amountStr);
      if (!Number.isInteger(n) || n < 1) {
        throw new Error(t.points.pointsPositive);
      }
      const trimmedReason = reason.trim();
      if (!trimmedReason) {
        throw new Error(t.points.reasonRequired);
      }
      const body = await apiFetchWithAuth<{ promoted: boolean; entry: { delta: number } }>(
        token,
        "/points/manual",
        {
          method: "POST",
          body: JSON.stringify({
            userId: props.userId,
            delta: n,
            note: trimmedReason,
          }),
        },
      );
      const leveled = body.promoted ? t.points.levelUpAfter : "";
      setSuccess(
        `${formatMessage(t.points.assignSuccess, { delta: body.entry.delta })}${leveled}`,
      );
      setReason("");
    } catch (e) {
      if (e instanceof ApiError) {
        setErr(e.message);
      } else if (e instanceof Error) {
        setErr(e.message);
      } else {
        setErr(t.points.requestFailed);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-orbit-text/45 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl border border-white/70 bg-white p-6 shadow-[0_24px_90px_rgba(17,24,39,0.2)]">
        <div className="rounded-2xl bg-orbit-raised p-4">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-orbit-text-3">
            {t.points.manualAdjustment}
          </p>
          <h3 className="mt-2 text-xl font-bold">{t.points.assignManual}</h3>
          <p className="mt-1 truncate text-xs text-orbit-text-3" title={props.displayKey}>
            {props.displayKey}
          </p>
        </div>
        <form
          className="mt-4 flex flex-col gap-3"
          onSubmit={(ev) => {
            void onSubmit(ev);
          }}
        >
          <label className="flex flex-col gap-1 text-sm font-medium text-orbit-text-2">
            {t.points.pointsAmount}
            <input
              type="number"
              min={1}
              step={1}
              required
              className="rounded-lg border border-orbit-border bg-orbit-raised px-3 py-2 text-sm text-orbit-text focus:outline-none focus:border-orbit-violet/50 font-normal tabular-nums"
              value={amountStr}
              onChange={(e) => {
                setAmountStr(e.target.value);
              }}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-orbit-text-2">
            {t.points.reason}
            <textarea
              required
              className="min-h-[5rem] rounded-lg border border-orbit-border bg-orbit-raised px-3 py-2 text-sm text-orbit-text focus:outline-none focus:border-orbit-violet/50 font-normal"
              placeholder={t.points.reasonPlaceholder}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
              }}
            />
          </label>
          {err ? (
            <p className="text-sm text-red-400" role="alert">
              {err}
            </p>
          ) : null}
          {success ? (
            <p className="text-sm text-orbit-success" role="status">
              {success}
            </p>
          ) : null}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                props.onClose();
              }}
              disabled={busy}
            >
              {t.points.close}
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? t.common.saving : t.points.assign}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AttendanceInner() {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const effectiveEventId = searchParams.get("eventId")?.trim() ?? "";

  const eventsQuery = useQuery({
    queryKey: ["country-lead", "events-for-attendance"],
    queryFn: async () => {
      const token = window.localStorage.getItem("stellar-orbit.sessionToken");
      if (!token) {
        throw new Error(t.validation.notSignedIn);
      }
      return apiFetchWithAuth<EventsResponse>(token, "/events");
    },
  });

  const [modal, setModal] = useState<{
    userId: string;
    displayKey: string;
  } | null>(null);

  const attendanceQuery = useQuery({
    queryKey: ["country-lead", "event-attendance", effectiveEventId],
    enabled: !!effectiveEventId,
    queryFn: async () => {
      const token = window.localStorage.getItem("stellar-orbit.sessionToken");
      if (!token || !effectiveEventId) {
        throw new Error("Missing selection");
      }
      return apiFetchWithAuth<AttendanceListResponse>(
        token,
        `/events/${effectiveEventId}/attendance`,
      );
    },
  });

  const selectedEvent = useMemo(() => {
    const list = eventsQuery.data?.events ?? [];
    return list.find((e) => e.id === effectiveEventId);
  }, [eventsQuery.data?.events, effectiveEventId]);
  const attendanceRows = attendanceQuery.data?.attendanceRows ?? [];
  const totalPoints = attendanceRows.reduce((sum, row) => sum + row.pointsAwarded, 0);
  const verifiedCount = attendanceRows.filter((row) => row.verifiedAt).length;

  function replaceEvent(next: string) {
    if (next) {
      router.replace(`/cl/attendance?eventId=${encodeURIComponent(next)}`);
    } else {
      router.replace("/cl/attendance");
    }
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <section className="overflow-hidden rounded-[2rem] border border-white/80 bg-white shadow-orbit-sm">
        <div className="relative p-6 sm:p-8">
          <div
            className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(8,145,178,0.14),transparent_30%),radial-gradient(circle_at_88%_0%,rgba(245,158,11,0.18),transparent_34%)]"
            aria-hidden
          />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-orbit-stellar">
                {t.attendance.eyebrow}
              </p>
              <h1 className="mt-3 text-4xl font-black tracking-tight">{t.attendance.title}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-orbit-text-2">
                {t.attendance.subtitle}
              </p>
            </div>
            <Link
              href="/cl/events"
              className="inline-flex w-fit items-center rounded-full border border-orbit-border bg-white px-4 py-2 text-sm font-semibold text-orbit-text shadow-orbit-sm transition hover:border-orbit-text"
            >
              {t.attendance.backToEvents}
            </Link>
          </div>
        </div>
      </section>

      <Card className="border-white bg-white p-5 shadow-orbit-sm">
        <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
          <label className="flex flex-col gap-2 text-sm font-semibold text-orbit-text">
            {t.attendance.selectEvent}
            {eventsQuery.isLoading ? (
              <div className="rounded-2xl border border-orbit-border bg-orbit-raised px-4 py-3 text-sm font-normal text-orbit-text-3">
                {t.attendance.loadingEvents}
              </div>
            ) : (
              <select
                className="rounded-2xl border border-orbit-border bg-orbit-raised px-4 py-3 text-sm font-normal text-orbit-text shadow-inner focus:border-orbit-text focus:outline-none"
                value={effectiveEventId}
                onChange={(e) => {
                  replaceEvent(e.target.value.trim());
                }}
              >
                <option value="">{t.attendance.chooseEvent}</option>
                {(eventsQuery.data?.events ?? []).map((evt) => (
                  <option key={evt.id} value={evt.id}>
                    {evt.title}, {formatDt(evt.startsAt)}
                  </option>
                ))}
              </select>
            )}
          </label>
          <div className="grid grid-cols-3 overflow-hidden rounded-2xl border border-orbit-border bg-orbit-raised text-center">
            <div className="border-r border-orbit-border px-4 py-3">
              <p className="text-xl font-black tabular-nums">{attendanceRows.length}</p>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-orbit-text-3">
                {t.attendance.checkedIn}
              </p>
            </div>
            <div className="border-r border-orbit-border px-4 py-3">
              <p className="text-xl font-black tabular-nums">{totalPoints}</p>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-orbit-text-3">
                {t.attendance.points}
              </p>
            </div>
            <div className="px-4 py-3">
              <p className="text-xl font-black tabular-nums">{verifiedCount}</p>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-orbit-text-3">
                {t.attendance.verified}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {effectiveEventId ? (
        <Card className="overflow-hidden border-white bg-white shadow-orbit-sm">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-orbit-border bg-orbit-raised/60 p-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-orbit-text-3">
                {t.attendance.selectedEvent}
              </p>
              <h2 className="mt-1 text-xl font-bold tracking-tight">
                {selectedEvent?.title ?? t.attendance.title}
              </h2>
              <p className="mt-1 text-sm text-orbit-text-2">
                {selectedEvent ? formatDt(selectedEvent.startsAt) : truncateMiddle(effectiveEventId)}
              </p>
            </div>
            <span className="rounded-full bg-orbit-text px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-white">
              {formatMessage(t.attendance.checkedInCount, { count: attendanceRows.length })}
            </span>
          </div>

          {attendanceQuery.isLoading ? (
            <div className="p-6 text-sm text-orbit-text-2">{t.attendance.loading}</div>
          ) : attendanceQuery.isError ? (
            <div className="p-6 text-sm text-red-400">{t.attendance.loadError}</div>
          ) : attendanceRows.length === 0 ? (
            <div className="p-8 text-center">
              <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-orbit-raised text-2xl">
                ◌
              </div>
              <h3 className="mt-4 text-lg font-bold">{t.attendance.noCheckInsTitle}</h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-orbit-text-2">
                {t.attendance.noCheckInsBody}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-orbit-border bg-white text-xs uppercase tracking-[0.14em] text-orbit-text-3">
                    <th className="px-5 py-3 font-bold">{t.attendance.ambassador}</th>
                    <th className="px-5 py-3 font-bold">{t.attendance.checkIn}</th>
                    <th className="px-5 py-3 font-bold">{t.attendance.points}</th>
                    <th className="px-5 py-3 font-bold">{t.attendance.status}</th>
                    <th className="px-5 py-3 font-bold" aria-label="Actions"></th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceRows.map((row) => {
                    const accountVerified = !!row.verifiedAt;
                    return (
                      <tr
                        key={row.attendanceId}
                        className="border-b border-orbit-border align-top last:border-b-0 hover:bg-orbit-raised/50"
                      >
                        <td className="px-5 py-4">
                          <span className="font-semibold">{row.ambassadorName ?? t.attendance.unnamedAmbassador}</span>
                          <p className="mt-1 font-mono text-xs text-orbit-text-3" title={row.stellarPublicKey}>
                            {truncateMiddle(row.stellarPublicKey)}
                          </p>
                        </td>
                        <td className="px-5 py-4 text-orbit-text-2">{formatDt(row.checkedInAt)}</td>
                        <td className="px-5 py-4">
                          <span className="rounded-full bg-orbit-gold/15 px-2.5 py-1 text-xs font-bold text-orbit-text ring-1 ring-orbit-gold/30">
                            +{row.pointsAwarded}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex flex-wrap gap-2">
                            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${
                              accountVerified
                                ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                                : "bg-orbit-raised text-orbit-text-3 ring-orbit-border"
                            }`}>
                              {accountVerified ? t.common.verified : t.attendance.notVerified}
                            </span>
                            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${
                              row.checkInQrComplete
                                ? "bg-cyan-50 text-cyan-700 ring-cyan-200"
                                : "bg-orbit-raised text-orbit-text-3 ring-orbit-border"
                            }`}>
                              {row.checkInQrComplete ? t.attendance.qrCheckIn : t.attendance.manualRecord}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={() => {
                              setModal({
                                userId: row.userId,
                                displayKey: `${row.ambassadorName ?? t.common.ambassador}, ${row.stellarPublicKey}`,
                              });
                            }}
                          >
                            {t.attendance.addPoints}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      ) : (
        <Card className="border-dashed border-orbit-border bg-white/70 p-8 text-center shadow-orbit-sm">
          <div className="mx-auto flex size-16 items-center justify-center rounded-3xl bg-orbit-raised text-3xl">
            ◇
          </div>
          <h2 className="mt-5 text-xl font-bold">{t.attendance.chooseEventTitle}</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-orbit-text-2">
            {t.attendance.chooseEventBody}
          </p>
        </Card>
      )}

      {modal ? (
        <ManualPointsModal
          open
          displayKey={modal.displayKey}
          userId={modal.userId}
          onClose={() => {
            setModal(null);
          }}
        />
      ) : null}
    </div>
  );
}

function AttendanceFallback() {
  const { t } = useI18n();
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4">
      <p className="text-sm text-orbit-text-2">{t.attendance.loading}</p>
    </div>
  );
}

export default function CountryLeadAttendancePage() {
  return (
    <Suspense
      fallback={<AttendanceFallback />}
    >
      <AttendanceInner />
    </Suspense>
  );
}
