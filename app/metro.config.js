// Bundles Bayanihan Core and BIX from the monorepo, resolving every package from this app's
// node_modules so React and friends are never duplicated (see the mobile-app lesson in Dasig).
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");
const projectRoot = __dirname;
const repoRoot = path.resolve(projectRoot, "../..");
const config = getDefaultConfig(projectRoot);
config.watchFolders = [path.join(repoRoot, "packages/core"), path.join(repoRoot, "bix")];
config.resolver.nodeModulesPaths = [path.join(projectRoot, "node_modules")];
// Hierarchical lookup stays on (nested deps need it); no react exists at the repo root, so it cannot duplicate.
// Core is written with ".js" import specifiers (TypeScript NodeNext style); map them to the .ts sources.
const defaultResolve = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const resolve = defaultResolve ?? context.resolveRequest;
  if (moduleName.startsWith(".") && moduleName.endsWith(".js") && context.originModulePath.includes(`${path.sep}packages${path.sep}core${path.sep}`)) {
    try { return resolve(context, moduleName.replace(/\.js$/, ".ts"), platform); } catch {}
  }
  return resolve(context, moduleName, platform);
};
module.exports = config;
