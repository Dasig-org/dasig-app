# Security and privacy

Records in BIX can describe volunteers, children and families, so we treat privacy problems as security problems.

## Report a problem privately

**Please don't open a public issue, discussion or pull request for a security or privacy problem.** Instead:

- use the repository's **Security** tab → **Report a vulnerability** (GitHub's private reporting), or
- email **hello@dasig.org** with "Security" in the subject.

Tell us what you found, how to reproduce it, and what it affects. Use made-up data in your example if you can.

## What counts

- Anything that lets someone read, change or sign records they shouldn't (a group's private work, another person's
  account, a group's signing key).
- Anything that shows a person, a photo or a group that should be hidden: names of people served, photos of children
  outside their group, small numbers that should be hidden in public summaries.
- Ways to make a signature check pass on a record that was changed.
- Secrets or keys committed by mistake.

## What happens next

- We reply within **3 working days** to say we've got it.
- We keep you updated while we fix it, and agree with you when it's safe to talk about it publicly.
- We credit reporters who want it, in the release notes and the advisory.

## Supported versions

The project is early (v0.x), so we fix problems in the latest release and on `main` only. The hosted services
(`volunteer.dasig.org`, `ecosystem.dasig.org`) are always kept on the latest version.

Please don't test against other people's groups or data on the hosted Bayanihan Network. Run your own server
(see the bayanihan repository) or use a group you made up.
