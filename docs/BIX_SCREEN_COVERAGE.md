# BIX → screens coverage

**Date:** 2026-10-28. For each BIX resource: is it used in a sketch, and which flows does it enable that no screen shows yet. Sketch files are in `apps/bayanihan/design/`.

| BIX resource | Shown in | Flows BIX enables that aren't drawn |
|---|---|---|
| Person | Onboarding, keep your story, your data, public profile | — |
| Organization | Start a group, context switcher, profile "With" list | **Group's public page** (its summary, projects, how to help) |
| Role | Team roster, onboarding | **Asking to join a group**, and a lead approving it |
| Position | Org structure | — |
| Team | Teams grid, team page, invite, join | **Saving teams back** at wrap-up |
| InitiativeTemplate | (only as a prompt) | **"Start from last year's teams"** when creating a project |
| Initiative | Project page, who it's for, plan | **Timeline**; **wrap-up** |
| Location | Project and "who's working here" | — |
| Need | Volunteer home (v0.3), program setup | **Posting a need publicly and receiving offers** for an event (e.g. "300 bottles of water") |
| Offer | Bayani suggestion, last slot (backup) | **"Offer help"** from a published project; a sponsor's in-kind offer |
| TaskDefinition | Program setup tiles | — |
| Task | Task page, review, breakdown, helpers, done | **Gate opening** (milestone completed) |
| Provenance + Signature | History, "Recorded and signed" badge | **Checking a record** ("Signed by…, unchanged") when someone views a shared entry |
| Communication | Task history, inbox | **Messaging a group** from its public page |
| ShareLink | Share sheet, invite, safety controls | — |
| Decision, Vote | Voting, result, elections prompt | **Election flow** in full (candidates, closing) |
| Report | Club report, district roll-up | **Event report** after the event |
| Group (served) | Who it's for | — |
| Goal | Goal page, plan | **Setting a goal** (city or foundation side) and **accepting enrollments** |
| SharingPolicy | (none) | **Group sharing defaults** in settings |
| Consent | Consent screen | **Withdrawing consent** later |
| Endpoint, homeServer | (none) | **Setting up a hub**, pairing a phone, **sync status** |
| Follow | (none) | **Following** a project, group or goal, and seeing its updates |
| Attachment | Files, outputs | **Adding a file or photo** |
| Organization.vocabulary | (none) | **"Our words"** in settings |

## Missing flows, by priority

**P1 (show the ideas in pilots and posts)**

1. Group's public page, with Follow, Offer help and Message
2. Posting a need publicly and receiving offers
3. Gate opening
4. Reviewing proposals (from the inventory)
5. Checking a signed record

**P2**

6. Setting a goal and accepting enrollments (city or foundation)
7. Asking to join a group
8. Timeline
9. Wrap-up: report, credits, save teams back; and "Start from last year's teams"
10. Adding a file or photo
11. Sync status, and setting up a hub (design-only until the hub is built)

**P3**

12. Full election flow
13. Group settings: sharing defaults, our words
14. Withdrawing consent
15. Following, with an updates feed

## Status after 2026-10-28 batches

P1 (1–5) sketched in `p1-sketches.html`; P2 (6–11) sketched in `p2-sketches.html`, each with a `-public` version. P3 (12–15) remain, to be designed while building.
