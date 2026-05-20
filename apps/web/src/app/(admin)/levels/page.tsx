"use client";

import type { Level, LevelTier } from "@stellar-orbit/types";
import { Button, Card } from "@stellar-orbit/ui";
import { type FormEvent, useEffect, useState } from "react";
import { ApiError, apiFetchWithAuth } from "@/lib/api";

const TIER_FALLBACK_DISPLAY: Record<LevelTier, string> = {
  explorer: "Explorer",
  stellar_pioneer: "Stellar Pioneer",
  orbit_builder: "Orbit Builder",
  nova_ambassador: "Nova Ambassador",
  ecosystem_leader: "Ecosystem Leader",
};

type LevelsResponse = { levels: Level[] };

export default function AdminLevelsPage() {
  const [rows, setRows] = useState<Level[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busySave, setBusySave] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoadError(null);
      try {
        const token = window.localStorage.getItem("stellar-orbit.sessionToken");
        if (!token) {
          throw new Error("Not signed in");
        }
        const res = await apiFetchWithAuth<LevelsResponse>(token, "/levels");
        if (!cancelled) {
          setRows(res.levels);
        }
      } catch (e) {
        if (!cancelled) {
          if (e instanceof ApiError) {
            setLoadError(e.message);
          } else if (e instanceof Error) {
            setLoadError(e.message);
          } else {
            setLoadError("Could not load level configuration.");
          }
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  function updateMinPoints(tier: LevelTier, value: number) {
    setRows((prev) => {
      if (!prev) {
        return prev;
      }
      return prev.map((row) => (row.tier === tier ? { ...row, minPoints: value } : row));
    });
    setSuccess(null);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaveError(null);
    setSuccess(null);
    if (!rows?.length) {
      return;
    }

    const sorted = [...rows].sort((x, y) => x.sortOrder - y.sortOrder);
    let previous = Number.NEGATIVE_INFINITY;
    for (const tier of sorted) {
      if (tier.minPoints <= previous) {
        setSaveError("Each tier’s minimum points must be greater than the previous tier.");
        return;
      }
      previous = tier.minPoints;
    }

    setBusySave(true);
    try {
      const token = window.localStorage.getItem("stellar-orbit.sessionToken");
      if (!token) {
        throw new Error("Not signed in");
      }

      const updated = await apiFetchWithAuth<LevelsResponse>(
        token,
        "/levels",
        {
          method: "PUT",
          body: JSON.stringify(
            sorted.map((row) => ({
              tier: row.tier,
              minPoints: row.minPoints,
              displayName:
                row.displayName?.trim() ||
                TIER_FALLBACK_DISPLAY[row.tier],
            })),
          ),
        },
      );
      setRows(updated.levels);
      setSuccess("Updated successfully");
    } catch (err) {
      if (err instanceof ApiError) {
        setSaveError(err.message);
      } else if (err instanceof Error) {
        setSaveError(err.message);
      } else {
        setSaveError("Could not update levels.");
      }
    } finally {
      setBusySave(false);
    }
  }

  if (loadError) {
    return (
      <p className="text-sm text-red-400" role="alert">
        {loadError}
      </p>
    );
  }

  if (!rows) {
    return <p className="text-sm text-white/50">Loading level configuration…</p>;
  }

  const sortedUi = [...rows].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold">Level configuration</h1>
        <p className="mt-1 text-sm text-white/50">
          Adjust thresholds for ambassador progression. Applies to tier calculations derived from
          point totals — current stored tiers are not rewound automatically.
        </p>
      </div>

      <Card className="border-orbit-gold/30 bg-orbit-gold/10 p-4 text-xs text-orbit-gold">
        <p className="font-semibold">Existing ambassador tiers are not retroactively changed.</p>
        <p className="mt-2">
          New point calculations will honour these thresholds immediately, while historical{" "}
          <code className="rounded bg-white/10 px-1 font-mono">currentTier</code> fields may lag
          until the next promotional job or manual reconcile.
        </p>
      </Card>

      <Card className="p-6">
        <form className="flex flex-col gap-6" onSubmit={onSubmit}>
          {sortedUi.map((tier) => (
            <div
              key={tier.id}
              className="rounded-lg border border-orbit-border bg-orbit-raised p-4"
            >
              <p className="text-xs uppercase text-white/40">Tier</p>
              <p className="mt-1 text-lg font-semibold text-white">
                {tier.displayName || TIER_FALLBACK_DISPLAY[tier.tier]}
              </p>
              <p className="text-xs font-mono text-white/40">{tier.tier}</p>
              <label className="mt-4 flex flex-col gap-2 text-sm font-medium text-white/70">
                Minimum points threshold
                <input
                  type="number"
                  required
                  className="max-w-xs rounded-lg border border-orbit-border bg-orbit-raised px-3 py-2 font-normal tabular-nums text-white focus:outline-none focus:border-orbit-violet/50"
                  value={Number.isFinite(tier.minPoints) ? tier.minPoints : 0}
                  onChange={(event) => {
                    const parsed = Number.parseInt(event.target.value, 10);
                    if (!Number.isFinite(parsed)) {
                      return;
                    }
                    updateMinPoints(tier.tier, parsed);
                  }}
                />
              </label>
            </div>
          ))}

          {saveError ? (
            <p className="text-sm text-red-400" role="alert">
              {saveError}
            </p>
          ) : null}
          {success ? (
            <p className="text-sm font-semibold text-emerald-400" role="status">
              {success}
            </p>
          ) : null}

          <Button type="submit" disabled={busySave}>
            {busySave ? "Saving tiers…" : "Save tiers"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
