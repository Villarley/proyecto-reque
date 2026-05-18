import {
  StellarWalletsKit as StellarWalletsKitSdk,
  Networks,
} from "@creit-tech/stellar-wallets-kit";
import { FreighterModule } from "@creit-tech/stellar-wallets-kit/modules/freighter";
import { xBullModule } from "@creit-tech/stellar-wallets-kit/modules/xbull";
import { AlbedoModule } from "@creit-tech/stellar-wallets-kit/modules/albedo";
import { RabetModule } from "@creit-tech/stellar-wallets-kit/modules/rabet";
import { Keypair } from "@stellar/stellar-sdk";
import { Buffer } from "buffer";

/** Re-export with a merged type/constructor name for consumers. */
export const StellarWalletsKit = StellarWalletsKitSdk;
export type StellarWalletsKit = typeof StellarWalletsKitSdk;

export { Networks };
export { FREIGHTER_ID } from "@creit-tech/stellar-wallets-kit/modules/freighter";
export { XBULL_ID } from "@creit-tech/stellar-wallets-kit/modules/xbull";
export { ALBEDO_ID } from "@creit-tech/stellar-wallets-kit/modules/albedo";
export { RABET_ID } from "@creit-tech/stellar-wallets-kit/modules/rabet";
export { FreighterModule, xBullModule, AlbedoModule, RabetModule };

function toKitNetwork(network: "MAINNET" | "TESTNET"): Networks {
  return network === "MAINNET" ? Networks.PUBLIC : Networks.TESTNET;
}

function defaultWalletModules() {
  return [
    new FreighterModule(),
    new xBullModule(),
    new AlbedoModule(),
    new RabetModule(),
  ];
}

/**
 * Configures the global kit with all bundled extension modules (Freighter, xBull, Albedo, Rabet).
 * Safe to call multiple times; applies the latest network and module list.
 */
export function createWalletKit(
  network: "MAINNET" | "TESTNET" = "TESTNET",
): StellarWalletsKit {
  StellarWalletsKitSdk.init({
    modules: defaultWalletModules(),
    network: toKitNetwork(network),
  });
  return StellarWalletsKitSdk;
}

export class WalletKitBrowserError extends Error {
  constructor(message = "Wallet actions must run in the browser.") {
    super(message);
    this.name = "WalletKitBrowserError";
  }
}

export class WalletKitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WalletKitError";
  }
}

function ensureBrowser(): void {
  if (typeof globalThis.window === "undefined") {
    throw new WalletKitBrowserError();
  }
}

function readKitErrorMessage(err: unknown): string {
  if (typeof err === "object" && err !== null && "message" in err) {
    const message = (err as { message?: unknown }).message;
    if (typeof message === "string" && message.length > 0) {
      return message;
    }
  }
  return "Wallet error";
}

function wrapKitCall<T>(p: Promise<T>): Promise<T> {
  return p.catch((err: unknown) => {
    throw new WalletKitError(readKitErrorMessage(err));
  });
}

/**
 * Opens the kit wallet picker / auth modal and resolves with the connected Stellar address.
 */
export async function connectWallet(kit: StellarWalletsKit): Promise<string> {
  ensureBrowser();
  ensureSingletonInitialized();
  const { address } = await wrapKitCall(kit.authModal());
  return address;
}

/**
 * Signs an arbitrary challenge string with the active wallet; returns a base64 signature.
 * When `address` is set (e.g. from `connectWallet`), it is passed to the kit so wallets like Freighter sign with that account.
 */
export async function signChallenge(
  kit: StellarWalletsKit,
  message: string,
  address?: string,
): Promise<string> {
  ensureBrowser();
  const { signedMessage } = await wrapKitCall(
    address ? kit.signMessage(message, { address }) : kit.signMessage(message),
  );
  if (!signedMessage) {
    throw new WalletKitError("Wallet returned an empty signature.");
  }
  // Freighter may return the signature as hex; normalise to base64 for the API.
  const isHex = /^[0-9a-fA-F]+$/.test(signedMessage) && signedMessage.length % 2 === 0;
  return isHex
    ? Buffer.from(signedMessage, "hex").toString("base64")
    : signedMessage;
}

/**
 * Returns the public key currently held in the kit (no modal). Requires a prior successful connection.
 */
export async function getPublicKey(kit: StellarWalletsKit): Promise<string> {
  ensureBrowser();
  const { address } = await wrapKitCall(kit.getAddress());
  return address;
}

export function verifySignature(params: {
  publicKey: string;
  message: string;
  signatureBase64: string;
}): boolean {
  try {
    const keypair = Keypair.fromPublicKey(params.publicKey);
    const payload = Buffer.from(params.message, "utf8");
    const signature = Buffer.from(params.signatureBase64, "base64");
    return keypair.verify(payload, signature);
  } catch {
    return false;
  }
}

/** Shared kit (static API in v2.x), default module list applied via {@link createWalletKit} / {@link setWalletKitNetwork}. */
export const WalletKitSingleton: StellarWalletsKit = StellarWalletsKitSdk;

let singletonNetwork: "MAINNET" | "TESTNET" = "TESTNET";
let singletonInited = false;

function ensureSingletonInitialized(): void {
  if (singletonInited) {
    return;
  }
  createWalletKit(singletonNetwork);
  singletonInited = true;
}

export function setWalletKitNetwork(network: "MAINNET" | "TESTNET"): void {
  singletonNetwork = network;
  if (typeof globalThis.window !== "undefined") {
    ensureSingletonInitialized();
    StellarWalletsKitSdk.setNetwork(toKitNetwork(network));
  }
}

export function ensureWalletKitSingletonReady(): void {
  if (typeof globalThis.window !== "undefined") {
    ensureSingletonInitialized();
  }
}
