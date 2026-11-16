/**
 * APK size (TRACKER A63, 2026-11-15): llama.rn ships Qualcomm Hexagon DSP kernels as assets (assets/ggml-hexagon, ~5 MB)
 * for its experimental Hexagon/OpenCL build, which this app leaves out (see app.json expo-build-properties excludes).
 * Without that build nothing loads these files, so they're kept out of the APK too.
 *
 * And only 64-bit ARM (arm64-v8a), the processor in every phone Bayani-1 can run on (2026-11-16): `expo prebuild`
 * writes all four architectures into gradle.properties, which put 32-bit ARM and both emulator builds back in the APK
 * (48 MB became 91 MB). Set here so it survives every prebuild.
 */
const { withAppBuildGradle, withGradleProperties } = require("expo/config-plugins");

module.exports = function withoutHexagonAssets(config) {
  config = withAppBuildGradle(config, (c) => {
    if (!c.modResults.contents.includes("!<dir>ggml-hexagon")) {
      c.modResults.contents = c.modResults.contents.replace(/ignoreAssetsPattern '([^']*)'/, (_m, p) => `ignoreAssetsPattern '${p}:!<dir>ggml-hexagon'`);
    }
    return c;
  });
  return withGradleProperties(config, (c) => {
    const at = c.modResults.findIndex((x) => x.type === "property" && x.key === "reactNativeArchitectures");
    const prop = { type: "property", key: "reactNativeArchitectures", value: "arm64-v8a" };
    if (at >= 0) c.modResults[at] = prop; else c.modResults.push(prop);
    return c;
  });
};
