# End-to-end check

Runs the core loop in a real browser at phone size: Don signs in with a nickname, starts Lahug Uplands Runners Club and Lahug Uplands Fun Run 2027 with its teams, adds a task to Communications, and invites the team. Mia opens the invite, joins with a nickname, takes the task and marks it done; it's recorded and signed; Don sees it on the team page.

```bash
# server and local Supabase running (see packages/server/README.md), then:
cd apps/bayanihan && npx expo export --platform web --output-dir /tmp/dist-web
python3 -m http.server --directory /tmp/dist-web 8099   # needs SPA fallback; see e2e/spa.py
cd /tmp/e2e && npm i playwright-core && node /path/to/apps/bayanihan/e2e/flow.mjs
```
Screenshots are written to `/tmp/e2e/`.
