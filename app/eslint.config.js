// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'android/*', 'ios/*'],
  },
  {
    // The end-to-end scripts install playwright-core only when they run (e2e/README.md: "not a dependency of the app").
    files: ['e2e/**'],
    rules: { 'import/no-unresolved': ['error', { ignore: ['^playwright-core$'] }] },
  },
]);
