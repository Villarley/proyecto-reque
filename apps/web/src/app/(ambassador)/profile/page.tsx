"use client";

import type { Chapter, Role } from "@stellar-orbit/types";
import { Button, Card } from "@stellar-orbit/ui";
import { useEffect, useState, type SyntheticEvent } from "react";
import { apiFetchWithAuth } from "@/lib/api";
import { useApi } from "@/hooks/useApi";

type MeUser = {
  id: string;
  stellarPublicKey: string;
  name: string | null;
  email: string | null;
  language: string | null;
  countryCode: string;
  role: Role;
  chapterId: string;
  createdAt: string;
  updatedAt: string;
};

type ProfileMeResponse = {
  user: MeUser & { chapter: Chapter };
  totalPoints: number;
};

function truncateMiddle(value: string, left = 8, right = 6): string {
  if (value.length <= left + right) {
    return value;
  }
  return `${value.slice(0, left)}…${value.slice(-right)}`;
}

export default function AmbassadorProfilePage() {
  const profile = useApi<ProfileMeResponse>(["profile", "me"], "/profile/me");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [language, setLanguage] = useState("en");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ type: "ok" | "err"; text: string } | null>(
    null,
  );

  useEffect(() => {
    if (!profile.data?.user) {
      return;
    }
    const u = profile.data.user;
    setName(u.name ?? "");
    setEmail(u.email ?? "");
    setLanguage(u.language ?? "en");
  }, [profile.data?.user]);

  async function handleSubmit(e: SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setToast(null);
    try {
      const token = window.localStorage.getItem("stellar-orbit.sessionToken");
      if (!token) {
        throw new Error("Not signed in");
      }
      await apiFetchWithAuth<{ user: MeUser }>(token, "/profile/me", {
        method: "PATCH",
        body: JSON.stringify({
          name: name.trim() || null,
          email: email.trim() ? email.trim() : null,
          language,
        }),
      });
      setToast({ type: "ok", text: "Profile saved successfully." });
      await profile.refetch();
      window.setTimeout(() => {
        setToast(null);
      }, 4000);
    } catch (err) {
      setToast({
        type: "err",
        text: err instanceof Error ? err.message : "Update failed.",
      });
      window.setTimeout(() => {
        setToast(null);
      }, 5000);
    } finally {
      setBusy(false);
    }
  }

  if (profile.isLoading) {
    return <p className="text-sm text-white/50">Loading profile…</p>;
  }

  if (profile.isError || !profile.data) {
    return (
      <p className="text-sm text-red-400">
        Could not load profile. Try refreshing the page.
      </p>
    );
  }

  const { user } = profile.data;

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Profile</h1>
        <p className="mt-1 text-sm text-white/50">Update your ambassador details.</p>
      </div>

      {toast ? (
        <div
          role="status"
          className={`rounded-md border px-4 py-3 text-sm ${
            toast.type === "ok"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
              : "border-red-500/30 bg-red-500/10 text-red-400"
          }`}
        >
          {toast.text}
        </div>
      ) : null}

      <Card>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            void handleSubmit(e);
          }}
        >
          <label className="flex flex-col gap-1 text-sm font-medium text-white/70">
            Name
            <input
              className="rounded-lg border border-orbit-border bg-orbit-raised px-3 py-2 text-sm text-white focus:outline-none focus:border-orbit-violet/50"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
              }}
              autoComplete="name"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-white/70">
            Email
            <input
              type="email"
              className="rounded-lg border border-orbit-border bg-orbit-raised px-3 py-2 text-sm text-white focus:outline-none focus:border-orbit-violet/50"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
              }}
              autoComplete="email"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-white/70">
            Language
            <select
              className="rounded-lg border border-orbit-border bg-orbit-raised px-3 py-2 text-sm text-white focus:outline-none focus:border-orbit-violet/50"
              value={language}
              onChange={(e) => {
                setLanguage(e.target.value);
              }}
            >
              <option value="en">English</option>
              <option value="es">Español</option>
              <option value="pt">Português</option>
            </select>
          </label>

          <div className="border-t border-orbit-border pt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/40">
              Managed by Stellar Orbit
            </p>
            <dl className="mt-3 space-y-3 text-sm">
              <div>
                <dt className="text-white/40">Wallet address</dt>
                <dd className="mt-0.5 font-mono text-white/70" title={user.stellarPublicKey}>
                  {truncateMiddle(user.stellarPublicKey)}
                </dd>
              </div>
              <div>
                <dt className="text-white/40">Country</dt>
                <dd className="mt-0.5 font-medium">{user.countryCode}</dd>
              </div>
              <div>
                <dt className="text-white/40">Chapter</dt>
                <dd className="mt-0.5 font-medium">{user.chapter.name}</dd>
              </div>
            </dl>
          </div>

          <Button type="submit" disabled={busy}>
            {busy ? "Saving…" : "Save changes"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
