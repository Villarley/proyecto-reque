"use client";

import {
  WalletKitSingleton,
  connectWallet,
  ensureWalletKitSingletonReady,
  signChallenge,
} from "@stellar-orbit/stellar";

export { WalletKitSingleton as walletKit };

export async function connect(): Promise<string> {
  if (typeof window === "undefined") {
    throw new Error("Connect wallet must run in the browser.");
  }
  ensureWalletKitSingletonReady();
  return connectWallet(WalletKitSingleton);
}

export async function signChallengeMessage(
  message: string,
  address?: string,
): Promise<string> {
  if (typeof window === "undefined") {
    throw new Error("Sign challenge must run in the browser.");
  }
  ensureWalletKitSingletonReady();
  return signChallenge(WalletKitSingleton, message, address);
}

export function disconnect(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.removeItem("stellar-orbit.sessionToken");
  window.localStorage.removeItem("stellar-orbit.publicKey");
  void WalletKitSingleton.disconnect().catch(() => {});
}

export async function readPublicKey(): Promise<string> {
  if (typeof window === "undefined") {
    throw new Error("readPublicKey must run in the browser.");
  }
  ensureWalletKitSingletonReady();
  const { address } = await WalletKitSingleton.getAddress();
  return address;
}

/** Best-effort label from the active kit module after a successful connection. */
export function getConnectedWalletLabel(): string {
  try {
    return WalletKitSingleton.selectedModule.productName;
  } catch {
    return "Wallet";
  }
}
