import prettierPlugin from "eslint-plugin-prettier";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import eslintRecommended from "@eslint/js";
import { configs as tsConfigs } from "@typescript-eslint/eslint-plugin";
import prettierConfig from "eslint-config-prettier";
import globals from "globals";

export default [
  {
    ignores: [
      "**/dist/**",
      "**/dist",
      "**/node_modules/**",
      "**/src/model/generated/*.ts",
      "vitest.config.ts",
    ],
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
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
      "no-unused-vars": "off",
      "no-console": "error",
      "@typescript-eslint/no-non-null-assertion": "error",
      "max-classes-per-file": ["error", 1],
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
];
