import tseslint from "typescript-eslint";
import prettier from "eslint-plugin-prettier";
import prettierRecommended from "eslint-plugin-prettier/recommended";
import eslint from "@eslint/js";

export default tseslint.config(
    {
        ignores: [
            "packages/*/lib/",
            "packages/*/.rollup.cache/",
            "website/.vitepress/dist/",
            "website/.vitepress/cache/",
            "website/dev-dist/"
        ]
    },
    eslint.configs.recommended,
    prettierRecommended,
    ...tseslint.configs.recommended,
    {
        plugins: {
            prettier
        },
        rules: {
            "prettier/prettier": "error",
            "no-console": "error",
            "@typescript-eslint/no-explicit-any": "off",
            "@typescript-eslint/no-non-null-assertion": "off",
            "@typescript-eslint/no-namespace": "off",
            "@typescript-eslint/consistent-type-imports": "error",

            "@typescript-eslint/no-unused-vars": [
                "error",
                {
                    argsIgnorePattern: "^_"
                }
            ],

            "no-async-promise-executor": "off"
        }
    }
);
