// Resolves every package from this app's node_modules so React is never duplicated.
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");
const projectRoot = __dirname;
const config = getDefaultConfig(projectRoot);
// Private checkout: the sibling repos (bix, bayanihan) cloned next to this one.
const siblings = path.resolve(projectRoot, "../..");
config.watchFolders = [path.join(siblings, "bayanihan/packages/core"), path.join(siblings, "bayanihan/packages/server"), path.join(siblings, "bix"), path.join(siblings, "bayani")];
config.resolver.nodeModulesPaths = [path.join(projectRoot, "node_modules")];
// Hierarchical lookup stays on (nested deps need it); no react exists at the repo root, so it cannot duplicate.
// Core is written with ".js" import specifiers (TypeScript NodeNext style); map them to the .ts sources.
const defaultResolve = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const resolve = defaultResolve ?? context.resolveRequest;
  if (moduleName.startsWith(".") && moduleName.endsWith(".js") && (/(@bayanihan|packages)[\\/](core|server|bayani)[\\/]|[\\/]bayani[\\/]src[\\/]/.test(context.originModulePath))) {
    try { return resolve(context, moduleName.replace(/\.js$/, ".ts"), platform); } catch {}
  }
  return resolve(context, moduleName, platform);
};
// Development only: forward /bix/* to Bayanihan Server and /sb/auth/* to local Supabase Auth, so a phone
// on an Expo tunnel reaches everything through one URL. Only auth is forwarded from Supabase, never the database.
const http = require("http");
const ROUTES = [
  { prefix: "/bix/", target: { host: "127.0.0.1", port: 8787 }, strip: "/bix" },
  { prefix: "/sb/auth/", target: { host: "127.0.0.1", port: 54421 }, strip: "/sb" },
];
config.server = config.server ?? {};
const prev = config.server.enhanceMiddleware;
config.server.enhanceMiddleware = (middleware, server) => {
  const inner = prev ? prev(middleware, server) : middleware;
  return (req, res, next) => {
    const route = ROUTES.find((r) => req.url.startsWith(r.prefix));
    if (!route) return inner(req, res, next);
    const headers = { ...req.headers, host: `${route.target.host}:${route.target.port}` };
    const up = http.request({ ...route.target, method: req.method, path: req.url.slice(route.strip.length), headers }, (r) => {
      res.writeHead(r.statusCode ?? 502, r.headers);
      r.pipe(res);
    });
    up.on("error", () => { res.statusCode = 502; res.end(JSON.stringify({ error: "local service not running" })); });
    req.pipe(up);
  };
};
module.exports = config;
