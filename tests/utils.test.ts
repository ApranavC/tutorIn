import { describe, it, expect } from "vitest";
import {
  trimSnackBarText,
  nameTructed,
  json_verify,
  formatAMPM,
  getQualityScore,
} from "@/components/live-class/utils/common";

// Re-exports from helper.js should resolve to the same functions
import {
  trimSnackBarText as helperTrimSnackBarText,
  nameTructed as helperNameTructed,
  json_verify as helperJsonVerify,
  formatAMPM as helperFormatAMPM,
} from "@/components/live-class/utils/helper";

describe("Fix #13: Consolidated utils (helper.js re-exports from common.js)", () => {
  it("helper.js re-exports match common.js exports", () => {
    expect(helperTrimSnackBarText).toBe(trimSnackBarText);
    expect(helperNameTructed).toBe(nameTructed);
    expect(helperJsonVerify).toBe(json_verify);
    expect(helperFormatAMPM).toBe(formatAMPM);
  });
});

describe("trimSnackBarText", () => {
  it("returns text as-is if under max length", () => {
    expect(trimSnackBarText("Hello")).toBe("Hello");
  });

  it("truncates long text with ellipsis", () => {
    const longText = "A".repeat(60);
    const result = trimSnackBarText(longText);
    expect(result.length).toBeLessThanOrEqual(52);
    expect(result.endsWith("...")).toBe(true);
  });

  it("handles empty string", () => {
    expect(trimSnackBarText("")).toBe("");
    expect(trimSnackBarText()).toBe("");
  });
});

describe("nameTructed", () => {
  it("returns full name if under limit", () => {
    expect(nameTructed("John", 15)).toBe("John");
  });

  it("truncates name at 12 chars when limit is 15", () => {
    const result = nameTructed("VeryLongDisplayName", 15);
    expect(result).toBe("VeryLongDisp...");
  });

  it("truncates name at specified length for other limits", () => {
    const result = nameTructed("SomeLongName", 5);
    expect(result).toBe("SomeL...");
  });

  it("handles undefined/null gracefully", () => {
    expect(nameTructed(undefined, 15)).toBeUndefined();
    expect(nameTructed(null, 15)).toBeNull();
  });
});

describe("json_verify", () => {
  it("returns true for valid JSON", () => {
    expect(json_verify('{"key": "value"}')).toBe(true);
    expect(json_verify("[]")).toBe(true);
    expect(json_verify('"string"')).toBe(true);
  });

  it("returns false for invalid JSON", () => {
    expect(json_verify("not json")).toBe(false);
    expect(json_verify("{bad}")).toBe(false);
    expect(json_verify("")).toBe(false);
  });
});

describe("formatAMPM", () => {
  it("formats morning time correctly", () => {
    const date = new Date("2024-01-15T09:05:00");
    expect(formatAMPM(date)).toBe("9:05 am");
  });

  it("formats afternoon time correctly", () => {
    const date = new Date("2024-01-15T14:30:00");
    expect(formatAMPM(date)).toBe("2:30 pm");
  });

  it("formats midnight as 12:00 am", () => {
    const date = new Date("2024-01-15T00:00:00");
    expect(formatAMPM(date)).toBe("12:00 am");
  });

  it("formats noon as 12:00 pm", () => {
    const date = new Date("2024-01-15T12:00:00");
    expect(formatAMPM(date)).toBe("12:00 pm");
  });
});

describe("getQualityScore", () => {
  it("returns 10 for perfect stats", () => {
    const score = getQualityScore({
      packetsLost: 0,
      totalPackets: 1000,
      jitter: 0,
      rtt: 0,
    });
    expect(score).toBe(10);
  });

  it("reduces score for high packet loss", () => {
    const score = getQualityScore({
      packetsLost: 100,
      totalPackets: 1000,
      jitter: 0,
      rtt: 0,
    });
    expect(score).toBeLessThan(10);
    expect(score).toBeGreaterThan(0);
  });

  it("reduces score for high jitter", () => {
    const score = getQualityScore({
      packetsLost: 0,
      totalPackets: 1000,
      jitter: 30,
      rtt: 0,
    });
    expect(score).toBeLessThan(10);
  });

  it("reduces score for high RTT", () => {
    const score = getQualityScore({
      packetsLost: 0,
      totalPackets: 1000,
      jitter: 0,
      rtt: 300,
    });
    expect(score).toBeLessThan(10);
  });

  it("caps penalty components at their maximum", () => {
    // Even with extremely bad stats, score shouldn't go below 0
    const score = getQualityScore({
      packetsLost: 999,
      totalPackets: 1000,
      jitter: 999,
      rtt: 9999,
    });
    expect(score).toBeGreaterThanOrEqual(0);
  });
});
