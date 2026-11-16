/*
 * Bayani-1 through the app's own code (src/lib/bayaniPrompt.ts: prompt, grammar, settings, confidence) and the bayani
 * package's decode, on the held-out test set, with llama.cpp's server standing in for llama.rn (same engine).
 *
 *   llama-server -m base-q4_k_m.gguf --lora bayani-1-lora.gguf -c 2048 --port 8099     (bayani/models)
 *   cd ../../bayani && npx vite-node ../dasig-app/app/scripts/bayani-check.ts [limit]
 *
 * Prints, per question: accuracy, and at the app's threshold (SHOW_AT) how many answers would be shown and how many
 * of those are right. That's what a lead sees: only shown suggestions matter.
 *
 * Bayani's v1 test set (2026-11-16) also has a 7th question, sorting a typed question into lib/bayaniAnswer.ts's kinds
 * (with its own system prompt, carried on the row), and tags each row with its set (tidy, messy, held-out-kind,
 * intent); the scores are printed per set too. Identity rows (about-me, decline) are skipped: the app never asks them.
 * TEST=test-v0.jsonl scores the v0 test set instead.
 */
import { readFileSync } from "node:fs";
import { decode, type Pack } from "../../../bayani/src/index.js";
import { completionFor, confidenceOf, messagesFor, type TokenProbs } from "../src/lib/bayaniPrompt";
import { INTENT_SETTINGS } from "../src/lib/bayaniAnswer";

const SHOW_AT = Number(process.env.SHOW_AT ?? 0.6);
const SERVER = process.env.LLAMA ?? "http://127.0.0.1:8099";
const rows = readFileSync(new URL(`../../../bayani/data/out/${process.env.TEST ?? "test.jsonl"}`, import.meta.url), "utf8").trim().split("\n").map((l) => JSON.parse(l))
  .filter((r) => !["about-me", "decline"].includes(r.question));
const limit = Number(process.argv[2] ?? rows.length);
type S = { n: number; right: number; shown: number; shownRight: number; conf: number[] };
const by: Record<string, S> = {}, bySet: Record<string, S> = {};
for (const row of rows.slice(0, limit)) {
  const pack = { question: row.question, text: row.text, answers: Array.isArray(row.answers) ? row.answers : { text: { maxLength: 60 } }, labels: {}, tokens: 0, needsModel: true } as Pack;
  // The messages in the model's own chat format, as llama.rn does on the phone (llama-server's /apply-template).
  const { messages: m0, ...c } = completionFor(pack);
  const messages = row.system ? messagesFor(pack.text, row.system) : m0;
  if (row.question === "intent") c.n_predict = INTENT_SETTINGS.n_predict;
  const { prompt } = await fetch(`${SERVER}/apply-template`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ messages }) }).then((r) => r.json()) as { prompt: string };
  const res = await fetch(`${SERVER}/completion`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...c, prompt, cache_prompt: true }) }).then((r) => r.json()) as
    { content: string; completion_probabilities?: { token: string; top_logprobs?: { token: string; logprob: number }[] }[] };
  // llama-server's raw logprobs → llama.rn's shape ({content, probs: [{tok_str, prob}]}).
  const steps: TokenProbs = (res.completion_probabilities ?? []).map((s) => ({ content: s.token, probs: (s.top_logprobs ?? []).map((p) => ({ tok_str: p.token, prob: Math.exp(p.logprob) })) }));
  const d = decode(pack, res.content);
  const conf = confidenceOf(pack, steps);
  const fixed = Array.isArray(pack.answers);
  const got = !d.ok ? null : d.kind === "yes-no" ? (d.value ? "yes" : "no") : d.kind === "reference" ? (res.content.trim()) : d.value;
  const right = fixed ? got === row.answer : String(got ?? "").toLowerCase() === String(row.answer).toLowerCase();
  const shown = fixed ? conf >= SHOW_AT : !!got;
  for (const s of [(by[row.question] ??= { n: 0, right: 0, shown: 0, shownRight: 0, conf: [] }), (bySet[row.set ?? "v0"] ??= { n: 0, right: 0, shown: 0, shownRight: 0, conf: [] })]) {
    s.n++; if (right) s.right++;
    if (shown) { s.shown++; if (right) s.shownRight++; }
    if (fixed) s.conf.push(conf);
  }
  if (!right && process.env.SHOW_WRONG) console.log(`✗ ${row.question}: got ${got} (${Number.isFinite(conf) ? conf.toFixed(2) : "-"}), want ${row.answer}`);
}
const pc = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "–");
console.log("question            n   right   shown   right when shown   mean confidence");
let N = 0, R = 0, SH = 0, SR = 0;
for (const [q, s] of Object.entries(by)) {
  N += s.n; R += s.right; SH += s.shown; SR += s.shownRight;
  const mean = s.conf.length ? (s.conf.reduce((a, b) => a + b, 0) / s.conf.length).toFixed(2) : "–";
  console.log(`${q.padEnd(18)} ${String(s.n).padStart(3)}   ${pc(s.right, s.n).padStart(5)}   ${pc(s.shown, s.n).padStart(5)}   ${pc(s.shownRight, s.shown).padStart(16)}   ${mean.padStart(15)}`);
}
console.log("\nby set");
for (const [k, s] of Object.entries(bySet)) console.log(`${k.padEnd(18)} ${String(s.n).padStart(3)}   ${pc(s.right, s.n).padStart(5)}   ${pc(s.shown, s.n).padStart(5)}   ${pc(s.shownRight, s.shown).padStart(16)}`);
console.log(`${"all".padEnd(18)} ${String(N).padStart(3)}   ${pc(R, N).padStart(5)}   ${pc(SH, N).padStart(5)}   ${pc(SR, SH).padStart(16)}`);
