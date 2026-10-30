# Dasig

> **Private preview.** The three repos aren't on npm yet, so they're used side by side. Clone all three into one folder:
>
> ```sh
> mkdir dasig && cd dasig
> git clone https://github.com/Dasig-org/bix.git
> git clone https://github.com/Dasig-org/bayanihan.git
> git clone https://github.com/Dasig-org/dasig-app.git
> ```
>
> Then `npm install` inside `bayanihan/`, and inside `dasig-app/app/`. Please don't share the code outside the preview yet.

The open-source app for volunteer groups and organizations: teams first, volunteers saying "I'm in", and a signed record of the work that stays with the people who did it. It works on one phone, or for a whole group on a hub phone with no internet.

| Path | What |
|---|---|
| [`app/`](app) | The Dasig app (Expo, React Native): Android first, web for everyone else |
| [`site/`](site) | [bayanihan.dasig.org](https://bayanihan.dasig.org), the Dasig Ecosystem's website (Next.js) |
| [`docs/`](docs) | Design standard, experience principles, and the Dasig Ecosystem's host policy |

Built on [BIX](https://github.com/Dasig-org/bix) and [Bayanihan Core and Server](https://github.com/Dasig-org/bayanihan): the app runs Bayanihan Server inside itself, on the phone's own storage.

## Run it

```sh
cd app && npm install
npx expo start            # or: npx expo run:android
```
```sh
cd site && npm install && npm run dev   # http://localhost:3100
```

## Licence and name

- Code: **AGPL-3.0**, see [`LICENSE`](LICENSE).
- "Dasig" and the hands emblem are trademarks of Dasig Inc., see [`TRADEMARK.md`](TRADEMARK.md). You may use, change and share the code; please give your own build a different name and icon.

Questions: hello@dasig.org.
