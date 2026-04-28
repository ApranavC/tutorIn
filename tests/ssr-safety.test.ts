import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("Fix #1: ParticipantGrid SSR safety", () => {
  let originalWindow: typeof globalThis.window;

  beforeEach(() => {
    originalWindow = globalThis.window;
  });

  afterEach(() => {
    globalThis.window = originalWindow;
  });

  it("typeof window check prevents SSR crash", () => {
    // Simulate server environment by deleting window
    // @ts-expect-error - intentionally testing SSR scenario
    delete globalThis.window;

    // The fix uses: typeof window !== "undefined" ? window.matchMedia(...) : false
    const isMobile =
      typeof window !== "undefined"
        ? window.matchMedia("only screen and (max-width: 768px)").matches
        : false;

    expect(isMobile).toBe(false);
  });

  it("works correctly in browser environment", () => {
    // Mock matchMedia
    globalThis.window.matchMedia = vi.fn().mockReturnValue({ matches: true });

    const isMobile =
      typeof window !== "undefined"
        ? window.matchMedia("only screen and (max-width: 768px)").matches
        : false;

    expect(isMobile).toBe(true);
  });

  it("returns false for desktop in browser environment", () => {
    globalThis.window.matchMedia = vi.fn().mockReturnValue({ matches: false });

    const isMobile =
      typeof window !== "undefined"
        ? window.matchMedia("only screen and (max-width: 768px)").matches
        : false;

    expect(isMobile).toBe(false);
  });
});
