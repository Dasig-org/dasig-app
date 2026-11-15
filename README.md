# Dasig

The open-source app for volunteer groups and organizations: teams first, volunteers saying "I'm in", and a signed record of the work that stays with the people who did it. It works on one phone, or for a whole group on a hub phone with no internet.

**Status: early, in pilot.** Dasig is being shaped with a small number of volunteer groups in the Philippines. Android comes first and the web works for everyone else. Expect things to change. See [`docs/EXPERIENCE.md`](docs/EXPERIENCE.md) for what the app is trying to be.

| Path | What |
|---|---|
| [`app/`](app) | The Dasig app (Expo, React Native): Android first, web for everyone else |
| [`app/e2e/`](app/e2e) | End-to-end checks in a real browser at phone size |
| [`docs/`](docs) | Experience principles, design standard, and BIX screen coverage |

Built on [BIX](https://github.com/Dasig-org/bix), [Bayanihan Core and Server](https://github.com/Dasig-org/bayanihan) and [Bayani](https://github.com/Dasig-org/bayani). The app runs Bayanihan Server inside itself, on the phone's own storage.

## Run it

The `@bayanihan/*` packages aren't on npm yet, so the repositories sit side by side in one folder:

```sh
mkdir dasig && cd dasig
git clone https://github.com/Dasig-org/bix.git
git clone https://github.com/Dasig-org/bayanihan.git
git clone https://github.com/Dasig-org/bayani.git
git clone https://github.com/Dasig-org/dasig-app.git

(cd bix && npm install)
(cd bayanihan && npm install)
(cd bayani && npm install)
cd dasig-app/app && npm install
```

Then start the app:

```sh
cp .env.example .env      # local settings; see the comments inside
npx expo start --web      # in a browser
npx expo run:android      # on an Android phone or emulator (needs the Android SDK)
```

Where records live:

- **Android:** on the phone itself. The app runs Bayanihan Server inside it, so it works with no server and no internet.
- **Web:** a browser can't host a group, so the web app talks to the hosted Bayanihan Network (`https://ecosystem.dasig.org`) by default. To develop against your own server instead, run Bayanihan Server locally (see its [README](https://github.com/Dasig-org/bayanihan#run-it)) and set `EXPO_PUBLIC_DASIG_NETWORK_URL=http://127.0.0.1:8787` in `.env`.

Check your change before opening a pull request:

```sh
npx tsc --noEmit
```

## Contributing

Contributions are welcome. Read [`CONTRIBUTING.md`](CONTRIBUTING.md) first. In short: open an issue before anything big, use plain language, and don't weaken privacy. To report a security or privacy problem, follow [`SECURITY.md`](SECURITY.md) and don't open a public issue.

## Licence and name

- Code: **AGPL-3.0**, see [`LICENSE`](LICENSE).
- "Dasig" and the hands emblem are trademarks of Dasig Inc., see [`TRADEMARK.md`](TRADEMARK.md). You may use, change and share the code; please give your own build a different name and icon.

Questions: hello@dasig.org.
