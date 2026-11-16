<p align="center">
  <img src="https://bayanihan.dasig.org/emblem.png" alt="Dasig" width="72">
</p>

<h1 align="center">Dasig</h1>

<p align="center">
  <b>Not everyone can run the whole thing. Everyone can take one step.</b><br>
  The open-source app for volunteer groups: turn the extra work into small steps anyone can take,<br>
  and remember what worked, for next time.
</p>

<p align="center">
  <a href="https://volunteer.dasig.org">Open Dasig on the web</a> ·
  <a href="https://github.com/Dasig-org/dasig-app/releases/latest">Android APK</a> ·
  <a href="https://bayanihan.dasig.org">Website</a> ·
  <a href="CONTRIBUTING.md">Contribute</a>
</p>

> **Early, in pilot.** Dasig is being shaped with a small number of volunteer groups in the Philippines. Android comes
> first and the web works for everyone else. It changes every week, and the AI (Bayani) is still being tested.

<p align="center">
  <img src="https://bayanihan.dasig.org/screens/app-coordinator-home.webp" alt="A coordinator's home: getting the group going, step by step" width="200">
  <img src="https://bayanihan.dasig.org/screens/app-volunteer-home.webp" alt="A volunteer's home: steps to lend a hand with" width="200">
  <img src="https://bayanihan.dasig.org/screens/app-task-im-in.webp" alt="A volunteer about to say I'm in to a shore cleanup" width="200">
  <img src="https://bayanihan.dasig.org/screens/app-plan-memory.webp" alt="Project memory: steps projects like this usually need" width="200">
  <br><sub>Screens from the Dasig app. People and groups are made up.</sub>
</p>

## Why

A fun run, a feeding programme, a shore cleanup: each one is dozens of small jobs, and usually one coordinator holds
them all in their head and a group chat. Volunteers want to help but don't know where. When the coordinator steps
down, the group starts over.

Dasig gives that work a shape. A coordinator plans a project as **teams and steps**. Volunteers see what's worth doing
and say **"I'm in"**. Finished work is thanked, signed by the group, and kept by the people who did it.

## What it does today

**For coordinators**
- A project becomes teams, and a big job becomes steps, with subtasks and the files they need.
- **Plan check** on every project: what's late, steps due this week with nobody on them, people asked who haven't
  answered, teams with work coming and no lead.
- **Project memory:** steps your group usually needs but hasn't planned, and what happened last time. At the end, keep
  what you learned.
- An **Inbox** for who wants to join and who hasn't answered, and a project report when it's done.

**For volunteers**
- Join with a nickname or a Google account, ask to join a team, and take a step. "Can't make it" is one tap too.
- **Your story:** every finished step is thanked, signed by your group, and kept on your phone. It goes with you.

**Works without internet**
- On Android, every phone runs its own [Bayanihan Server](https://github.com/Dasig-org/bayanihan), so records live on
  the phone itself.
- Make one phone the group's **hub**; others join over its hotspot.
- Connect to the hosted **Bayanihan Network** when you want, or never.

**Bayani, the small AI** (optional, Android, in testing)
- [Bayani-1](https://github.com/Dasig-org/bayani) runs on the phone with no internet. It matches steps to your group's
  usual ones and suggests a team. A lead accepts every change.

## Try it

- **Web:** [volunteer.dasig.org](https://volunteer.dasig.org). Add it to your home screen.
- **Android:** the APK from the [latest release](https://github.com/Dasig-org/dasig-app/releases/latest).
  Google Play comes later.

## Run it from source

You need Node.js 22. The `@bayanihan/*` packages aren't on npm yet, so the repositories sit side by side in one folder:

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
- **Web:** a browser can't host a group, so the web app talks to the hosted Bayanihan Network
  (`https://ecosystem.dasig.org`) by default. **For development, please use your own server** instead of making test
  groups on the real network: run Bayanihan Server locally (see its [README](https://github.com/Dasig-org/bayanihan#run-it))
  and set `EXPO_PUBLIC_DASIG_NETWORK_URL=http://127.0.0.1:8787` in `.env`.

Check your change before opening a pull request:

```sh
npx tsc --noEmit
```

## What's in this repository

| Path | What |
|---|---|
| [`app/`](app) | The Dasig app (Expo, React Native): Android first, web for everyone else |
| [`app/e2e/`](app/e2e) | End-to-end checks in a real browser at phone size |
| [`docs/EXPERIENCE.md`](docs/EXPERIENCE.md) | How the app should feel. Every screen is checked against it. |
| [`docs/DESIGN_STANDARD.md`](docs/DESIGN_STANDARD.md) | Visual rules: density, photos, icons, faces |
| [`docs/BIX_SCREEN_COVERAGE.md`](docs/BIX_SCREEN_COVERAGE.md) | Which BIX records each screen covers |

## Get involved

You don't need to write code:

- **Use it and tell us what confused you.** [Open an issue](https://github.com/Dasig-org/dasig-app/issues/new/choose).
- **Test on phones we don't have,** especially **iPhones** and **low-end Android phones**.
- **Review the words.** Every label should sound like a kind older member of the group.

And if you do:

- Pick up an issue labelled [`good first issue`](https://github.com/Dasig-org/dasig-app/labels/good%20first%20issue) or
  [`help wanted`](https://github.com/Dasig-org/dasig-app/labels/help%20wanted).
- Read [`CONTRIBUTING.md`](CONTRIBUTING.md) first. In short: open an issue before anything big, use plain language,
  and don't weaken privacy.
- Questions: [Dasig-org Discussions](https://github.com/orgs/Dasig-org/discussions).

Everyone taking part follows the [Code of Conduct](CODE_OF_CONDUCT.md). To report a security or privacy problem,
follow [`SECURITY.md`](SECURITY.md); don't open a public issue.

## Part of Bayanihan

Dasig is the reference app of [Bayanihan, an open initiative by Dasig](https://bayanihan.dasig.org), built on
[BIX](https://github.com/Dasig-org/bix) (the open format), [Bayanihan Core and Server](https://github.com/Dasig-org/bayanihan)
(rules and storage) and [Bayani](https://github.com/Dasig-org/bayani) (a small on-phone model). Anyone can build
another app on the same foundations.

## Licence and name

- Code: **AGPL-3.0**, see [`LICENSE`](LICENSE).
- "Dasig" and the hands emblem are trademarks of Dasig Inc., see [`TRADEMARK.md`](TRADEMARK.md). You may use, change
  and share the code; please give your own build a different name and icon.

Questions: hello@dasig.org.
