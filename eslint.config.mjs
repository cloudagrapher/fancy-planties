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
      "coverage/**",
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
      // Ignore minified service worker build artifacts in public/
      "public/custom-sw.js",
      "public/workbox-*.js",
      "public/sw.js",
    ],
  },
  {
    rules: {
      // Allow unused variables/args prefixed with _ (standard convention for intentionally unused params)
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
        },
      ],
    },
  },
  // Relax rules for test files — `any` types and require() are common in mocks/fixtures
  {
    files: [
      "src/test-utils/**",
      "src/__tests__/**",
      "**/*.test.{ts,tsx,js,jsx}",
      "**/*.spec.{ts,tsx,js,jsx}",
    ],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-require-imports": "off",
      "@next/next/no-assign-module-variable": "off",
    },
  },
];

export default eslintConfig;
