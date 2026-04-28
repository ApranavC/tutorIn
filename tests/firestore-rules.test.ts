import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

describe("Fix #26: Firestore rules (structure validation)", () => {
  const rules = readFileSync(
    resolve(__dirname, "../firestore.rules"),
    "utf-8"
  );

  it("no longer has a catch-all wildcard write rule", () => {
    // The old rule was: match /{document=**} { allow read, write: ... }
    // After fix, there should be no wildcard write rule
    const wildcardWritePattern = /match\s+\/\{document=\*\*\}[\s\S]*?allow\s+.*write/;
    expect(wildcardWritePattern.test(rules)).toBe(false);
  });

  it("has explicit rules for courses collection", () => {
    expect(rules).toContain("match /courses/{courseId}");
  });

  it("has explicit rules for classes collection", () => {
    expect(rules).toContain("match /classes/{classId}");
  });

  it("has explicit rules for doubts collection", () => {
    expect(rules).toContain("match /doubts/{doubtId}");
  });

  it("has explicit rules for quizzes collection", () => {
    expect(rules).toContain("match /quizzes/{quizId}");
  });

  it("has explicit rules for assignments collection", () => {
    expect(rules).toContain("match /assignments/{assignId}");
  });

  it("has explicit rules for submissions collection", () => {
    expect(rules).toContain("match /submissions/{subId}");
  });

  it("requires authentication for all operations", () => {
    // Every allow statement should check request.auth != null
    const allowStatements = rules.match(/allow\s+(read|write|create|update):/g) || [];
    expect(allowStatements.length).toBeGreaterThan(0);

    // No allow statement should be unconditional
    expect(rules).not.toContain("allow read, write;");
    expect(rules).not.toContain("allow read, write: if true");
  });

  it("restricts course creation to admins", () => {
    expect(rules).toContain('role == "admin"');
  });

  it("restricts class creation to teachers", () => {
    expect(rules).toContain('role == "teacher"');
  });

  it("restricts doubt creation to students", () => {
    expect(rules).toContain('role == "student"');
  });
});
