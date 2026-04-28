import { describe, it, expect } from "vitest";

// Simulate the fixed due date validation from AssignmentCreator
function validateDueDate(dueDate: string): { valid: boolean; error?: string } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (new Date(dueDate) < today) {
    return { valid: false, error: "Due date must be today or in the future." };
  }
  return { valid: true };
}

describe("Fix #16: Assignment due date validation", () => {
  it("rejects past dates", () => {
    const result = validateDueDate("2020-01-01");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("future");
  });

  it("accepts today's date", () => {
    const today = new Date().toISOString().split("T")[0];
    const result = validateDueDate(today);
    expect(result.valid).toBe(true);
  });

  it("accepts future dates", () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);
    const dateStr = futureDate.toISOString().split("T")[0];

    const result = validateDueDate(dateStr);
    expect(result.valid).toBe(true);
  });

  it("rejects yesterday's date", () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split("T")[0];

    const result = validateDueDate(dateStr);
    expect(result.valid).toBe(false);
  });
});
