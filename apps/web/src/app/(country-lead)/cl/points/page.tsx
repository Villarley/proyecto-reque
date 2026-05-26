"use client";

import type { PointsLedgerEntry } from "@stellar-orbit/types";
import { Button, Card } from "@stellar-orbit/ui";
import { useQuery } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";
import { ApiError, apiFetchWithAuth } from "@/lib/api";
import { useI18n } from "@/i18n/I18nProvider";
import { formatMessage } from "@/i18n/format";

type UserResult = {
  id: string;
  stellarPublicKey: string;
  name: string | null;
  email: string | null;
  verifiedAt: string | null;
  chapterId: string;
  chapterName: string | null;
};

type UsersSearchResponse = { users: UserResult[] };
type ManualResponse = { promoted: boolean; entry: PointsLedgerEntry };

function getToken() {
  return window.localStorage.getItem("stellar-orbit.sessionToken") ?? "";
}

export default function CountryLeadPointsPage() {
  const { t } = useI18n();
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserResult | null>(null);
  const [amountStr, setAmountStr] = useState("50");
  const [reason, setReason] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const usersQuery = useQuery({
    queryKey: ["users-search", search],
    queryFn: async () => {
      const token = getToken();
      if (!token) throw new Error(t.validation.notSignedIn);
      const qs = search.trim() ? `?q=${encodeURIComponent(search.trim())}` : "";
      return apiFetchWithAuth<UsersSearchResponse>(token, `/profile/users/search${qs}`);
    },
    staleTime: 10_000,
  });

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!selectedUser) {
      setSubmitError(t.points.selectUserFirst);
      return;
    }
    setBusy(true);
    setSubmitError(null);
    setSuccess(null);
    try {
      const token = getToken();
      if (!token) throw new Error(t.validation.notSignedIn);
      const n = Number(amountStr);
      if (!Number.isInteger(n) || n < 1) throw new Error(t.points.pointsPositive);
      const trimmedReason = reason.trim();
      if (!trimmedReason) throw new Error(t.points.reasonRequired);

      const res = await apiFetchWithAuth<ManualResponse>(token, "/points/manual", {
        method: "POST",
        body: JSON.stringify({ userId: selectedUser.id, delta: n, note: trimmedReason }),
      });

      const displayName = selectedUser.name ?? `${selectedUser.stellarPublicKey.slice(0, 8)}…`;
      setSuccess(
        res.promoted
          ? formatMessage(t.points.successWithLevel, { delta: res.entry.delta, name: displayName })
          : formatMessage(t.points.successNoLevel, { delta: res.entry.delta, name: displayName }),
      );
      setSelectedUser(null);
      setReason("");
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : t.points.assignFailed);
    } finally {
      setBusy(false);
    }
  }

  const users = usersQuery.data?.users ?? [];

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-10">
      <div>
        <h1 className="text-2xl font-bold">{t.points.title}</h1>
        <p className="mt-1 text-sm text-orbit-text-2">{t.points.subtitle}</p>
      </div>

      <Card className="flex flex-col gap-6 p-6">
        <div>
          <h2 className="text-lg font-semibold">{t.points.findAmbassador}</h2>
          <label className="mt-3 flex flex-col gap-2 text-sm font-medium text-orbit-text-2">
            {t.points.searchLabel}
            <input
              className="rounded-lg border border-orbit-border bg-orbit-raised px-3 py-2 font-normal text-sm text-orbit-text focus:border-orbit-violet/50 focus:outline-none"
              placeholder={t.points.searchPlaceholder}
              value={search}
              onChange={(ev) => {
                setSearch(ev.target.value);
                setSelectedUser(null);
              }}
              autoComplete="off"
            />
          </label>

          {selectedUser ? (
            <div className="mt-3 flex items-center justify-between rounded-md border border-orbit-violet/30 bg-orbit-violet/10 px-4 py-3">
              <div>
                <p className="font-medium text-orbit-text">{selectedUser.name ?? "-"}</p>
                <p className="font-mono text-xs text-orbit-text-3">{selectedUser.stellarPublicKey}</p>
                {selectedUser.chapterName ? (
                  <p className="text-xs text-orbit-text-3">{selectedUser.chapterName}</p>
                ) : null}
              </div>
              <button
                type="button"
                className="text-xs text-orbit-text-3 hover:text-red-400"
                onClick={() => { setSelectedUser(null); }}
              >
                {t.points.clear}
              </button>
            </div>
          ) : (
            <div className="mt-3 max-h-64 overflow-auto rounded-md border border-orbit-border">
              {usersQuery.isLoading ? (
                <p className="p-4 text-sm text-orbit-text-2">{t.points.searching}</p>
              ) : usersQuery.isError ? (
                <p className="p-4 text-sm text-red-400">{t.points.loadUsersError}</p>
              ) : users.length === 0 ? (
                <p className="p-4 text-sm text-orbit-text-2">
                  {search.trim() ? t.points.noMatch : t.points.typeToSearch}
                </p>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 bg-orbit-raised text-xs text-orbit-text-3">
                    <tr className="border-b border-orbit-border">
                      <th className="px-3 py-2 font-medium">{t.points.name}</th>
                      <th className="px-3 py-2 font-medium">{t.points.wallet}</th>
                      <th className="px-3 py-2 font-medium">{t.points.chapter}</th>
                      <th className="px-3 py-2 font-medium">{t.points.verified}</th>
                      <th className="px-3 py-2 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.slice(0, 50).map((u) => (
                      <tr key={u.id} className="border-b border-orbit-border last:border-0">
                        <td className="px-3 py-2">{u.name ?? "-"}</td>
                        <td className="max-w-[10rem] truncate px-3 py-2 font-mono text-xs">
                          {u.stellarPublicKey}
                        </td>
                        <td className="px-3 py-2 text-xs text-orbit-text-3">{u.chapterName ?? "-"}</td>
                        <td className="px-3 py-2 text-xs">{u.verifiedAt ? t.common.yes : t.common.no}</td>
                        <td className="px-3 py-2 text-right">
                          <button
                            type="button"
                            className="text-xs font-semibold text-orbit-violet-light hover:underline"
                            onClick={() => { setSelectedUser(u); setSearch(""); }}
                          >
                            {t.points.select}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
          {!selectedUser && users.length >= 50 && (
            <p className="mt-2 text-xs text-orbit-text-3">{t.points.showingFirst50}</p>
          )}
        </div>

        <div className="border-t border-dashed border-orbit-border pt-6">
          <h2 className="text-lg font-semibold">{t.points.assignmentForm}</h2>
          <form className="mt-4 flex max-w-xl flex-col gap-4" onSubmit={onSubmit}>
            <label className="flex flex-col gap-1 text-sm font-medium text-orbit-text-2">
              {t.points.pointAmount}
              <input
                type="number"
                required
                min={1}
                step={1}
                className="rounded-lg border border-orbit-border bg-orbit-raised px-3 py-2 tabular-nums text-sm text-orbit-text focus:border-orbit-violet/50 focus:outline-none"
                value={amountStr}
                onChange={(ev) => { setAmountStr(ev.target.value); }}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-orbit-text-2">
              {t.points.reason}
              <textarea
                required
                className="min-h-[5rem] rounded-lg border border-orbit-border bg-orbit-raised px-3 py-2 font-normal text-sm text-orbit-text focus:border-orbit-violet/50 focus:outline-none"
                placeholder={t.points.reasonPlaceholder}
                value={reason}
                onChange={(ev) => { setReason(ev.target.value); }}
              />
            </label>

            {submitError ? (
              <p className="text-sm text-red-400" role="alert">{submitError}</p>
            ) : null}
            {success ? (
              <p className="text-sm text-orbit-success" role="status">{success}</p>
            ) : null}

            <Button type="submit" disabled={busy || !selectedUser}>
              {busy
                ? t.points.submitting
                : selectedUser
                  ? formatMessage(t.points.issueTo, {
                      amount: amountStr,
                      name: selectedUser.name ?? t.common.ambassador,
                    })
                  : t.points.selectUserAbove}
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}
