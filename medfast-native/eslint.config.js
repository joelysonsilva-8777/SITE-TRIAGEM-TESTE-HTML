const { defineConfig } = require("eslint/config");
const expo = require("eslint-config-expo/flat");
module.exports = defineConfig([
  expo,
  {
    files: ["**/*.cjs", "metro.config.js"],
    languageOptions: {
      sourceType: "commonjs",
      globals: { __dirname: "readonly", __filename: "readonly" },
    },
  },
  { ignores: ["dist/**", ".tmp/**", ".cache/**", "test-results/**"] },
]);
