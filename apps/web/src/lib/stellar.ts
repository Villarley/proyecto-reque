"use client";

type StellarModule = typeof import("@stellar-orbit/stellar");

let stellarModulePromise: Promise<StellarModule> | null = null;
let lastWalletLabel = "Wallet";

function loadStellarModule(): Promise<StellarModule> {
  if (!stellarModulePromise) {
    stellarModulePromise = import("@stellar-orbit/stellar");
  }
  return stellarModulePromise;
}

function ensureBrowser(action: string): void {
  if (typeof window === "undefined") {
    throw new Error(`${action} must run in the browser.`);
  }
}

function updateWalletLabel(module: StellarModule): void {
  try {
    lastWalletLabel = module.WalletKitSingleton.selectedModule.productName;
  } catch {
    lastWalletLabel = "Wallet";
  }
}

export async function connect(): Promise<string> {
  ensureBrowser("Connect wallet");
  const module = await loadStellarModule();
  module.ensureWalletKitSingletonReady();
  const address = await module.connectWallet(module.WalletKitSingleton);
  updateWalletLabel(module);
  return address;
}

export async function signChallengeMessage(
  message: string,
  address?: string,
): Promise<string> {
  ensureBrowser("Sign challenge");
  const module = await loadStellarModule();
  module.ensureWalletKitSingletonReady();
  return module.signChallenge(module.WalletKitSingleton, message, address);
}

export function disconnect(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.removeItem("stellar-orbit.sessionToken");
  window.localStorage.removeItem("stellar-orbit.publicKey");
  lastWalletLabel = "Wallet";
  void loadStellarModule()
    .then((module) => module.WalletKitSingleton.disconnect())
    .catch(() => {});
}

export async function readPublicKey(): Promise<string> {
  ensureBrowser("readPublicKey");
  const module = await loadStellarModule();
  module.ensureWalletKitSingletonReady();
  const { address } = await module.WalletKitSingleton.getAddress();
  updateWalletLabel(module);
  return address;
}

export function getConnectedWalletLabel(): string {
  return lastWalletLabel;
}
