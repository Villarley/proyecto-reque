"use client";

import type { Level } from "@stellar-orbit/types";
import { Button, Card } from "@stellar-orbit/ui";
import { type FormEvent, useEffect, useState } from "react";
import { ApiError, apiFetchWithAuth } from "@/lib/api";
import { useI18n } from "@/i18n/I18nProvider";

type LevelsResponse = { levels: Level[] };

type DraftLevel = {
  id: string | null;
  tier: string;
  displayName: string;
  minPoints: number;
  sortOrder: number;
  isNew: boolean;
};

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "custom";
}

function getToken() {
  return window.localStorage.getItem("stellar-orbit.sessionToken") ?? "";
}

export default function AdminLevelsPage() {
  const { t } = useI18n();
  const [rows, setRows] = useState<DraftLevel[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busySave, setBusySave] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoadError(null);
      try {
        const token = getToken();
        if (!token) throw new Error(t.validation.notSignedIn);
        const res = await apiFetchWithAuth<LevelsResponse>(token, "/levels");
        if (!cancelled) {
          setRows(
            res.levels.map((l) => ({
              id: l.id,
              tier: l.tier,
              displayName: l.displayName,
              minPoints: l.minPoints,
              sortOrder: l.sortOrder,
              isNew: false,
            })),
          );
        }
      } catch (e) {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : t.levels.loadError);
        }
      }
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  function addLevel() {
    setRows((prev) => {
      if (!prev) return prev;
      const maxSort = Math.max(0, ...prev.map((r) => r.sortOrder));
      const maxPoints = Math.max(0, ...prev.map((r) => r.minPoints));
      const uid = `new_${Date.now()}`;
      return [
        ...prev,
        {
          id: null,
          tier: uid,
          displayName: "",
          minPoints: maxPoints + 100,
          sortOrder: maxSort + 1,
          isNew: true,
        },
      ];
    });
    setSuccess(null);
  }

  function removeRow(tier: string) {
    setRows((prev) => prev?.filter((r) => r.tier !== tier) ?? null);
    setSuccess(null);
  }

  function updateRow(tier: string, patch: Partial<DraftLevel>) {
    setRows((prev) =>
      prev?.map((r) => {
        if (r.tier !== tier) return r;
        const updated = { ...r, ...patch };
        if (r.isNew && patch.displayName !== undefined) {
          updated.tier = slugify(patch.displayName);
        }
        return updated;
      }) ?? null,
    );
    setSuccess(null);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaveError(null);
    setSuccess(null);
    if (!rows?.length) return;

    const sorted = [...rows].sort((a, b) => a.minPoints - b.minPoints);

    for (const row of sorted) {
      if (!row.displayName.trim()) {
        setSaveError(t.levels.nameRequired);
        return;
      }
    }

    const tiers = sorted.map((r) => r.tier);
    if (new Set(tiers).size !== tiers.length) {
      setSaveError(t.levels.duplicateKey);
      return;
    }

    setBusySave(true);
    try {
      const token = getToken();
      if (!token) throw new Error(t.validation.notSignedIn);

      const updated = await apiFetchWithAuth<LevelsResponse>(token, "/levels", {
        method: "PUT",
        body: JSON.stringify(
          sorted.map((row) => ({
            tier: row.tier,
            minPoints: row.minPoints,
            displayName: row.displayName.trim(),
          })),
        ),
      });
      setRows(
        updated.levels.map((l) => ({
          id: l.id,
          tier: l.tier,
          displayName: l.displayName,
          minPoints: l.minPoints,
          sortOrder: l.sortOrder,
          isNew: false,
        })),
      );
      setSuccess(t.levels.updatedSuccessfully);
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : t.levels.updateFailed);
    } finally {
      setBusySave(false);
    }
  }

  if (loadError) {
    return <p className="text-sm text-red-400" role="alert">{loadError}</p>;
  }

  if (!rows) {
    return <p className="text-sm text-orbit-text-2">{t.common.loading}</p>;
  }

  const sortedUi = [...rows].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <section className="flex flex-wrap items-start justify-between gap-4 rounded-3xl border border-orbit-border bg-white px-6 py-6 shadow-orbit-sm">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orbit-text-3">
            Admin
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">{t.levels.title}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-orbit-text-2">{t.levels.subtitle}</p>
        </div>
        <Button type="button" variant="secondary" onClick={addLevel}>
          + Add level
        </Button>
      </section>

      <Card className="border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
        <p className="font-semibold">{t.levels.warning}</p>
        <p className="mt-2 max-w-3xl leading-6">
          {t.levels.warningDetail.split("currentTier")[0]}
          <code className="rounded bg-white px-1.5 py-0.5 font-mono text-xs ring-1 ring-amber-200">currentTier</code>
          {t.levels.warningDetail.split("currentTier")[1]}
        </p>
      </Card>

      <Card className="p-5">
        <form className="flex flex-col gap-4" onSubmit={onSubmit}>
          {sortedUi.map((row) => (
            <div
              key={row.tier}
              className="rounded-2xl border border-orbit-border bg-orbit-raised/60 p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex flex-col gap-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orbit-text-3">
                    {t.levels.tier}
                  </p>
                  <p className="font-mono text-xs text-orbit-text-2">{row.tier}</p>
                </div>
                <button
                  type="button"
                  className="rounded-full px-2.5 py-1 text-xs font-medium text-red-500 hover:bg-red-50"
                  onClick={() => { removeRow(row.tier); }}
                >
                  Remove
                </button>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-[1fr_14rem]">
                <label className="flex flex-col gap-2 text-sm font-medium text-orbit-text-2">
                  Display name
                  <input
                    required
                    className="rounded-xl border border-orbit-border bg-white px-3 py-2.5 font-normal text-orbit-text shadow-sm focus:border-orbit-text focus:outline-none"
                    value={row.displayName}
                    placeholder="e.g. Stellar Pioneer"
                    onChange={(ev) => { updateRow(row.tier, { displayName: ev.target.value }); }}
                  />
                </label>

                <label className="flex flex-col gap-2 text-sm font-medium text-orbit-text-2">
                  {t.levels.minPoints}
                  <input
                    type="number"
                    required
                    min={0}
                    className="rounded-xl border border-orbit-border bg-white px-3 py-2.5 font-normal tabular-nums text-orbit-text shadow-sm focus:border-orbit-text focus:outline-none"
                    value={row.minPoints}
                    onChange={(ev) => {
                      const n = Number.parseInt(ev.target.value, 10);
                      if (Number.isFinite(n)) updateRow(row.tier, { minPoints: n });
                    }}
                  />
                </label>
              </div>
            </div>
          ))}

          {saveError ? (
            <p className="text-sm text-red-400" role="alert">{saveError}</p>
          ) : null}
          {success ? (
            <p className="text-sm font-semibold text-emerald-400" role="status">{success}</p>
          ) : null}

          <Button type="submit" disabled={busySave} className="self-start">
            {busySave ? t.levels.savingTiers : t.levels.saveTiers}
          </Button>
        </form>
      </Card>
    </div>
  );
}
