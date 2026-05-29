// eslint.config.js
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
    settings: {
      "import/resolver": {
        typescript: {
          alwaysTryTypes: true,
          project: "./tsconfig.json",
        },
        node: {
          extensions: [".js", ".jsx", ".ts", ".tsx", ".json"],
          paths: ["src", "app"],
        },
        alias: {
          map: [
            ["@", "./src"],
            ["@", "./app"],
          ],
          extensions: [".js", ".jsx", ".ts", ".tsx", ".json", ".svg"],
        },
      },
    },
    rules: {
      "import/no-named-as-default": "off",
    },
  },
]);