/* The update check's decision (lib/update.ts): suggest, require, or nothing. */
import { describe, expect, it, vi } from "vitest";
vi.mock("@react-native-async-storage/async-storage", () => ({ default: {} }));
vi.mock("expo-constants", () => ({ default: {} }));
vi.mock("react-native", () => ({ Linking: {}, Platform: { OS: "android" } }));
const { decide, older } = await import("../src/lib/update");
const url = "https://play.google.com/store/apps/details?id=org.dasig.bayanihan";

describe("update check", () => {
  it("compares versions by number", () => {
    expect(older("0.22.1", "0.23.0")).toBe(true);
    expect(older("0.22.10", "0.22.9")).toBe(false);
    expect(older("1.0", "1.0.0")).toBe(false);
  });
  it("requires below the minimum, suggests below the latest, else nothing", () => {
    expect(decide("0.22.1", { minimum: "0.23.0", latest: "0.23.0", url }, null).kind).toBe("require");
    expect(decide("0.22.1", { minimum: "0.22.0", latest: "0.23.0", url }, null).kind).toBe("suggest");
    expect(decide("0.23.0", { minimum: "0.22.0", latest: "0.23.0", url }, null).kind).toBe("none");
  });
  it("respects Later for that version only, but never for a required update", () => {
    expect(decide("0.22.1", { latest: "0.23.0", url }, "0.23.0").kind).toBe("none");
    expect(decide("0.22.1", { latest: "0.24.0", url }, "0.23.0").kind).toBe("suggest");
    expect(decide("0.22.1", { minimum: "0.23.0", latest: "0.23.0", url }, "0.23.0").kind).toBe("require");
  });
  it("does nothing without a store link", () => {
    expect(decide("0.22.1", { minimum: "9.0.0" }, null).kind).toBe("none");
  });
});
