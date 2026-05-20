import path from "node:path";
import { fileURLToPath } from "node:url";
import { createNextConfig } from "@stellar-orbit/config-eslint/next";

const tsconfigRootDir = path.dirname(fileURLToPath(import.meta.url));

export default createNextConfig({ tsconfigRootDir });
