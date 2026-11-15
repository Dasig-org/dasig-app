# End-to-end checks

Each script drives the web build in a real browser at phone size (390 × 844) and prints what it did. The people and groups in them are fictional.

| Script | What it checks |
|---|---|
| `flow.mjs` | The core loop: a coordinator signs in with a nickname, starts Lahug Uplands Runners Club and Lahug Uplands Fun Run 2027 with its teams, adds a task to Communications and invites the team. Mia opens the invite, joins, takes the task and marks it done; it's recorded and signed, and the coordinator sees it on the team page. |
| `offline.mjs` | A group working without internet |
| `privacy.mjs` | Privacy a coordinator controls: invite-only groups, private work, approval links |
| `ecosystem.mjs` | Joining the hosted Bayanihan Network |
| `directory.mjs` | The group directory and the duplicate check when starting a group |
| `copy.mjs` | Copying a group from the device to the network |

## Run them

You need Google Chrome, a running Bayanihan Server with local Supabase (see the [Bayanihan README](https://github.com/Dasig-org/bayanihan#run-it)), and the app's dependencies installed. From `app/`:

```bash
npx expo export --platform web --output-dir /tmp/dist-web
python3 e2e/spa.py /tmp/dist-web 8099 &          # static server with single-page-app fallback

npm i --no-save playwright-core                    # once; not a dependency of the app
mkdir -p /tmp/e2e && node e2e/flow.mjs
```

Most scripts expect the app at `http://localhost:8099`; `copy.mjs` and `directory.mjs` default to port 8097 and take `APP=http://localhost:8099` to override. Screenshots are written to `/tmp/e2e/`.
