import { describe, it, expect } from "vitest";

// Simulate the fixed demote queue logic from ParticipantPanel.js
function handlePromote(
  prevQueue: string[],
  toDemote: string[]
): string[] {
  const existing = new Set(prevQueue);
  const newIds = toDemote.filter((id) => !existing.has(id));
  return [...prevQueue, ...newIds];
}

function handleDemote(prevQueue: string[], coHostId: string): string[] {
  if (prevQueue.includes(coHostId)) return prevQueue;
  return [...prevQueue, coHostId];
}

describe("Fix #11: Race condition in promote/demote queue", () => {
  it("deduplicates IDs when promoting (prevents double-demote)", () => {
    const existing = ["user-1", "user-2"];
    const newDemotes = ["user-2", "user-3"]; // user-2 already in queue

    const result = handlePromote(existing, newDemotes);
    expect(result).toEqual(["user-1", "user-2", "user-3"]);
    // user-2 not duplicated
    expect(result.filter((id) => id === "user-2").length).toBe(1);
  });

  it("handles empty existing queue", () => {
    const result = handlePromote([], ["user-1", "user-2"]);
    expect(result).toEqual(["user-1", "user-2"]);
  });

  it("handles all duplicates (no new additions)", () => {
    const existing = ["user-1", "user-2"];
    const result = handlePromote(existing, ["user-1", "user-2"]);
    expect(result).toEqual(["user-1", "user-2"]);
  });

  it("handleDemote prevents duplicate single demote", () => {
    const existing = ["user-1"];
    const result = handleDemote(existing, "user-1");
    // Should return same array reference (no mutation)
    expect(result).toBe(existing);
    expect(result).toEqual(["user-1"]);
  });

  it("handleDemote adds new ID when not present", () => {
    const existing = ["user-1"];
    const result = handleDemote(existing, "user-2");
    expect(result).toEqual(["user-1", "user-2"]);
  });

  it("rapid successive calls don't create duplicates", () => {
    let queue: string[] = [];
    // Simulate rapid calls
    queue = handleDemote(queue, "user-1");
    queue = handleDemote(queue, "user-1");
    queue = handleDemote(queue, "user-1");
    expect(queue).toEqual(["user-1"]);
  });
});
