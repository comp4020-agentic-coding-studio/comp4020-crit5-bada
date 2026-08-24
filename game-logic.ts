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
