/**
 * APK size (TRACKER A63, 2026-11-15): llama.rn ships Qualcomm Hexagon DSP kernels as assets (assets/ggml-hexagon, ~5 MB)
 * for its experimental Hexagon/OpenCL build, which this app leaves out (see app.json expo-build-properties excludes).
 * Without that build nothing loads these files, so they're kept out of the APK too.
 */
const { withAppBuildGradle } = require("expo/config-plugins");

module.exports = function withoutHexagonAssets(config) {
  return withAppBuildGradle(config, (c) => {
    if (!c.modResults.contents.includes("!<dir>ggml-hexagon")) {
      c.modResults.contents = c.modResults.contents.replace(/ignoreAssetsPattern '([^']*)'/, (_m, p) => `ignoreAssetsPattern '${p}:!<dir>ggml-hexagon'`);
    }
    return c;
  });
};
