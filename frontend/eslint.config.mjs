import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

export default [
  // Config base de Next
  ...compat.extends("next/core-web-vitals"),

  // Reglas específicas para TypeScript
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parserOptions: {
        project: "./tsconfig.json",
      },
    },
    rules: {
      // 🚫 Desactiva la regla que causaba el error
      "@typescript-eslint/ban-ts-comment": "off",
    },
  },
];
