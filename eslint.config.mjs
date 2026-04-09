import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["**/dist/**", "**/coverage/**", "**/.turbo/**", "**/node_modules/**"]
  },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    files: ["**/*.ts"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname
      }
    },
    rules: {
      "@typescript-eslint/consistent-type-imports": ["error", { "prefer": "type-imports" }],
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": "error",
      "@typescript-eslint/require-await": "error"
    }
  },
  {
    files: ["packages/domain/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          "patterns": ["@codex-blog/application*", "@codex-blog/infrastructure*", "@codex-blog/contracts*", "express", "@prisma/*"]
        }
      ]
    }
  },
  {
    files: ["packages/application/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          "patterns": ["@codex-blog/infrastructure*", "express", "@prisma/*"]
        }
      ]
    }
  },
  {
    files: ["packages/infrastructure/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          "patterns": ["express"]
        }
      ]
    }
  },
  {
    files: ["apps/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          "patterns": [
            {
              "group": ["@codex-blog/domain/src/*", "@codex-blog/application/src/*", "@codex-blog/infrastructure/src/*"],
              "message": "Apps must consume package public APIs only."
            }
          ]
        }
      ]
    }
  }
);
