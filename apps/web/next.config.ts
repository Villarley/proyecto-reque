import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const monorepoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");

const nextConfig: NextConfig = {
  transpilePackages: [
    "@stellar-orbit/ui",
    "@stellar-orbit/types",
    "@stellar-orbit/stellar",
    "@creit-tech/stellar-wallets-kit",
  ],
  outputFileTracingRoot: monorepoRoot,
};

export default nextConfig;
