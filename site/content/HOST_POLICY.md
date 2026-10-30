# Dasig Ecosystem host policy


This is the policy of **one host**: the Bayanihan Server that Dasig Inc. runs, called the Dasig Ecosystem. It is not part of BIX. BIX stays neutral, so an LGU, a federation or a school that runs its own Bayanihan Server writes its own policy.

## 1. What the Dasig Ecosystem keeps

| Role | What we keep | For whom |
|---|---|---|
| **Directory** | Public summaries only: group name, kind, place (barangay or above), causes, who it serves (as a description), project titles, status and dates, and figures with small numbers hidden | Every group that publishes, including groups whose records live on their own phone hub or server |
| **Home server** | A group's full BIX records: people, teams, tasks, files, votes, signed work | Groups that choose the Dasig Ecosystem as their home server |
| **Backup** | A copy of a hub's records, used for nothing but restoring them. Encrypted with the group's own key, so Dasig can't read it (planned; not built yet) | Hub groups that want a copy off the phone |

A group can be in the directory without giving us its records. Joining the Ecosystem never requires moving off a hub.

## 2. Who can join: open admission, verification as a separate badge

Decided 2026-10-29. Anyone may join. Trust rises in levels, and each level unlocks a little more.

| Level | How you get there | What it unlocks |
|---|---|---|
| 0 · On a phone | Install Dasig | Everything, privately, with no server |
| 1 · Account | A nickname and a phone token, or "Sign in with Dasig" | Using the Ecosystem as a backup or home server |
| 2 · Published | An officer confirms an email or mobile number | Appearing in the directory: being found, followed, invited as a partner |
| 3 · Verified organization | Dasig reviews a registration (SEC, CDA, DSWD accreditation, or a letter from a parish, school, district or national body) | The badge; hosting a public Goal that other groups enroll in; later, issuing credentials outsiders rely on |

**Rules for verification:**

- It grants the badge and the few powers above. It never gates ordinary use.
- Registration is never required. Informal groups are full members of the Ecosystem.
- **Organizations verified on Dasig Fundraising carry their verification over** when they link their group in the Ecosystem (decided 2026-10-29). Only the outcome crosses over: "verified by Dasig on this date, as this kind of organization". The documents stay in Dasig Fundraising.
- Verification is recorded as a statement **signed by the host**, which the group cannot edit. The group's own `registration[]` field is what it says about itself.
- We do not charge for the badge. Selling trust would make the badge worthless.

**People are not identity-checked.** Volunteers join with a nickname. Their contributions are trusted because the group that received the work signed it, not because Dasig checked who they are. We never ask for a government ID to volunteer.

## 3. What the host enforces

**Always (BIX rules the server enforces itself, not the app):**

- Small numbers hidden: any public figure below 5 for one place and group shows as "fewer than 5".
- People served are counts and descriptions, never named records.
- Photos marked as showing children never leave the group: no previews, no public pages, no profiles.
- Anything proposed through a public link is a private draft until a member accepts it.
- Every share link can be revoked at once.
- Deleting an account removes the person's profile, contact and photos after 14 days; groups keep the work, credited to "a former volunteer".
- Money and beneficiary steps need a second person to confirm.

**Abuse and safety:**

- Rate limits on sign-up, publishing and links.
- A **Report** button on every public page. Reports are read within 2 working days during the pilot.
- We may hide a directory listing that is fraudulent, hateful, sexual, endangers someone, or impersonates another group. Hiding a listing does not delete the group's records; the group is told why and can appeal.
- Repeated abuse can close an account. Its export stays available for 30 days.

## 4. Privacy

To be confirmed with an adviser.

- Dasig Inc. is the personal information controller for the hosted records, and appoints a Data Protection Officer.
- Records are stored in Singapore (AWS `ap-southeast-1`) or the Philippines.
- A personal data breach is reported to the National Privacy Commission and to affected people within 72 hours of discovery.
- We collect only what a feature needs. No advertising, no selling or renting data, no training of models on groups' records without opt-in.
- Sensitive information (health, disability, religion and similar) is kept only as counts, and only where the work needs it.

## 5. Promises about leaving

- **Export is free, always, and complete:** a group's or a person's records as BIX, with their signatures and files.
- **Signatures outlive us.** Every group's public signing key is published in the directory, so work it signed can still be checked if its hub phone is lost, or if Dasig shuts down.
- Moving a group's home server to its own Bayanihan Server is a supported, recorded act.
- If Dasig ever stops running the Ecosystem, we give at least 90 days' notice and keep exports open until the end.

## 6. Storage and plans (draft)

Hosted storage costs Dasig real money (S3), so heavier storage is a paid plan. Everything on a group's own phones and hub stays free forever.

| Plan | Hosted storage per group | Includes | Price |
|---|---|---|---|
| Free | 1 GB | Directory listing, backup or home server, export | Free |
| Group | 10 GB | Free, plus longer file history and priority support | To decide |
| Federation | 100 GB, shared across chapters | Group, plus roll-up reports for a district or national body | To decide |

- Text records (tasks, votes, signed work) never count toward storage. Only files do.
- Going over a limit stops new uploads to the Ecosystem. It never hides or deletes what's already there, and never blocks work on phones and hubs.
- Prices are shown in pesos, with no plan required for verification, export or safety features.

## 7. What Dasig will not do

- Require legal registration, real names or government IDs to take part.
- Lock records in, or charge for export.
- Use a group's records for anything it did not agree to.
- Change this policy without 30 days' notice in the app.
