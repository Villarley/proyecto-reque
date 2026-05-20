"use client";

import { Button, Card } from "@stellar-orbit/ui";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ApiError, apiFetchWithAuth } from "@/lib/api";
import type { Event } from "@stellar-orbit/types";

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

function ManualPointsModal(props: {
  open: boolean;
  onClose: () => void;
  userId: string;
  displayKey: string;
}) {
  const [amountStr, setAmountStr] = useState("10");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!props.open) {
    return null;
  }

  async function onSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    setBusy(true);
    setErr(null);
    setSuccess(null);
    try {
      const token = window.localStorage.getItem("stellar-orbit.sessionToken");
      if (!token) {
        throw new Error("Not signed in");
      }
      const n = Number(amountStr);
      if (!Number.isInteger(n) || n < 1) {
        throw new Error("Points must be a positive whole number.");
      }
      const trimmedReason = reason.trim();
      if (!trimmedReason) {
        throw new Error("Reason is required.");
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
      const leveled =
        body.promoted === true ? " Ambassador leveled up after this adjustment." : "";
      setSuccess(
        `${String(body.entry?.delta ?? n)} manual points assigned successfully.${leveled}`,
      );
      setReason("");
    } catch (e) {
      if (e instanceof ApiError) {
        setErr(e.message);
      } else if (e instanceof Error) {
        setErr(e.message);
      } else {
        setErr("Request failed.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-orbit-raised p-6 shadow-lg ring-1 ring-white/10">
        <h3 className="text-lg font-semibold">Assign manual points</h3>
        <p className="mt-1 truncate text-xs text-white/40" title={props.displayKey}>
          {props.displayKey}
        </p>
        <form className="mt-4 flex flex-col gap-3" onSubmit={onSubmit}>
          <label className="flex flex-col gap-1 text-sm font-medium text-white/70">
            Points amount
            <input
              type="number"
              min={1}
              step={1}
              required
              className="rounded-lg border border-orbit-border bg-orbit-raised px-3 py-2 text-sm text-white focus:outline-none focus:border-orbit-violet/50 font-normal tabular-nums"
              value={amountStr}
              onChange={(e) => {
                setAmountStr(e.target.value);
              }}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-white/70">
            Reason
            <textarea
              required
              className="min-h-[5rem] rounded-lg border border-orbit-border bg-orbit-raised px-3 py-2 text-sm text-white focus:outline-none focus:border-orbit-violet/50 font-normal"
              placeholder="Why are these points being awarded?"
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
              Close
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Saving…" : "Assign"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AttendanceInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const effectiveEventId = searchParams.get("eventId")?.trim() ?? "";

  const eventsQuery = useQuery({
    queryKey: ["country-lead", "events-for-attendance"],
    queryFn: async () => {
      const token = window.localStorage.getItem("stellar-orbit.sessionToken");
      if (!token) {
        throw new Error("Not signed in");
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

  const selectedTitle = useMemo(() => {
    const list = eventsQuery.data?.events ?? [];
    return list.find((e) => e.id === effectiveEventId)?.title;
  }, [eventsQuery.data?.events, effectiveEventId]);

  function replaceEvent(next: string) {
    if (next) {
      router.replace(`/cl/attendance?eventId=${encodeURIComponent(next)}`);
    } else {
      router.replace("/cl/attendance");
    }
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold">Attendance</h1>
        <p className="mt-1 text-sm text-white/50">
          Review ambassadors who checked in to an event.
        </p>
      </div>

      <Card className="flex flex-col gap-4 p-6">
        <label className="flex flex-col gap-2 text-sm font-medium text-white/70">
          Event
          {eventsQuery.isLoading ? (
            <p className="text-xs font-normal text-white/40">Loading chapter events…</p>
          ) : (
            <select
              className="rounded-lg border border-orbit-border bg-orbit-raised px-3 py-2 text-sm text-white focus:outline-none focus:border-orbit-violet/50 font-normal"
              value={effectiveEventId}
              onChange={(e) => {
                replaceEvent(e.target.value.trim());
              }}
            >
              <option value="">Select an event…</option>
              {(eventsQuery.data?.events ?? []).map((evt) => (
                <option key={evt.id} value={evt.id}>
                  {evt.title} — {formatDt(evt.startsAt)}
                </option>
              ))}
            </select>
          )}
          <Link href="/cl/events" className="text-xs font-semibold text-orbit-violet-light">
            Back to Events
          </Link>
        </label>
      </Card>

      {effectiveEventId ? (
        <Card className="flex flex-col gap-4 p-6">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold">{selectedTitle ?? "Attendance"}</h2>
              <p className="text-xs font-mono text-white/40">{effectiveEventId}</p>
            </div>
          </div>

          {attendanceQuery.isLoading ? (
            <p className="text-sm text-white/50">Loading attendance…</p>
          ) : attendanceQuery.isError ? (
            <p className="text-sm text-red-400">Could not load attendance.</p>
          ) : (attendanceQuery.data?.attendanceRows?.length ?? 0) === 0 ? (
            <p className="text-sm text-white/50">Nobody has checked in yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-orbit-border text-white/40">
                    <th className="py-2 pr-4 font-medium">Ambassador</th>
                    <th className="py-2 pr-4 font-medium">Check-in</th>
                    <th className="py-2 pr-4 font-medium">Points awarded</th>
                    <th className="py-2 pr-4 font-medium">Verified status</th>
                    <th className="py-2 font-medium" aria-label="Actions"></th>
                  </tr>
                </thead>
                <tbody>
                  {(attendanceQuery.data?.attendanceRows ?? []).map((row) => {
                    const accountVerified = !!row.verifiedAt;
                    return (
                      <tr key={row.attendanceId} className="border-b border-orbit-border align-top">
                        <td className="py-2 pr-4">
                          <span className="font-medium">{row.ambassadorName ?? "—"}</span>
                          <p className="font-mono text-xs text-white/50 break-all">
                            {row.stellarPublicKey}
                          </p>
                        </td>
                        <td className="py-2 pr-4 text-white/60">{formatDt(row.checkedInAt)}</td>
                        <td className="py-2 pr-4 tabular-nums">{row.pointsAwarded}</td>
                        <td className="py-2 pr-4 text-xs text-white/60">
                          {accountVerified ? "Account verified" : "Not verified"}
                          {row.checkInQrComplete ? " · QR-token check-in" : " · No QR recorded"}
                        </td>
                        <td className="py-2 text-right">
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={() => {
                              setModal({
                                userId: row.userId,
                                displayKey: `${row.ambassadorName ?? "Ambassador"} — ${row.stellarPublicKey}`,
                              });
                            }}
                          >
                            Assign manual points
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
        <Card className="p-6 text-sm text-white/50">
          Choose an event to view attendance rows, or append{" "}
          <code className="rounded bg-orbit-raised px-1 py-0.5 font-mono text-xs">
            ?eventId=…
          </code>{" "}
          to the URL.
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

export default function CountryLeadAttendancePage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto flex max-w-5xl flex-col gap-4">
          <p className="text-sm text-white/50">Loading attendance…</p>
        </div>
      }
    >
      <AttendanceInner />
    </Suspense>
  );
}
