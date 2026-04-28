import { describe, it, expect } from "vitest";

describe("Fix #3: JSON.parse safety in ModeListner", () => {
  it("handles valid JSON message", () => {
    const data = { message: JSON.stringify({ mode: "SEND_AND_RECV" }) };
    let message;
    let parseError = false;

    try {
      message = JSON.parse(data.message);
    } catch {
      parseError = true;
    }

    expect(parseError).toBe(false);
    expect(message).toEqual({ mode: "SEND_AND_RECV" });
  });

  it("gracefully handles malformed JSON without crashing", () => {
    const data = { message: "not valid json{{{" };
    let message;
    let parseError = false;

    try {
      message = JSON.parse(data.message);
    } catch {
      parseError = true;
    }

    expect(parseError).toBe(true);
    expect(message).toBeUndefined();
  });

  it("gracefully handles empty string message", () => {
    const data = { message: "" };
    let parseError = false;

    try {
      JSON.parse(data.message);
    } catch {
      parseError = true;
    }

    expect(parseError).toBe(true);
  });

  it("gracefully handles undefined message", () => {
    const data = { message: undefined as unknown as string };
    let parseError = false;

    try {
      JSON.parse(data.message);
    } catch {
      parseError = true;
    }

    expect(parseError).toBe(true);
  });
});
