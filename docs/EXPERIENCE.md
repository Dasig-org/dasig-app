# How the app should feel

**Status:** 2026-10-27. The design authority for the app's experience. Every screen is checked against it before it ships, and the co-design groups get to change it.

## The two feelings

| Who | The feeling we want |
|---|---|
| A coordinator | **"I am confident I can run this organization."** |
| A volunteer | **"I want to find something worthwhile to do today. Let's see what's in store for me."** |

Volunteers matter as much as coordinators. Both get the same app; neither is a second-class view.

## What creates them

**Confidence, for coordinators,** comes from four things:

1. **Knowing what's next.** The home screen is the coming week, not a dashboard. It shows the few things that need them, and says plainly when everything else is on track.
2. **Nothing falls through the cracks.** Open steps, unanswered asks and reports coming due surface on their own, early, without alarm.
3. **Seeing progress.** Targets against what's been done, in the group's own words: "18 of 40 learners this year."
4. **It survives handover.** Plans, people and records belong to the group, so a new president in July inherits everything and starts on day one.

**Anticipation, for volunteers,** comes from:

1. **Something worth doing, shown first.** The home screen opens with opportunities that fit them, framed by what they're for ("Saturday feeding, 3 more hands, about 40 kids"), with the faces of who else is going, and the names and photos of the animals when there are any.
2. **Being asked by name,** separately from what's open to everyone.
3. **Their story so far.** "You've helped on 6 Saturdays since June." It's theirs and it leaves with them.

## Rules

1. **Lead with people and purpose, not records.** A step is shown as what it's for and who it's with before when and where. Records stay underneath.
2. **Never guilt.** "Can't make it" is always one tap, with a reply like "That's okay, thanks for telling us." No red counters on volunteers. Overdue work is shown to coordinators as "still open", not "late".
3. **Thanks is part of the flow.** Confirming someone's work invites a short thank-you, which they see. This is the not-transactional part: the system records work, people say thanks.
4. **No leaderboards and no points.** Credit is a personal story, never a ranking. Volunteering is crowded out by competition and payment-like rewards.
5. **Plain, warm words, never BIX terms.** The interface is English, written like a kind older member of the group, at ease with Filipino words people use. See the glossary below.
6. **One or two taps for anything a volunteer does.** Claim, can't make it, offer something else, done.
7. **The app does the admin.** Anything that can be calculated (hours, counts, report figures, what's still needed) is calculated. Nobody types a number the app already knows.
8. **Celebrate quietly.** A session fully staffed, a report submitted, an animal adopted: a short, warm moment, then out of the way.
9. **Honest about the AI.** When Bayani suggests something, it says so and asks. It never acts on its own.
11. **One line per item on home screens; detail on tap.** A row is a title and one line of what matters most (who's going, how many are needed, its state). Reasons, places, partners and counts open in a sheet. An *i* explains how a number was calculated. Tuned per person (2026-10-27):
    - **Volunteers** are scanning for something to do, so rows are the lightest.
    - **Coordinators** need the state at a glance, so pills carry it ("All set", "1 open") and detail opens on tap.
    - **Newcomers from a link** don't know the group yet, so they keep one line of why, with "More".
12. **Calm by default.** Urgency is real but rare (an injured animal, a last-minute gap). Only `priority: urgent` is allowed to look urgent.

## Words: BIX term → what people see

| BIX | In the app |
|---|---|
| Initiative (`plan`) | Our year / Plan |
| Initiative (`program`, `project`) | Program, Project |
| Initiative (`session`) | The date itself: "Saturday feeding" |
| Need | What we need |
| Offer | What you can give / Offers |
| Task, `ready` | Open: "Lend a hand" |
| Task, `requested` | "Ana asked if you can…" |
| Claim | "I'm in" |
| Decline / release | "Can't make it" |
| Task `completed` | "Done" |
| Verification `confirmed` | "Thanked and recorded" |
| TaskDefinition | (never shown; it's how steps appear by themselves) |
| Provenance | "History" |
| Report | Report, with who it's for: "Monthly report for District 3860" |
| Role | Their role in the group, in the group's own words |
| Contribution record | "Your story" |

## How we'll know

During the pilot, ask after each session, in the debrief and not as a survey: did it make running the group feel more manageable? Did a volunteer open it without being reminded? Those two are the measures. The visual system (colour, type, components) follows from these rules and is designed next.
