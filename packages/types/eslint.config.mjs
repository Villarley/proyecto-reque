import path from "node:path";
import { fileURLToPath } from "node:url";
import { createBaseConfig } from "@stellar-orbit/config-eslint/base";

const tsconfigRootDir = path.dirname(fileURLToPath(import.meta.url));

export default createBaseConfig({ tsconfigRootDir });
