import { describe, it, expect } from "vitest";

// Simulate the course code uniqueness check from admin dashboard
function validateCourseCode(
  newCode: string,
  existingCourses: { code: string; name: string }[]
): { valid: boolean; error?: string } {
  const existingCourse = existingCourses.find(
    (c) => c.code.toLowerCase() === newCode.trim().toLowerCase()
  );
  if (existingCourse) {
    return {
      valid: false,
      error: `Course code "${newCode}" is already in use by "${existingCourse.name}".`,
    };
  }
  return { valid: true };
}

describe("Fix #8: Course code uniqueness check", () => {
  const existingCourses = [
    { code: "MATH101", name: "Advanced Mathematics" },
    { code: "PHY201", name: "Advanced Physics" },
    { code: "CS301", name: "Data Structures" },
  ];

  it("rejects duplicate course code (exact match)", () => {
    const result = validateCourseCode("MATH101", existingCourses);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("MATH101");
    expect(result.error).toContain("Advanced Mathematics");
  });

  it("rejects duplicate course code (case insensitive)", () => {
    const result = validateCourseCode("math101", existingCourses);
    expect(result.valid).toBe(false);
  });

  it("rejects duplicate course code (with whitespace)", () => {
    const result = validateCourseCode("  MATH101  ", existingCourses);
    expect(result.valid).toBe(false);
  });

  it("accepts unique course code", () => {
    const result = validateCourseCode("BIO401", existingCourses);
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("accepts code when no courses exist", () => {
    const result = validateCourseCode("NEW101", []);
    expect(result.valid).toBe(true);
  });
});
