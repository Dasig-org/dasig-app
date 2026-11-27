# Releasing the Dasig app: store listing and updates

**Status:** draft, 2026-11-23. Title decided by Don the same day. Everything here goes into Play Console (or App
Store Connect) and can be changed **without a new build**. `expo.name` stays `Dasig`, the name shown on the phone.

**Rules this copy follows**
- Say "the Dasig app" in prose and never "Dasig" alone. Dasig Fundraising is a separate app and is not open source.
- Bayanihan is "an open initiative by Dasig". It goes in the description, not the title.
- Only claim what v0 does today. **Don't mention working with partner groups or LGUs yet.** BIX supports it but the
  app doesn't (Don, 2026-11-23).
- The AI (Bayani) is optional, Android only and in testing. Say so whenever it's mentioned.
- Audience is **13+**, so high-school orgs can join.

---

## Title (30): `Dasig: For Volunteers & Orgs` (28)

Decided 2026-11-23. Use it on both stores. Considered: `Dasig: Volunteer & Org Planner` (rejected because groups
coordinate rather than just plan), `Dasig Volunteer Coordination`, `Coordinate Volunteers & Orgs`, and
`Dasig: Coordinate Volunteer & Orgs` (34, too long). "For" is a stopword, so the short description has to carry the
verb **coordinate**.

## Short description (80)

`Coordinate your org's volunteers, teams & projects, from campus events to relief` (80)

## Full description (4000)

```
Not everyone can run the whole thing. Everyone can take one step.

The Dasig app helps volunteer groups, student orgs and nonprofits coordinate the work behind every event, outreach and project. A fun run, a feeding program, a campus seminar, a shore cleanup: each one is dozens of small jobs. Usually one coordinator holds them all in their head and a group chat. The Dasig app gives that work a shape, so volunteers know where to help and nothing rests on one person.

FOR VOLUNTEERS AND MEMBERS
• See what's worth doing this week, and say "I'm in" with one tap.
• "Can't make it" is one tap too. No guilt, no red counters.
• Your story: every finished step is thanked, signed by your group and kept on your phone. It goes with you.
• No leaderboards and no points. Credit is your story, not a ranking.

FOR COORDINATORS AND OFFICERS
• Turn a project into teams, and a big job into small steps, with subtasks and the files they need.
• Plan check on every project: what's still open, steps due this week with nobody on them, people asked who haven't answered, and teams with work coming and no lead.
• Project memory: the steps your group usually needs but hasn't planned yet, and what happened last time.
• An inbox for who wants to join and who hasn't answered yet.
• A project report when it's done, with hours and counts worked out for you.
• It survives handover. Plans, people and records belong to the group, so next year's officers start on day one.

NO SIGNAL? KEEP GOING
• Read what you last opened, and keep working. What you do is saved and sent when you're back online.
• No signal at all? Make one phone the group's hub, and others join over its hotspot. That's handy at venues, barangays and evacuation centers with weak signal.
• The hub works on Android.

BAYANI, THE SMALL AI (OPTIONAL, IN TESTING, ANDROID ONLY)
• Bayani runs on your phone with no internet. It matches steps to your group's usual ones and suggests a team.
• It always asks first. A lead accepts every change.

MADE FOR
Student organizations and councils, school and campus clubs, volunteer groups, nonprofits and foundations, church and youth ministries, civic and community groups, service clubs, and disaster relief teams.

PRIVATE BY DESIGN
• No ads. We never sell or rent your data.
• Sign in with a nickname or a Google account. No government ID needed to volunteer.
• See, download or delete your data any time: Me → Your data.

OPEN SOURCE
The Dasig app is open source and part of Bayanihan, an open initiative by Dasig. Your group's records use BIX, an open format, so they're never locked into one app. Dasig Fundraising is a separate service and isn't part of this. Built in the Philippines, and shaped with volunteer groups in Cebu.

The app is early and changes every week. Tell us what your group needs: hello@dasig.org
```

**Before publishing, check:**
- **Report "with hours and counts worked out"**: confirm the v0 project report includes hours.
- **"service clubs"**: keep only if a pilot group or a near-term target is one. Otherwise cut it.
- **"shaped with volunteer groups in Cebu"**: confirm this matches the pilot facts in the canon notes.

## Release notes, first release (500)

```
The first Play Store release of the Dasig app. Plan projects as teams and steps, say "I'm in" to what's worth doing, and keep a thanked record of your work. Keeps working when the signal drops, with an optional on-phone AI in testing (Android).
```

---

## Store settings

| Field | Value |
|---|---|
| App or game | App |
| Free or paid | Free |
| Category | **Productivity** |
| Tags (up to 5) | Pick from Google's list in the console: productivity, social, team collaboration, task management, events, as offered |
| Email | hello@dasig.org |
| Website | https://bayanihan.dasig.org |
| Phone | Optional. Leave blank unless you want it shown. |
| Privacy policy | https://bayanihan.dasig.org/trust/privacy |

## App content (Policy → App content)

