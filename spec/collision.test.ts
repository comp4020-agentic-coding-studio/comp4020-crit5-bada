import { describe, expect, it } from "vitest";
import { rectsOverlap } from "../game-logic.ts";

// The spec's own framing: "a collision ends the round" can be tested; only
// playing can tell you whether it feels fair. This covers the testable half.
describe("collision: a wrong move ends the round", () => {
  it("flags overlapping rectangles", () => {
    expect(rectsOverlap({ x: 0, y: 0, w: 10, h: 10 }, { x: 5, y: 5, w: 10, h: 10 })).toBe(true);
  });

  it("clears rectangles that are nowhere near each other", () => {
    expect(rectsOverlap({ x: 0, y: 0, w: 10, h: 10 }, { x: 40, y: 40, w: 10, h: 10 })).toBe(false);
  });

  it("does not count merely touching edges as a collision", () => {
    expect(rectsOverlap({ x: 0, y: 0, w: 10, h: 10 }, { x: 10, y: 0, w: 10, h: 10 })).toBe(false);
  });

  it("catches an obstacle overlapping only vertically, not just horizontally", () => {
    expect(rectsOverlap({ x: 0, y: 0, w: 10, h: 10 }, { x: 5, y: 20, w: 10, h: 10 })).toBe(false);
  });
});
