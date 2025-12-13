import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import { defineConfig } from "eslint/config";

export default defineConfig([
  // 🔴 IGNORAR ARQUIVOS QUE NÃO SÃO CÓDIGO DA APP
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.angular/**",
      "**/*.config.js",
      "**/*.config.cjs",
      "**/*.config.mjs",
      "**/postcss.config.cjs",
      "**/tailwind.config.cjs",
      "**/eslint.config.*",
    ],
  },

  {
    files: ["**/*.{ts, html, css}"],
    languageOptions: { globals: globals.browser },
    rules: {
      ...js.configs.recommended.rules,
    },
  },

  tseslint.configs.recommended,
]);
