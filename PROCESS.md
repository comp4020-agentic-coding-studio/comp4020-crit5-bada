# Process overview

## What I built

`Jump` is a one-button endless runner: a red square sits on a ground line,
short and tall dark obstacles scroll in from the right at a speed that ramps
with survival time, and the only input --- Space, ArrowUp, Enter, click, or
tap --- makes the player jump. A second press mid-air spends a double jump,
letting a tall obstacle be cleared without ever adding a second key to learn.
The idle screen draws a static obstacle and a pulsing glow around the player
before any input, so the first move (jump over that) is visible rather than
explained. It ships as a static site with no backend, straight to GitHub
Pages.

## The moments that mattered

1. **Two mechanics, one input.** The brief calls a second interacting
   mechanic the harder, better move "if you can keep a stranger finishing
   inside five minutes" --- but a second mechanic usually means a second key,
   which breaks the no-tutorial rule the moment a player needs a hint to find
   it. A double jump sidesteps this: it reuses the exact input the base
   mechanic already teaches, so a death against a tall obstacle still reads
   as "I didn't jump enough," the same feedback shape as the base mechanic.
   Before ever touching the browser, I simulated the exact gravity/velocity
   constants in Node and found a 500ms+ non-frame-perfect window between the
   two presses at every obstacle gap and speed the game reaches, then traced
   the shipped bundle's own player position (monkeypatching
   `CanvasRenderingContext2D.prototype.translate` via
   `agent-browser --init-script`, since `draw()` calls it once per frame at
   the player's centre) to confirm the built code produces the exact apex
   heights the simulation predicted. Only after that did a blind subagent
   play it cold: it died repeatedly against tall obstacles on one deliberate
   press, then found the double jump by mashing out of frustration, not on a
   first guess --- exactly Bushnell's "easy to learn, difficult to master,"
   not a discoverability gap, so I left it unhinted rather than patching in
   a visual cue that would have undercut the same rule the mechanic respects.
   [`1e497aa`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-bada/commit/1e497aa)

2. **The affordance requirement was silently unmet for the whole life of the
   repo.** The brief's one hard, unfakeable line is that the opening screen
   itself has to make the first move obvious. An idle-screen obstacle
   preview existed in the code from early on --- the constants, the phase
   check, the `fillRect` call were all there, and every screenshot and
   cold-open playtest across many runs looked fine, because the pulsing red
   glow around the player was real and visible and masked that the obstacle
   itself was not. `draw()` only sets `ctx.fillStyle` inside the per-obstacle
   loop, and the idle screen's `obstacles` array is always empty, so the
   idle-preview `fillRect` right after that loop silently inherited the
   *background* fill colour instead. I found it by going one level below "does
   the composed screenshot look right" to "what colour did this specific draw
   call actually use" --- monkeypatching `fillRect` to log `this.fillStyle` on
   every call, and reading `getImageData` at the preview's exact coordinates,
   which came back flat background with no obstacle-shaped region at all.
   Fixed with one explicit `fillStyle` set immediately before the call, then
   re-verified the same way: `getImageData` now reads the obstacle colour, and
   a screenshot shows a clearly visible dark bar next to the player.
   [`bd68e48`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-bada/commit/bd68e48)

3. **State that only ever moves one way needs an explicit reset the other
   way.** Two separate bugs shared this shape: `distance` (score) was reset
   to 0 on death but not when returning to idle, so a fast restart briefly
   showed the *previous* run's score before the new run's first frame caught
   up; and the `aria-live` `#status` element was written only in `endRun()`,
   so a screen-reader user restarting after a loss kept hearing the previous
   run's final score long after the visible canvas had reset and climbed
   past it. Both were found by driving the reverse transition by hand
   (`agent-browser eval` reading the same hook immediately before and after a
   restart) rather than only testing the direction that's easy to trigger
   once (death). Fixed by clearing both in `resetToIdle()`.
   [`c7126dd`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-bada/commit/c7126dd),
   [`87c077d`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-bada/commit/87c077d)

4. **A resize mid-run desynchronised the player from every obstacle already
   on screen.** The player's x is a live fraction of canvas width, recomputed
   every frame; each obstacle's x is set once at spawn and never touched
   again. A width change moved the player instantly while obstacles stayed
   exactly where they were --- a free pass through one that would otherwise
   have hit, or an unearned death from one that wouldn't have. Fixed by
   rescaling every in-flight obstacle's x by the same width ratio on resize,
   pulled the ratio math into a small pure function once it was fixed, and
   added unit tests for it so the fix isn't resting on manual verification
   alone. A related height check found a modest, non-maximised window
   (800×500, not an exotic device) clipping the player during a double-jump
   apex; fixed with a CSS height floor rather than touching any of the
   already simulation-verified jump constants.
   [`096fb2a`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-bada/commit/096fb2a),
   [`e5a6620`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-bada/commit/e5a6620),
   [`4c95a1b`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-bada/commit/4c95a1b)

## Sensors added

- `spec/game.test.ts` puts the brief's own testable half under test directly:
  `rectsOverlap` (a collision ends the round, including the touching-edges
  and vertical-only-overlap edge cases), `rescaleObstacleX` (a resize keeps
  an obstacle's relative distance), and `tryJump` (a double jump is only
  allowed while jumps remain).
- The `Storage`-guard fix
  ([`04c362d`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-bada/commit/04c362d))
  came from a general check worth repeating on any future deliverable that
  touches `localStorage` directly: monkeypatch `Storage.prototype.setItem`
  (and a `localStorage` getter) to throw via `--init-script` and confirm a
  storage failure degrades gracefully rather than freezing the whole page,
  since it's invisible in a default browser profile and only shows up in a
  browsing mode nobody defaults to.

## Honest limitation

This is a fast, one-button reflex game with effectively no on-screen text
during play. A screen-reader user gets the death/restart announcements
correctly (that's what the aria-live fix above protects), but there is no
non-visual channel for the actual timing mechanic itself --- the collision
has to be seen coming to be dodged. I judged this an acceptable limitation
for a five-minute arcade prototype rather than a gap to paper over, and did
not add a fake accommodation that wouldn't actually make the game playable
non-visually.
