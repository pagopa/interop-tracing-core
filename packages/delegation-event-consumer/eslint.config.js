import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import prettierPlugin from "eslint-plugin-prettier";
import eslintRecommended from "@eslint/js";
import { configs as tsConfigs } from "@typescript-eslint/eslint-plugin";
import prettierConfig from "eslint-config-prettier";
import globals from "globals";

export default [
  {
    files: ["**/*.ts", "**/*.tsx"],
    ignores: [
      "**/dist",
      "**/node_modules",
      "**/src/model/generated/*.ts",
      "vitest.config.ts",
    ],
    languageOptions: {
      globals: {
        ...globals.node,
      },
      parser: tsParser,
      parserOptions: {
        project: "./tsconfig.json",
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
      prettier: prettierPlugin,
    },
    rules: {
      ...eslintRecommended.configs.recommended.rules,
      ...tsConfigs["eslint-recommended"].rules,
      ...tsConfigs.recommended.rules,
      ...prettierConfig.rules,
      "prettier/prettier": "error",
      "@typescript-eslint/switch-exhaustiveness-check": "error",
      "default-case": "off",
      "prefer-arrow/prefer-arrow-functions": "off",
      eqeqeq: ["error", "smart"],
      "@typescript-eslint/consistent-type-definitions": "off",
      "sort-keys": "off",
      "functional/prefer-readonly-type": "off",
      "@typescript-eslint/no-shadow": "off",
      "extra-rules/no-commented-out-code": "off",
      "max-lines-per-function": "off",
      "@typescript-eslint/naming-convention": "off",
      "@typescript-eslint/no-use-before-define": "off",
      "@typescript-eslint/await-thenable": "off",
      "no-redeclare": "off",
      "no-import-assign": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
];
