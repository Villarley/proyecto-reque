"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Card } from "@stellar-orbit/ui";
import { apiFetch, apiFetchWithAuth } from "@/lib/api";
import { connect, disconnect, getConnectedWalletLabel } from "@/lib/stellar";

type ConnectResponse = {
  token: string;
  userId: string;
  role: string;
  chapterId: string;
};

type SelectRoleResponse = {
  token: string;
};

const ROLE_LABELS: Record<string, string> = {
  global_admin: "Global Admin",
  country_lead: "Country Lead",
  ambassador: "Ambassador",
};

function rolesForPicker(backendRole: string): string[] {
  if (backendRole === "global_admin") {
    return ["global_admin", "country_lead", "ambassador"];
  }
  if (backendRole === "country_lead") {
    return ["country_lead", "ambassador"];
  }
  return [];
}

function roleBasedRedirect(role: string): string {
  switch (role) {
    case "country_lead":
      return "/cl/events";
    case "global_admin":
      return "/admin/analytics";
    case "ambassador":
    default:
      return "/dashboard";
  }
}

export default function LoginPage() {
  const router = useRouter();
  const [status, setStatus] = useState<string | null>(null);
  const [countryCode, setCountryCode] = useState("US");
  const [busy, setBusy] = useState(false);
  const [pendingToken, setPendingToken] = useState<string | null>(null);
  const [availableRoles, setAvailableRoles] = useState<string[]>([]);
  /** Wallet key from connect; kept until session is finalized (needed when deferring token storage). */
  const pendingPublicKeyRef = useRef<string | null>(null);

  async function redirectAfterAuth(role: string, publicKey: string) {
    const walletName = getConnectedWalletLabel();
    setStatus(
      `Signed in with ${walletName} (${publicKey.slice(0, 6)}…${publicKey.slice(-4)}). Redirecting…`,
    );
    await new Promise<void>((resolve) => {
      window.setTimeout(() => {
        resolve();
      }, 450);
    });
    router.push(roleBasedRedirect(role));
  }

  async function onConnect() {
    setBusy(true);
    setStatus(null);
    try {
      const publicKey = await connect();
      const result = await apiFetch<ConnectResponse>("/auth/connect", {
        method: "POST",
        body: JSON.stringify({ publicKey, countryCode }),
      });

      const { token, role } = result;

      if (role === "country_lead" || role === "global_admin") {
        pendingPublicKeyRef.current = publicKey;
        setPendingToken(token);
        setAvailableRoles(rolesForPicker(role));
        return;
      }

      window.localStorage.setItem("stellar-orbit.sessionToken", token);
      window.localStorage.setItem("stellar-orbit.publicKey", publicKey);
      await redirectAfterAuth(role, publicKey);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Authentication failed.");
      disconnect();
    } finally {
      setBusy(false);
    }
  }

  async function selectRole(role: string) {
    const token = pendingToken;
    const publicKey = pendingPublicKeyRef.current;
    if (!token || !publicKey) {
      return;
    }

    setBusy(true);
    setStatus(null);
    try {
      const result = await apiFetchWithAuth<SelectRoleResponse>(token, "/auth/select-role", {
        method: "POST",
        body: JSON.stringify({ role }),
      });

      window.localStorage.setItem("stellar-orbit.sessionToken", result.token);
      window.localStorage.setItem("stellar-orbit.publicKey", publicKey);

      setPendingToken(null);
      setAvailableRoles([]);
      pendingPublicKeyRef.current = null;

      await redirectAfterAuth(role, publicKey);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not select role.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <div className="flex w-full max-w-sm flex-col gap-8">
        <header className="flex flex-col gap-5">
          <Button
            asChild
            variant="ghost"
            className="self-start px-2 py-1 text-xs font-medium text-white/60 hover:text-white/90"
          >
            <Link href="/">← Back</Link>
          </Button>
          <div className="mx-auto flex size-12 items-center justify-center rounded-xl shadow-orbit-md [background:linear-gradient(135deg,#7C3AED,#4F46E5,#1DB8C6)]">
            <span className="text-xl text-white">✦</span>
          </div>
          <h1 className="gradient-text text-center text-3xl font-bold">Connect Wallet</h1>
          <p className="text-center text-sm text-white/50">
            Select your wallet to join the Stellar Orbit community.
          </p>
        </header>

        <Card className="flex w-full flex-col gap-4">
          {!pendingToken ? (
            <>
              <label className="flex flex-col gap-2">
                <span className="text-xs text-white/60">
                  Country (ISO-3166 alpha-2)
                </span>
                <input
                  className="w-full rounded-lg border border-orbit-border bg-orbit-raised px-3 py-2 text-sm text-white backdrop-blur-sm focus:border-orbit-violet/50 focus:outline-none"
                  value={countryCode}
                  onChange={(e) => {
                    setCountryCode(e.target.value.toUpperCase());
                  }}
                  maxLength={2}
                />
              </label>
              <Button
                type="button"
                className="w-full"
                onClick={() => {
                  void onConnect();
                }}
                disabled={busy}
              >
                {busy ? "Connecting…" : "Connect Wallet"}
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm font-medium text-white/70">Enter as:</p>
              <div className="flex flex-col gap-2">
                {availableRoles.map((r) => (
                  <Button
                    key={r}
                    type="button"
                    className="w-full"
                    disabled={busy}
                    onClick={() => {
                      void selectRole(r);
                    }}
                  >
                    {ROLE_LABELS[r] ?? r}
                  </Button>
                ))}
              </div>
            </>
          )}
          {status ? (
            <p
              className={
                status.includes("Signed in")
                  ? "text-sm text-orbit-stellar"
                  : "text-sm text-red-400"
              }
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
