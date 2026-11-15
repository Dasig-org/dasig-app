import type { Pack } from "@bayanihan/bayani";

/*
 * What the app sends Bayani-1 and how it reads the answer, with no React Native in it, so the same code runs in the
 * app (llama.rn) and in a check on a Mac (llama.cpp's server): scripts/bayani-check.ts.
 */
export const SYSTEM = "You help a volunteer group remember how its projects usually go. Read the project details and answer the question with exactly one of the allowed answers, and nothing else.";
/** SmolLM2's chat format, exactly as in training (bayani train/train.py, train/Modelfile). */
export const chat = (text: string) => `<|im_start|>system\n${SYSTEM}<|im_end|>\n<|im_start|>user\n${text}<|im_end|>\n<|im_start|>assistant\n`;

/** The grammar that holds the answer to what's allowed: one of the fixed answers, or a short general title. */
export const grammarFor = (pack: Pack) => Array.isArray(pack.answers)
  ? "root ::= " + pack.answers.map((a) => JSON.stringify(a)).join(" | ")
  : `root ::= [A-Z] [A-Za-z0-9 ,'&/()-]{2,58}`;

/** Completion settings: greedy, short, with the raw (not post-sampling) probabilities of the top 10 tokens. */
export const completionFor = (pack: Pack) => ({ prompt: chat(pack.text), n_predict: Array.isArray(pack.answers) ? 4 : 24, temperature: 0, stop: ["<|im_end|>", "\n"], grammar: grammarFor(pack), n_probs: 10, post_sampling_probs: false });

export type TokenProbs = { content: string; probs: { tok_str: string; prob: number }[] }[];
/**
 * How sure the answer is, over the whole answer: at each generated token, its raw probability among the tokens that
 * would keep the answer one of the allowed ones (the grammar's choices), multiplied over the tokens. NaN for text.
 */
export function confidenceOf(pack: Pack, steps: TokenProbs | undefined): number {
  const fixed = Array.isArray(pack.answers) ? pack.answers : null;
  if (!fixed) return NaN;
  let confidence = 1, prefix = "";
  for (const st of steps ?? []) {
    const ok = (st.probs ?? []).filter((p) => fixed.some((a) => a.startsWith(prefix + p.tok_str)));
    const total = ok.reduce((n, p) => n + p.prob, 0), mine = ok.find((p) => p.tok_str === st.content)?.prob ?? 0;
    confidence *= total > 0 ? mine / total : 0;
    prefix += st.content;
    if (fixed.includes(prefix)) break;
  }
  return confidence;
}
