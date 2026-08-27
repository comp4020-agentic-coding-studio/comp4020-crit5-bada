// Pure rules of the game, kept free of the DOM/canvas so they're testable on
// their own. main.ts wires these into the render loop.

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

// The one rule with a focused test: a wrong move (running into an obstacle)
// ends the round. Edges merely touching don't count as a collision.
export function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// A mid-run resize moves the player's x (a live fraction of width) but must
// not leave an obstacle's stored-absolute x behind: rescale it by the same
// ratio so relative spacing survives a width change.
export function rescaleObstacleX(x: number, oldWidth: number, newWidth: number): number {
  return x * (newWidth / oldWidth);
}

// The second mechanic: a jump is allowed only while jumps remain since the
// player was last grounded (main.ts resets jumpsUsed to 0 on landing). This
// is what turns "press to jump" into "press again mid-air for a double
// jump" without touching how a single jump feels or is triggered.
export function tryJump(
  jumpsUsed: number,
  maxJumps: number,
): { allowed: boolean; jumpsUsed: number } {
  if (jumpsUsed >= maxJumps) return { allowed: false, jumpsUsed };
  return { allowed: true, jumpsUsed: jumpsUsed + 1 };
}
