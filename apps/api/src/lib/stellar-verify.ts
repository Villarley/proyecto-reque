import { createHash } from "crypto";
import { Keypair } from "@stellar/stellar-sdk";

export function verifyStellarSignature(params: {
  publicKey: string;
  message: string;
  signatureBase64: string;
}): boolean {
  console.log(
    "[AUTH DEBUG] publicKey:",
    params.publicKey.slice(0, 10) + "...",
  );
  console.log(
    "[AUTH DEBUG] sig (first 40):",
    params.signatureBase64.slice(0, 40),
  );
  console.log(
    "[AUTH DEBUG] isHex:",
    /^[0-9a-fA-F]+$/.test(params.signatureBase64) &&
      params.signatureBase64.length % 2 === 0,
  );
  console.log("[AUTH DEBUG] sigLength:", params.signatureBase64.length);

  try {
    const keypair = Keypair.fromPublicKey(params.publicKey);
    const messageBuffer = Buffer.from(params.message, "utf8");
    const signatureBuffer = Buffer.from(params.signatureBase64, "base64");
    const result = keypair.verify(messageBuffer, signatureBuffer);
    console.log("[AUTH DEBUG] verify result:", result);

    const sha256Bytes = createHash("sha256")
      .update(Buffer.from(params.message, "utf8"))
      .digest();
    const verifySha256 = keypair.verify(sha256Bytes, signatureBuffer);
    console.log("[AUTH DEBUG] verify(sha256) result:", verifySha256);

    return result;
  } catch (e) {
    console.log("[AUTH DEBUG] threw:", e);
    return false;
  }
}
