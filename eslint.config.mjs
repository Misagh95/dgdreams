import { defineConfig, globalIgnores } from "eslint/config";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

export default defineConfig([
  // Keep the starter on the flat config export that actually runs under the pinned ESLint/Next toolchain.
  ...nextCoreWebVitals,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "docs/**/.vitepress/dist/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      // These rules reject established data-loading and hydration effects in
      // this app. The effects are intentional and remain covered by the
      // exhaustive-deps rule.
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/purity": "off",
      "react-hooks/refs": "off",
    },
  },
]);
