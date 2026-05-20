"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@stellar-orbit/ui";
import { disconnect } from "@/lib/stellar";
import { useSession } from "@/hooks/useSession";

const nav = [
  { href: "/cl/events", label: "Events" },
  { href: "/cl/attendance", label: "Attendance" },
  { href: "/cl/points", label: "Points" },
  { href: "/cl/announcements", label: "Announcements" },
] as const;

function truncateMiddle(value: string, left = 6, right = 4): string {
  if (value.length <= left + right) {
    return value;
  }
  return `${value.slice(0, left)}…${value.slice(-right)}`;
}

export default function CountryLeadLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const session = useSession();
  const [walletDisplay, setWalletDisplay] = useState("");
  const [fullPk, setFullPk] = useState("");

  useEffect(() => {
    if (session === null) {
      router.replace("/login");
      return;
    }
    if (session && session.role !== "country_lead") {
      if (session.role === "global_admin") {
        router.replace("/admin/analytics");
        return;
      }
      router.replace("/dashboard");
    }
  }, [session, router]);

  useEffect(() => {
    if (session === undefined || session === null || session.role !== "country_lead") {
      return;
    }
    const storedPk =
      window.localStorage.getItem("stellar-orbit.publicKey") ??
      session.stellarPublicKey;
    setFullPk(storedPk);
    setWalletDisplay(truncateMiddle(storedPk));
  }, [session]);

  if (session === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-white/50">
        Loading…
      </div>
    );
  }

  if (session === null || session.role !== "country_lead") {
    return null;
  }

  function onDisconnect() {
    disconnect();
    router.replace("/login");
  }

  return (
    <div className="flex min-h-screen bg-orbit-void text-orbit-text">
      <aside className="flex w-56 shrink-0 flex-col border-r border-orbit-border bg-orbit-surface">
        <div className="border-b border-orbit-border px-4 py-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-white/40">
            Stellar Orbit
          </p>
          <p className="text-sm font-semibold text-white">Country Lead</p>
        </div>
        <nav className="flex flex-col gap-0.5 p-2">
          {nav.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-md px-3 py-2 text-sm font-medium ${
                  active
                    ? "bg-orbit-violet/15 text-orbit-violet-light"
                    : "text-white/50 hover:bg-orbit-raised hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-end gap-3 border-b border-orbit-border bg-orbit-surface px-6 py-3">
          <span
            className="font-mono text-sm text-white/50"
            title={fullPk || session.stellarPublicKey}
          >
            {walletDisplay || truncateMiddle(session.stellarPublicKey)}
          </span>
          <Button type="button" variant="secondary" onClick={onDisconnect}>
            Disconnect
          </Button>
        </header>
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
