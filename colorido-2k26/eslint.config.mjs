import { defineConfig } from "eslint/config";
import nextVitals from "eslint-config-next";
import nextTypescript from "typescript-eslint";

const eslintConfig = defineConfig([
  ...nextVitals.coreWebVitals,
  ...nextTypescript.configs.recommended,
  {
    ignores: [".next/**", "out/**", "node_modules/**", "next-env.d.ts"],
  },
]);

export default eslintConfig;
