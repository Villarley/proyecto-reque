"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@stellar-orbit/ui";
import { disconnect } from "@/lib/stellar";
import { apiFetchWithAuth } from "@/lib/api";
import { useSession } from "@/hooks/useSession";
import { useI18n } from "@/i18n/I18nProvider";
import { BrandLogo } from "@/components/BrandLogo";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

function truncateMiddle(value: string, left = 6, right = 4): string {
  if (value.length <= left + right) {
    return value;
  }
  return `${value.slice(0, left)}…${value.slice(-right)}`;
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const session = useSession();
  const { t } = useI18n();
  const [walletDisplay, setWalletDisplay] = useState("");
  const [fullPk, setFullPk] = useState("");

  const nav = [
    { href: "/admin/analytics", label: t.nav.analytics },
    { href: "/admin/users", label: t.nav.users },
    { href: "/admin/levels", label: t.nav.levelConfig },
    { href: "/admin/chapters", label: t.nav.chapters },
    { href: "/admin/profile", label: t.nav.profile },
  ] as const;

  useEffect(() => {
    if (session === null) {
      router.replace("/login");
      return;
    }
    if (session === undefined) return;
    if (session.role !== "global_admin") {
      router.replace(session.role === "country_lead" ? "/cl/events" : "/dashboard");
      return;
    }
    const token = window.localStorage.getItem("stellar-orbit.sessionToken") ?? "";
    void apiFetchWithAuth<{ profileComplete: boolean }>(token, "/profile/me")
      .then((res) => { if (!res.profileComplete) router.replace("/complete-profile"); })
      .catch(() => undefined);
  }, [session, router]);

  useEffect(() => {
    if (session === undefined || session === null || session.role !== "global_admin") {
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
      <div className="flex min-h-screen items-center justify-center text-sm text-orbit-text-2">
        {t.common.loading}
      </div>
    );
  }

  if (session === null || session.role !== "global_admin") {
    return null;
  }

  function onDisconnect() {
    disconnect();
    router.replace("/login");
  }

  return (
    <div className="flex min-h-screen bg-orbit-void text-orbit-text">
      <aside className="flex w-64 shrink-0 flex-col border-r border-orbit-border bg-white/95">
        <div className="border-b border-orbit-border px-5 py-5">
          <BrandLogo priority />
          <p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-orbit-text-3">
            {t.roles.global_admin}
          </p>
        </div>
        <nav className="flex flex-col gap-1.5 p-3">
          {nav.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-orbit-text text-white shadow-orbit-sm"
                    : "text-orbit-text-2 hover:bg-orbit-raised hover:text-orbit-text"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-end gap-3 border-b border-orbit-border bg-white/80 px-6 py-3 backdrop-blur">
          <LanguageSwitcher />
          <span
            className="font-mono text-sm text-orbit-text-2"
            title={fullPk || session.stellarPublicKey}
          >
            {walletDisplay || truncateMiddle(session.stellarPublicKey)}
          </span>
          <Button type="button" variant="secondary" onClick={onDisconnect}>
            {t.common.disconnect}
          </Button>
        </header>
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
