# Bundled data

- `starter-practices.json`: Dasig's starter Practices (BIX `Practice`, `source: starter`, no figures), the usual steps
  for six kinds of project. Copied from `bayani/data/out/starter-practices.json` with a generated `organization`, which the app replaces with the project's. Used by project memory when a group has no Practices of its own for a kind (BIX
  "Suggestions and their answers"). Refresh by re-running the copy in the commit that added it (2026-11-14) after
  `npm run data` in `bayani`. Read-only: never committed to a group as is.
- `facts.json`: the facts library (`bayani/knowledge/out/facts.jsonl`, `npm run knowledge` there), 34 short sourced public
  answers about Dasig, BIX, Bayanihan and Bayani. Ask Bayani shows them as written; they're never trained into the model.
