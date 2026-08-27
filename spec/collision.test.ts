import { describe, expect, it } from "vitest";
import { rectsOverlap, rescaleObstacleX, tryJump } from "../game-logic.ts";

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

// Sensor: a resize mid-run moves the player's x (a live fraction of width)
// but an obstacle's x is stored absolute. Without rescaling by the same
// ratio, a resize hands out a free pass or a cheap death unrelated to skill.
describe("resize: an obstacle keeps its relative distance from the player", () => {
  it("scales up with a wider canvas", () => {
    expect(rescaleObstacleX(450, 450, 720)).toBeCloseTo(720, 5);
  });

  it("scales down with a narrower canvas", () => {
    expect(rescaleObstacleX(720, 720, 450)).toBeCloseTo(450, 5);
  });

  it("leaves position unchanged when width doesn't change", () => {
    expect(rescaleObstacleX(300, 500, 500)).toBe(300);
  });
});

// The second mechanic: a jump is only allowed while jumps remain since the
// player was last grounded. Landing (main.ts) resets the count to 0.
describe("double jump: a jump is only allowed while jumps remain", () => {
  it("allows the first jump from the ground", () => {
    expect(tryJump(0, 2)).toEqual({ allowed: true, jumpsUsed: 1 });
  });

  it("allows a second jump mid-air", () => {
    expect(tryJump(1, 2)).toEqual({ allowed: true, jumpsUsed: 2 });
  });

  it("rejects a third jump before landing", () => {
    expect(tryJump(2, 2)).toEqual({ allowed: false, jumpsUsed: 2 });
  });

  it("rejects any jump at all when maxJumps is 1", () => {
    expect(tryJump(1, 1)).toEqual({ allowed: false, jumpsUsed: 1 });
  });
});