| Section | Answer |
|---|---|
| Ads | **No ads** |
| App access | **Some features are restricted.** Give the reviewer the instructions below. |
| Content rating (IARC) | Utility/productivity type. **Users can interact or exchange content: Yes** (group members share photos and notes). No violence, gambling, etc. Expect around **Teen / PEGI 12**. |
| Target audience | **13–15, 16–17, 18+**. Not under 13, so the Families policy doesn't apply. Answer "No" to "appeals to children". |
| News app | No |
| Government app | No |
| Financial features | None |
| Health | None |
| COVID-19 | Not applicable |
| Account deletion | In the app: **Me → Your data**. Web: **https://bayanihan.dasig.org/trust/delete-account** (live). |

### App access instructions for the reviewer

Every Android phone runs its own server, so a reviewer can start a group offline with no account. Write it like this
and test every step on a clean install first:

```
No login is needed to review the app.
1. Open the app and tap "Start a group". Enter any group name and a nickname.
2. Create a project, add a team and a few steps.
3. Tap a step and choose "I'm in", then mark it Done to see it thanked and saved under Story.
Optional: "Sign in with Google" connects to the Bayanihan Network; any Google account works.
The on-phone AI (Bayani) is optional and downloads a model only if the user turns it on.
```

**To verify:** the exact button labels ("Start a group", Story tab), and that the Bayani model downloads only on
opt-in. If any feature needs an invite or a hub code, create a demo group on the Network and give its join code here.

### Data safety (draft, check against the code before submitting)

Overall: data is **encrypted in transit** (HTTPS to the Network) and users **can request deletion**. Nothing is
shared with third parties for advertising, and the Android app has no analytics (`src/lib/analytics.ts` is a no-op).

| Data type | Collected? | When | Purpose | Optional? |
|---|---|---|---|---|
| Name (nickname, optional full name) | Yes | Only if the group joins the Bayanihan Network | App functionality | Required for the Network |
| Email address | Yes | Google sign-in, or officers listing a group | Account management, app functionality | Optional |
| Phone number | Yes | Officers listing a group | App functionality | Optional |
| User IDs | Yes | Network account | Account management | Required for the Network |
| Photos | Yes | Profile photo and work photos, when synced | App functionality | Optional |
| Other user-generated content (steps, notes, reports) | Yes | When synced to the Network | App functionality | Required for the Network |
| Device or other IDs (push token) | Yes | If the user turns on notifications | App functionality | Optional |
| Location | **No** | | | |
| Contacts, messages, audio, health, financial | **No** | | | |

Notes for the form:
- **Records kept only on the phone are not "collected"** under Play's definition. Only data that leaves the device
  counts, which here means the Network sync, Google sign-in and push.
- Network data is hosted in Singapore (Supabase). Supabase and Google sign-in count as **service providers**, which
  isn't "sharing".
- The camera is used for scanning hub codes and taking photos. Photos count only if they're uploaded.
- **To verify:** what `src/lib/push.ts` sends and where it goes, and whether the Bayani model download sends anything
  beyond a plain file request.

### Account deletion page: `/trust/delete-account` (bayanihan-site)

**Done (2026-11-23):** `bayanihan-site/src/app/trust/delete-account/page.tsx`. It covers the three ways to delete:
in the app (Me → Your data), on the web at `volunteer.dasig.org/your-data` for Google and email accounts, and by email
to privacy@dasig.org for nickname-only accounts. It explains the 14-day grace period and what groups keep. Use
**https://bayanihan.dasig.org/trust/delete-account** as the Play deletion URL once the site is deployed.

`volunteer.dasig.org/your-data` now has a signed-out state: sign in to delete, or email us.

---

## Graphics

| Asset | Spec | Source |
|---|---|---|
| App icon | 512×512 PNG, 32-bit | Export from `app/assets/brand/icon.png` |
| Feature graphic | 1024×500 JPG/PNG | Made by the Dasig team |
| Phone screenshots | 2–8, 9:16, 1080×1920 | Real app screens with made-up people and groups |
| Promo video | YouTube URL, optional | Later |

---

## App Store (next week)

- **Name (30):** `Dasig: For Volunteers & Orgs`
- **Subtitle (30):** to decide, e.g. `Coordinate your org's projects`
- **Keywords (100):** no repeats of words already in the name or subtitle, e.g.
  `student org,nonprofit,volunteer management,teams,tasks,events,outreach,relief,bayanihan,club`
- **Watch out:** on iOS, the "works without internet" and hub features depend on what the iOS build supports. Check
  before claiming them.

---

## Releasing an update (update check, added 2026-11-27)

The store builds read `https://bayanihan.dasig.org/app/version.json` (in bayanihan-site `public/app/version.json`)
once a day:
- **`latest`**: phones on an older version see a dismissable "A new version of the Dasig app is ready. Update".
  Set it **after** the new version is live on Play, or the button opens a store page without the update yet.
- **`minimum`**: phones below it see a full screen with only Update. Use it rarely, only when old versions truly
  can't work with the server any more.
- **Offline or unreachable, nothing happens.** A group on a hub is never blocked, but a required update is
  remembered from the last check.
- iOS: add `"ios": { "latest", "minimum", "url" }` once the App Store link exists. Until then iOS skips the check.
- Web and self-built copies skip it entirely.

---
