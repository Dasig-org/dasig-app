/*
 * Only the newest load may write state. Run like the other tests:
 *   cd app && ../../bayanihan/node_modules/.bin/vitest run test
 */
import { describe, expect, it } from "vitest";
import { latestCall } from "../src/lib/latest";

describe("latestCall", () => {
  it("applies the first result when nothing newer has started", () => {
    const apply = latestCall()();
    const seen = [];
    apply(() => seen.push("first"));
    expect(seen).toEqual(["first"]);
  });

  it("ignores an older result that resolves after a newer call starts", () => {
    const begin = latestCall();
    const older = begin(), newer = begin();
    const seen = [];
    older(() => seen.push("older"));
    newer(() => seen.push("newer"));
    expect(seen).toEqual(["newer"]);
  });

  it("ignores an older error just as it ignores an older result", () => {
    const begin = latestCall();
    const older = begin(), newer = begin();
    const seen = [];
    older(() => seen.push("old error"));
    newer(() => seen.push("new data"));
    expect(seen).toEqual(["new data"]);
  });
});
