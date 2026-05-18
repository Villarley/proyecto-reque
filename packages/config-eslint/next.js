import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";
import { createBaseConfig } from "./base.js";

/**
 * @param {{ tsconfigRootDir: string }} options
 */
export function createNextConfig(options) {
  const base = createBaseConfig(options);

  return tseslint.config(
    ...base,
    {
      languageOptions: {
        globals: { ...globals.browser },
      },
    },
    react.configs.flat.recommended,
    react.configs.flat["jsx-runtime"],
    reactHooks.configs["recommended-latest"],
    {
      settings: { react: { version: "detect" } },
      rules: {
        "react/react-in-jsx-scope": "off",
      },
    },
  );
}
