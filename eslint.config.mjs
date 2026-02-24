import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "cdk/**",
      "cypress/**",
      "playwright-report/**",
      "test-results/**",
      "e2e/**",
      "scripts/**",
      "*.config.js",
      "*.config.backup.js",
      "*.setup.js",
      "jest.*.js",
    ],
  },
];

export default eslintConfig;
