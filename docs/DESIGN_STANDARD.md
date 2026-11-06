# Bayanihan app · design standard

**Status:** adopted 2026-10-27 from design reviews of the home-screen and differentiator sketches. Every new screen, mockup and component follows it from the first draft.

**Where rules live.** This file owns how screens *look*. `EXPERIENCE.md` owns how they *feel and behave* (the two feelings, never guilt, thanks in the flow, words). Don't restate a rule in both; link to it. When a review corrects a screen, add the rule here in the same session and log it at the bottom.

**References that already follow it:** `home-sketches.html` (v0.3) and `differentiators.html` (v0.2).

---

## 1 · Balance: every screen has text, visuals and air

The two reviews set the balance from both sides: v0.1 was too dense, and the first differentiator pass was too bare.

1. **One line per item; detail on tap.** A row is a title plus one line of what matters most (who's going, how many are needed, its state). Reasons, places, partners and counts open in a sheet. An *i* explains how a number was calculated.
2. **Every item has a visual anchor** on its left: a photo, a face, or an icon, in that order of preference. No row is text alone.
3. **Every screen has at least one large visual:** a cover photo, a photo strip, a large icon or mark (56–64px), or a pair of faces. Text-only screens are not allowed, including confirmations and settings.
4. **Air between sections**, not lines. Eyebrow over content, whitespace between groups.

**Tuned per person:**

| Person | Density | Visual anchor |
|---|---|---|
| Volunteer | Lightest. Swipeable photo tiles for open work. | Initiative photos, faces of who's going |
| Coordinator | State at a glance. Pills carry the state ("All set", "1 open"). | Icons for kinds of work, photos from recent sessions |
| Newcomer from a link | Keeps one line of *why*, with "More" | A large cover photo |

## 1a · Screens are templates over BIX, not one-offs

1. **One template per resource type and state**, never a screen per kind of work. A design proposal, a call for speakers and a permit are all the **Task page**; what differs is the data in it (title, team icon, attachments, checklist, history) and the state (open, mine, waiting on review, done).
2. **Only show what BIX can hold.** Every element on a sketch must map to a field. If a screen needs something the model lacks, add it to the spec first or drop it. (A colour-palette strip on a design proposal is just an image attachment.)
3. **State drives the actions:** "I'll take it" when open, "Mark done" when it's yours, **Approve / Ask for changes** only for the `reviewer` when work is waiting on review.
4. **Attachments render by type:** images as a gallery, documents as tiles with an icon and name. The Task page has no special layout for "design work".

## 1b · Every page, the same anatomy

Every page (a group, team, project, task, need, offer, vote, report or position) is laid out in this order, showing only the parts that have content:

1. **Header:** icon or cover, reference, title, where it belongs
2. **State and the one action**
3. **About:** the `description`, two lines, with "More"
4. **Files:** reference attachments as tiles (images as thumbnails, documents as a file tile with its name); a vote shows each option's files with the option
5. **The work:** checklist, smaller pieces, people on it (Tasks); teams (projects); roster (teams)
6. **What came out of it:** outputs (Tasks only)
7. **History and comments**

A page with no files doesn't show an empty Files section; "Add a file" sits in the page's menu.

## 2 · Photos

1. **Photos carry the meaning text used to.** Steps show their initiative's cover. "Your story", sessions and reports show photos volunteers attached.
2. **Real photos from the group's own work** in the product. Never stock.
3. **At most one overlay** on a photo, usually the date chip (white pill, top left).
4. **Corners on the image** (20 for tiles and thumbnails, 22–26 for covers), never a box around it.
5. **No photo yet:** a Sand tile with the group's initials or the kind-of-work icon, and a prompt to add one after the first session.
6. **Privacy:** link previews and public pages show only a public `Initiative.image` or `Organization.image`, never a step's photos (BIX spec, "Media"). Photos often show beneficiaries, including children.

| Use | Size |
|---|---|
| Cover on a detail page or shared step | full width, 150–190px tall, radius 26 |
| Swipeable tile | 236 × 150, radius 20 |
| Strip (story, session, report) | 72–86px squares, radius 16 |
| Row thumbnail | 44–56px, radius 14–20 |
| Group photo as avatar | 30–40px circle |

7. **Link previews are text-first and generated, not stored.** Like GitHub's: the context (project · team), a large title, the reference and state, a row of 2–3 counts with icons, and the group's logo (`Organization.image`, or its initials) as the only image. A thin strip at the bottom shows progress. No page needs its own image. The preview is drawn on the server from the record when a chat asks for it, cached against the record's `meta.version`, and follows the sharing rules: a private item gives a generic card. Only a `public` Initiative may add its cover photo.

## 3 · Icons

1. **One set:** 24px outline icons, 2px stroke, round caps and joins. Source of truth: `icons.json` (paths) and `icons.svg` (a sprite). Add new icons to both, drawn the same way. No emoji in the product.
2. **Icons sit in circles:** Sand background with Accent-a (`#E85C21`) stroke, 40px in rows, 56px as a screen's large visual. White circles on Sand surfaces; wash-grey circles for neutral or not-yet states.
3. **One icon per kind of work**, used everywhere that kind appears (the program, its steps, its report figures): `users` serve, `receipt` buy and keep receipt, `box` receive goods, `home` count households, `book` learners, `clock` hours, `cal` sessions, `building` a district or national body, `flag` projects, `repeat` a recurring program.
4. **State icons**, never red: `pending` (dots) for waiting or offline, `buoy` for a backup offer, `check` in an Accent-a circle for done, an empty outlined circle for not yet.

## 4 · People

1. **People appear as faces.** A photo when the person has set one, otherwise their initial in a coloured circle. Stacks overlap by 7px with a 2px white ring.
2. **When an action affects people, the result shows them:** "All set" shows Liza and Rina, not a checkmark alone.
3. **Lists of people use faces on the left and the state on the right** (a check, or an empty circle). Absence is an empty circle, never red.

## 5 · Signature marks

| Mark | Look | Where |
|---|---|---|
| **Bayani** | The `spark` icon in a circle filled with the brand gradient (`#E85C21 → #FBB931`) | Only on what Bayani suggested or drafted, and in History for its entries. Paired with "Bayani suggests", never "Bayani did". |
| **On this phone** | White pill with a `lock` icon: "Read on this phone. The message stays here." | Under every Bayani suggestion |
| **BIX** | "BIX" in a gradient rounded square (44px, or 64px as a screen's large visual) | Only where it means freedom to a person: their own record ("Yours to keep") and the group's data page. Never as decoration. |
| **History** | A vertical timeline, each event led by its actor: Bayani's spark or a person's face | Every record's history |
| **Federation** | A row of member marks, filled when reported and dashed when not | Roll-up reports |

## 6 · Visual system

Dasig's app-parity system, unchanged (Dasig's design styleguide, §6):

- Page on the wash `#f1f5f9`; white, borderless, shadowless surfaces. The one shadow is the primary button's.
- Radius scale (2026-11-07, one continuous-curve system): 999 for every button, chip, pill, avatar and toggle · **24** for outer surfaces: list panels, hero cards, covers, Sand notes, tips, bottom sheets · **16** for elements inside them: fields, thumbnails, file tiles, previews · 48 for the device frame in mockups. Tokens: `radius.panel`, `radius.inner` in `src/ui/theme.ts`.
- **One orange per screen:** Primary `#F47C26` for the single main action. Accent-a `#E85C21` for state (checks, selected). Sand `#FFF6E9` for soft notes and icon circles. Ink `#0F172A` for text only, never fills.
- Type: screen title 26px bold, tracked −0.02em · row title 15px semibold, tracked −0.01em · meta 13px slate-500 · eyebrow 11px bold uppercase, tracked .16em, slate-400.
- Buttons 48px in flow, fully round. "Can't make it" is the same size as "I'm in". Primary: a subtle vertical gradient `#F47C26 → #E85C21` with a soft orange shadow (`primaryFill`); solid `#E85C21` when pressed, flat when disabled. Secondary: borderless, an ink tint at 6% (`tint`), never an outline.
- Fields: radius 16, no outline at rest, a 1.5px slate-300 border and a white fill when focused (200ms on web). Search and place fields carry a leading icon (`search`, `pin`).

## 7 · Making mockups

1. **One canonical file per set**, overwritten each iteration; old versions to `design/archive/`. Today: `home-sketches.html`, `differentiators.html`.
2. **Phones at 390 × 844.** Measure each phone's content height after editing (scroll height against client height); a screen may scroll, but its main action must be visible without scrolling.
3. **Sample data, clearly marked.** Groups and people are invented. Photos from Wikimedia Commons with their licences in `media/CREDITS.md`, and a note that the people pictured are not the people named. Replace with a co-design group's own photos, with their consent, as soon as they share them.
4. **Notes under each phone** name the rule or feeling each element serves.
5. **Screenshots for review:** capped at 1400px on both sides, one image per turn.
6. Bayani screens are labelled as the intended experience until the model exists.

## Change log

| Date | Rule | From |
|---|---|---|
| 2026-10-27 | Standard created: balance, photos, icons, people, signature marks, visual system, mockup process | Reviews of home sketches v0.1–v0.3 and differentiators v0.1–v0.2 |
| 2026-10-27 | One line per item, detail on tap | "Text density is too dense" (home v0.1) |
| 2026-10-27 | Use the media fields; photos carry meaning | "Utilize those media columns to enrich our sketches" (home v0.2) |
| 2026-10-28 | Every page has the same anatomy, including About and Files | "The voting items and the pages should be able to have attachments… so people know what to view" |
| 2026-10-27 | Screens are templates over BIX; only show what BIX can hold; previews are text-first and generated | "The screens you created are unrealistic… is our data model capable of this?" (design review v0.1) |
| 2026-10-27 | Every item has a visual anchor; every screen has a large visual | "The screens need visuals or icons, the visual balance same with the homescreens" (differentiators v0.1) |
