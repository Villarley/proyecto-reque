"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Card } from "@stellar-orbit/ui";
import { apiFetch, apiFetchWithAuth } from "@/lib/api";
import { BrandBadge } from "@/components/BrandLogo";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { connect, disconnect, getConnectedWalletLabel } from "@/lib/stellar";
import { useI18n } from "@/i18n/I18nProvider";
import { formatMessage } from "@/i18n/format";
import type { Messages } from "@/i18n/messages/en";

type ConnectResponse = {
  token: string;
  userId: string;
  role: string;
  chapterId: string;
  isNewUser: boolean;
};

type SelectRoleResponse = {
  token: string;
};

type RoleId = keyof Messages["roles"];

const ROLE_IDS: RoleId[] = ["ambassador", "country_lead", "global_admin"];

const ROLE_ICONS: Record<RoleId, string> = {
  ambassador: "◎",
  country_lead: "◈",
  global_admin: "◆",
};

export default function LoginPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [status, setStatus] = useState<string | null>(null);
  const [statusType, setStatusType] = useState<"error" | "success">("error");
  const [busy, setBusy] = useState(false);
  const [selectedRole, setSelectedRole] = useState<RoleId | null>(null);

  async function onConnect() {
    if (!selectedRole) return;

    setBusy(true);
    setStatus(null);
    try {
      const publicKey = await connect();

      const connectResult = await apiFetch<ConnectResponse>("/auth/connect", {
        method: "POST",
        body: JSON.stringify({ publicKey }),
      });

      const { token: initialToken } = connectResult;

      let finalToken: string;
      try {
        const selectResult = await apiFetchWithAuth<SelectRoleResponse>(
          initialToken,
          "/auth/select-role",
          {
            method: "POST",
            body: JSON.stringify({ role: selectedRole }),
          },
        );
        finalToken = selectResult.token;
      } catch {
        setStatus(
          formatMessage(t.login.errors.noAccess, { role: t.roles[selectedRole] }),
        );
        setStatusType("error");
        disconnect();
        return;
      }

      window.localStorage.setItem("stellar-orbit.sessionToken", finalToken);
      window.localStorage.setItem("stellar-orbit.publicKey", publicKey);

      const walletName = getConnectedWalletLabel();
      setStatus(
        formatMessage(t.login.signedInWith, {
          wallet: walletName,
          publicKey: `${publicKey.slice(0, 6)}…${publicKey.slice(-4)}`,
        }),
      );
      setStatusType("success");

      await new Promise<void>((resolve) => { window.setTimeout(resolve, 300); });

      router.push("/complete-profile");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : t.login.errors.failed);
      setStatusType("error");
      disconnect();
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-orbit-void px-6 py-12">
      <div className="flex w-full max-w-md flex-col gap-8">
        <header className="flex flex-col items-center gap-4">
          <div className="flex w-full items-center justify-between">
            <Button asChild variant="ghost" className="px-2 py-1 text-xs">
              <Link href="/">{t.common.back}</Link>
            </Button>
            <LanguageSwitcher />
          </div>
          <BrandBadge priority />
          <div className="text-center">
            <h1 className="text-2xl font-bold text-orbit-text">{t.login.title}</h1>
            <p className="mt-1 text-sm text-orbit-text-2">{t.login.subtitle}</p>
          </div>
        </header>

        <Card className="flex flex-col gap-6 p-6">
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-orbit-text-3">
              {t.login.signInAs}
            </p>
            <div className="flex flex-col gap-2">
              {ROLE_IDS.map((roleId) => {
                const isSelected = selectedRole === roleId;
                return (
                  <button
                    key={roleId}
                    type="button"
                    onClick={() => {
                      setSelectedRole(roleId);
                      setStatus(null);
                    }}
                    disabled={busy}
                    className={`flex items-start gap-3 rounded-lg border p-3 text-left transition-all duration-150 disabled:pointer-events-none disabled:opacity-50 ${
                      isSelected
                        ? "border-orbit-violet bg-orbit-violet/5 shadow-orbit-sm"
                        : "border-orbit-border bg-orbit-raised hover:border-orbit-border-accent"
                    }`}
                  >
                    <span className={`mt-0.5 text-base leading-none ${isSelected ? "text-orbit-violet" : "text-orbit-text-3"}`}>
                      {ROLE_ICONS[roleId]}
                    </span>
                    <span className="flex flex-col gap-0.5">
                      <span className={`text-sm font-semibold ${isSelected ? "text-orbit-violet" : "text-orbit-text"}`}>
                        {t.roles[roleId]}
                      </span>
                      <span className="text-xs text-orbit-text-2">
                        {t.login.roleDescriptions[roleId]}
                      </span>
                    </span>
                    {isSelected && <span className="ml-auto mt-0.5 text-orbit-violet">✓</span>}
                  </button>
                );
              })}
            </div>
          </div>

          <Button
            type="button"
            className="w-full"
            onClick={() => { void onConnect(); }}
            disabled={busy || !selectedRole}
          >
            {busy ? t.login.connecting : t.login.connectWallet}
          </Button>

          {status ? (
            <p
              className={`text-sm ${statusType === "success" ? "text-orbit-success" : "text-orbit-error"}`}
              role="status"
            >
              {status}
            </p>
          ) : null}
        </Card>
      </div>
    </main>
  );
}
