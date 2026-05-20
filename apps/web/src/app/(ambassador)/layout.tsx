"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@stellar-orbit/ui";
import { useSession } from "@/hooks/useSession";
import { useApi } from "@/hooks/useApi";
import { disconnect } from "@/lib/stellar";
import type { Notification } from "@stellar-orbit/types";

type NotificationsResponse = {
  notifications: Notification[];
};

const nav = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/events", label: "Events" },
  { href: "/checkin", label: "Check In" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/notifications", label: "Notifications" },
  { href: "/profile", label: "Profile" },
] as const;

function truncateMiddle(value: string, left = 6, right = 4): string {
  if (value.length <= left + right) {
    return value;
  }
  return `${value.slice(0, left)}…${value.slice(-right)}`;
}

function NotificationsNavBadge() {
  const { data } = useApi<NotificationsResponse>(["notifications"], "/notifications");
  const unread =
    data?.notifications.filter((n) => n.readAt === null).length ?? 0;
  if (unread === 0) {
    return null;
  }
  return (
    <span className="ml-auto inline-flex min-w-[1.25rem] justify-center rounded-full px-1.5 text-[10px] font-bold text-white [background:linear-gradient(135deg,#7C3AED,#4F46E5)]">
      {unread > 99 ? "99+" : unread}
    </span>
  );
}

export default function AmbassadorLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const session = useSession();
  const [walletDisplay, setWalletDisplay] = useState("");
  const [fullPk, setFullPk] = useState("");

  useEffect(() => {
    if (session === null) {
      router.replace("/login");
    }
  }, [session, router]);

  useEffect(() => {
    if (session === undefined || session === null) {
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

  if (session === null) {
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
          <p className="text-sm font-semibold text-white">Ambassador</p>
        </div>
        <nav className="flex flex-col gap-0.5 p-2">
          {nav.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium ${
                  active
                    ? "bg-orbit-violet/15 text-orbit-violet-light"
                    : "text-white/50 hover:bg-orbit-raised hover:text-white"
                }`}
              >
                {item.label}
                {item.href === "/notifications" ? <NotificationsNavBadge /> : null}
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
