"use client";

import type { PointsLedgerEntry } from "@stellar-orbit/types";
import { Button, Card } from "@stellar-orbit/ui";
import { useQuery } from "@tanstack/react-query";
import { type FormEvent, useMemo, useState } from "react";
import { ApiError, apiFetchWithAuth } from "@/lib/api";

type ChapterMember = {
  id: string;
  stellarPublicKey: string;
  name: string | null;
  verifiedAt: string | null;
};

type MembersResponse = {
  chapterId: string;
  chapterName: string;
  members: ChapterMember[];
};

type ManualResponse = { promoted: boolean; entry: PointsLedgerEntry };

export default function CountryLeadPointsPage() {
  const [walletQuery, setWalletQuery] = useState("");
  const [userIdText, setUserIdText] = useState("");
  const [amountStr, setAmountStr] = useState("50");
  const [reason, setReason] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const membersQuery = useQuery({
    queryKey: ["country-lead", "chapter-members"],
    queryFn: async () => {
      const token = window.localStorage.getItem("stellar-orbit.sessionToken");
      if (!token) {
        throw new Error("Not signed in");
      }
      return apiFetchWithAuth<MembersResponse>(token, "/profile/chapter/members");
    },
  });

  const filteredMembers = useMemo(() => {
    const needle = walletQuery.trim().toLowerCase();
    const list = membersQuery.data?.members ?? [];
    if (!needle) {
      return list;
    }
    return list.filter((m) => m.stellarPublicKey.toLowerCase().includes(needle));
  }, [walletQuery, membersQuery.data?.members]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setSubmitError(null);
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

      let userId = userIdText.trim();
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(userId)) {
        throw new Error("Paste a valid ambassador user ID from the picker table.");
      }

      userId = userId.toLowerCase();

      const res = await apiFetchWithAuth<ManualResponse>(token, "/points/manual", {
        method: "POST",
        body: JSON.stringify({
          userId,
          delta: n,
          note: trimmedReason,
        }),
      });

      const leveled =
        res.promoted === true
          ? " A level-up was triggered."
          : " No level tier change.";
      setSuccess(
        `${String(res.entry.delta)} points assigned successfully.${leveled}`,
      );
    } catch (err) {
      if (err instanceof ApiError) {
        setSubmitError(err.message);
      } else if (err instanceof Error) {
        setSubmitError(err.message);
      } else {
        setSubmitError("Could not assign points.");
      }
    } finally {
      setBusy(false);
    }
  }

  function selectMember(m: ChapterMember) {
    setUserIdText(m.id);
    setWalletQuery(m.stellarPublicKey);
    setSubmitError(null);
    setSuccess(null);
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-10">
      <div>
        <h1 className="text-2xl font-bold">Manual points</h1>
        <p className="mt-1 text-sm text-white/50">
          Reward ambassadors directly. Search wallets to copy a UUID, then submit the adjustment.
        </p>
      </div>

      <Card className="flex flex-col gap-6 p-6">
        <div>
          <h2 className="text-lg font-semibold">Chapter members</h2>
          <label className="mt-3 flex flex-col gap-2 text-sm font-medium text-white/70">
            Search by wallet fragment
            <input
              className="rounded-lg border border-orbit-border bg-orbit-raised px-3 py-2 font-normal font-mono text-sm text-white focus:border-orbit-violet/50 focus:outline-none"
              placeholder="G…ABC"
              value={walletQuery}
              onChange={(ev) => {
                setWalletQuery(ev.target.value);
              }}
              autoComplete="off"
            />
          </label>

          <div className="mt-3 max-h-60 overflow-auto rounded-md border border-orbit-border">
            {membersQuery.isLoading ? (
              <p className="p-4 text-sm text-white/50">Loading members…</p>
            ) : membersQuery.isError ? (
              <p className="p-4 text-sm text-red-400">Could not load members.</p>
            ) : filteredMembers.length === 0 ? (
              <p className="p-4 text-sm text-white/50">
                No matches. Clear the wallet search to see everyone.
              </p>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-orbit-raised text-xs text-white/40">
                  <tr className="border-b border-orbit-border">
                    <th className="px-3 py-2 font-medium">Name</th>
                    <th className="px-3 py-2 font-medium">Wallet</th>
                    <th className="px-3 py-2 font-medium">Verified</th>
                    <th className="px-3 py-2 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMembers.slice(0, 50).map((m) => (
                    <tr key={m.id} className="border-b border-orbit-border">
                      <td className="px-3 py-2">{m.name ?? "—"}</td>
                      <td className="max-w-[12rem] truncate px-3 py-2 font-mono text-xs">
                        {m.stellarPublicKey}
                      </td>
                      <td className="px-3 py-2 text-xs">
                        {m.verifiedAt ? "Yes" : "No"}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          className="text-xs font-semibold text-orbit-violet-light hover:underline"
                          onClick={() => {
                            selectMember(m);
                          }}
                        >
                          Select
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <p className="mt-2 text-xs text-white/40">
            Showing first 50 filtered rows — narrow the wallet search when needed.
          </p>
        </div>

        <div className="border-t border-dashed border-orbit-border pt-6">
          <h2 className="text-lg font-semibold">Manual assignment form</h2>
          <form className="mt-4 flex max-w-xl flex-col gap-4" onSubmit={onSubmit}>
            <label className="flex flex-col gap-1 text-sm font-medium text-white/70">
              Ambassador user ID (UUID from row above — or paste)
              <input
                required
                className="rounded-lg border border-orbit-border bg-orbit-raised px-3 py-2 font-normal font-mono text-sm text-white focus:border-orbit-violet/50 focus:outline-none"
                value={userIdText}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                onChange={(ev) => {
                  setUserIdText(ev.target.value);
                }}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-white/70">
              Point amount
              <input
                type="number"
                required
                min={1}
                step={1}
                className="rounded-lg border border-orbit-border bg-orbit-raised px-3 py-2 tabular-nums text-sm text-white focus:border-orbit-violet/50 focus:outline-none"
                value={amountStr}
                onChange={(ev) => {
                  setAmountStr(ev.target.value);
                }}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-white/70">
              Reason
              <textarea
                required
                className="min-h-[5rem] rounded-lg border border-orbit-border bg-orbit-raised px-3 py-2 font-normal text-sm text-white focus:border-orbit-violet/50 focus:outline-none"
                placeholder="Why are these points being awarded?"
                value={reason}
                onChange={(ev) => {
                  setReason(ev.target.value);
                }}
              />
            </label>

            {submitError ? (
              <p className="text-sm text-red-400" role="alert">
                {submitError}
              </p>
            ) : null}
            {success ? (
              <p className="text-sm text-orbit-success" role="status">
                {success}
              </p>
            ) : null}

            <Button type="submit" disabled={busy}>
              {busy ? "Submitting…" : "Issue points"}
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}
