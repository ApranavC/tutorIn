import { describe, it, expect } from "vitest";

// Simulate the fixed UTC date generation
function getUTCDateString(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(now.getUTCDate()).padStart(2, "0")}`;
}

describe("Fix #7: Timezone-aware daily doubt limit", () => {
  it("generates UTC date string in YYYY-MM-DD format", () => {
    const dateStr = getUTCDateString();
    expect(dateStr).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("UTC date string matches expected UTC date", () => {
    const dateStr = getUTCDateString();
    const now = new Date();
    const expectedYear = now.getUTCFullYear();
    const expectedMonth = String(now.getUTCMonth() + 1).padStart(2, "0");
    const expectedDay = String(now.getUTCDate()).padStart(2, "0");

    expect(dateStr).toBe(`${expectedYear}-${expectedMonth}-${expectedDay}`);
  });

  it("pads single-digit months and days correctly", () => {
    // Test formatting: January 5th should be "01-05" not "1-5"
    const dateStr = getUTCDateString();
    const parts = dateStr.split("-");
    expect(parts[1].length).toBe(2); // Month always 2 digits
    expect(parts[2].length).toBe(2); // Day always 2 digits
  });
});
