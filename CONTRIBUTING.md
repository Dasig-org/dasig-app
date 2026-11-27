# Contributing to Dasig

Salamat for helping. Dasig is the app for volunteer groups: coordinators plan projects as teams and steps, and
volunteers say "I'm in". It's early, in pilot with a small number of groups in the Philippines, and it changes every
week.

By taking part you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## Ways to help

You don't need to write code to make Dasig better.

- **Use it and tell us what confused you.** [volunteer.dasig.org](https://volunteer.dasig.org) on the web, or the APK
  from the [latest release](https://github.com/Dasig-org/dasig-app/releases/latest) on Android.
- **Test on phones we don't have.** We especially need people with an **iPhone** (for the web app and Add to Home
  Screen) and **low-end Android phones**.
- **Review the words.** Every label should sound like a kind older member of the group, not a database.
- **Fix a bug or build a feature:** pick an issue labelled
  [`good first issue`](https://github.com/Dasig-org/dasig-app/labels/good%20first%20issue) or
  [`help wanted`](https://github.com/Dasig-org/dasig-app/labels/help%20wanted).
- **Accessibility:** screen readers, font scaling, contrast.

## Before you start

- **Small fixes** (a bug, a typo, a confusing label): open a pull request straight away.
- **A new screen or a change to how a screen works:** open an issue first and wait until a maintainer agrees on the
  approach. Screens are sketched before they're built, and every change keeps what the screen did before (nothing is
  lost by accident).
- **If it needs a new kind of record,** it starts in [BIX](https://github.com/Dasig-org/bix), then
  [Bayanihan Core](https://github.com/Dasig-org/bayanihan), then here.
- **To work on an issue,** comment on it so it can be assigned to you. If there's no news after two weeks, it goes back
  to the pool. No hard feelings.

Read [`docs/EXPERIENCE.md`](docs/EXPERIENCE.md) (how the app should feel) and
[`docs/DESIGN_STANDARD.md`](docs/DESIGN_STANDARD.md) before working on anything people see.

## Set up

You need Node.js 22.13 or newer. The `@bayanihan/*` packages come from npm:

```sh
git clone https://github.com/<you>/dasig-app.git     # your fork
cd dasig-app/app && npm install
cp .env.example .env
npx expo start --web
```

The web app talks to the hosted Bayanihan Network by default. Please **don't create test groups there**: run
Bayanihan Server locally (see its [README](https://github.com/Dasig-org/bayanihan#run-it)) and set
`EXPO_PUBLIC_DASIG_NETWORK_URL=http://127.0.0.1:8787` in `.env`.

For Android: `npx expo run:android` with the Android SDK and a phone or emulator.

## Checks

From `app/`:

```sh
npm run typecheck     # must pass
npx expo lint
npm test
```

The same checks run on every pull request.

To change a `@bayanihan/*` package and the app together, clone that repository, build it (`npm run build`), and
`npm link` it into `app/`.

End-to-end checks in a real browser at phone size are described in [`app/e2e/README.md`](app/e2e/README.md).

## Rules the app keeps

From [`docs/EXPERIENCE.md`](docs/EXPERIENCE.md), in short:

- **Lead with people and purpose,** not records.
- **Never guilt.** "Can't make it" is always one tap. No red counters on volunteers.
- **No leaderboards and no points.**
- **Plain, warm words, never BIX terms** in the interface.
- **One or two taps** for anything a volunteer does.
- **The app does the admin.** Nobody types a number the app already knows.
- **Honest about the AI.** Bayani suggests and asks; it never acts on its own.
- **Privacy is part of the design.** People served are counts, never names; photos of children never leave the group.
  Changes that weaken this won't be merged.
- **Fictional groups** in tests and screenshots (for instance "Lahug Uplands Runners Club").

## Open a pull request

1. Branch from `main` in your fork: `git switch -c fix-inbox-empty-state`.
2. Keep it to one change.
3. Run the checks and say so in the pull request. **Add a screenshot at phone size** for anything people see.
4. Fill in the pull request template.

## What happens next

- A maintainer reviews it, usually **within a week**. Only maintainers can merge; every change to `main` needs an
  approving review.
- You may be asked for changes. That's normal, not a rejection.
- We squash-merge, so your pull request becomes one commit on `main`, credited to you and in the release notes.

## Your contribution's licence and the name

By contributing you agree that your contribution is licensed under **AGPL-3.0** ([`LICENSE`](LICENSE)). "Dasig" and
the hands emblem are trademarks of Dasig Inc.; see [`TRADEMARK.md`](TRADEMARK.md) if you publish your own build.

Sign off each commit (`git commit -s`), which adds a `Signed-off-by:` line. It certifies the
[Developer Certificate of Origin](https://developercertificate.org/): that you wrote the change, or otherwise have the
right to submit it under these licences.

## Questions

[Dasig-org Discussions](https://github.com/orgs/Dasig-org/discussions), or hello@dasig.org. Security and privacy
problems: see [`SECURITY.md`](SECURITY.md), never a public issue.
