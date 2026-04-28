import { describe, it, expect } from "vitest";

// Simulate the fixed leaderboard scoring logic
function calculateScore(sub: { type: string; score?: number | null }): number {
  if (sub.type === "quiz") {
    return sub.score ?? 0;
  } else if (sub.type === "assignment") {
    // Fix #6: Use graded score if available, otherwise participation points (50)
    return sub.score != null ? sub.score : 50;
  }
  return 0;
}

describe("Fix #6: Leaderboard scoring logic", () => {
  it("uses actual score for quiz submissions", () => {
    expect(calculateScore({ type: "quiz", score: 85 })).toBe(85);
  });

  it("uses 0 for quiz with no score", () => {
    expect(calculateScore({ type: "quiz" })).toBe(0);
  });

  it("uses graded score for graded assignments", () => {
    expect(calculateScore({ type: "assignment", score: 75 })).toBe(75);
  });

  it("awards 50 participation points for ungraded assignments (not 100)", () => {
    // Previously this returned 100 (the bug), now returns 50
    expect(calculateScore({ type: "assignment" })).toBe(50);
    expect(calculateScore({ type: "assignment", score: null })).toBe(50);
    expect(calculateScore({ type: "assignment", score: undefined })).toBe(50);
  });

  it("uses 0 score for assignment explicitly graded as 0", () => {
    expect(calculateScore({ type: "assignment", score: 0 })).toBe(0);
  });

  it("handles unknown submission types", () => {
    expect(calculateScore({ type: "other" })).toBe(0);
  });
});
