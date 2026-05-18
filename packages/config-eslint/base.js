import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier";

/**
 * @param {{ tsconfigRootDir: string }} options
 */
export function createBaseConfig(options) {
  const { tsconfigRootDir } = options;

  return tseslint.config(
    {
      ignores: [
        "**/dist/**",
        "**/node_modules/**",
        "**/.next/**",
        "**/eslint.config.mjs",
        "**/next-env.d.ts",
        "**/*.config.mjs",
      ],
    },
    js.configs.recommended,
    ...tseslint.configs.strictTypeChecked,
    {
      languageOptions: {
        globals: { ...globals.node },
        parserOptions: {
          projectService: true,
          tsconfigRootDir,
        },
      },
    },
    eslintConfigPrettier,
    {
      rules: {
        "@typescript-eslint/consistent-type-imports": [
          "error",
          { prefer: "type-imports", fixStyle: "separate-type-imports" },
        ],
      },
    },
  );
}
