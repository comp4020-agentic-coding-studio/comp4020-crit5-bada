# now

## State as of this run (2026-08-29, 53.5 h to cutoff, crit 5 "A game")

Sixteenth run on `comp4020-crit5-bada`. Still a deepen run — prompt hasn't
called it the finishing run yet (`PROCESS.md` is still template, no
`reflections/crit-5.md`). `pnpm check` green (28/28) at start and end.

Re-fetched the course source: brief unchanged from prior runs. Per the
standing next-action, didn't force another identical cold-open playtest —
instead read `main.ts`/`game-logic.ts` fresh and found a genuinely new bug
class none of the prior 15 runs had tested: canvas *height* robustness,
where prior work only ever tested canvas *width* resize (the
`rescaleObstacleX` fix).

The canvas CSS was `height: min(60vh, 480px)`. Traced the actual player
position (monkeypatched `CanvasRenderingContext2D.prototype.translate` via
an `--init-script` file, reading the min y each frame) across several
window heights with fresh page loads each time (state bleed between evals
without a reload gave one nonsense reading first, corrected by reloading
before each measurement):

- 800×500 window → canvas 300px tall → double-jump apex clipped ~18px above
  the visible top
- 800×400 window → canvas 240px tall → clipped ~54px, over half the player
  square gone
- 800×600 window and taller → already safe (canvas ≥360px)

Both marking viewports (1920×1080, 390×844) were already safe (canvas
locks to 480px at both), so this was invisible to the checks already run
at those two viewports specifically — only found by varying window height
independently, which no prior run had done. Collision math is unaffected
(physics runs in the same coordinate space regardless of what's drawn), so
this is a "can the player see themselves" bug, not a fairness bug — real
for anyone playing in a modest, non-maximised browser window (a plausible
"stranger tries it cold" scenario, not an exotic device).

Fixed with a CSS floor: `height: clamp(400px, 60vh, 480px)`
(`4c95a1b`). Re-traced at 400/500/600/650/1080-height windows post-fix —
all positive clearance (68–126px) — and re-confirmed both marking
viewports unchanged at 480px. `pnpm check` still 28/28. Committed and
pushed. Dev server (port 5222) torn down by real PID and reconfirmed via
`curl` refused, not just `pkill`. Live Pages URL still 404 (repo still
private, expected pre-ship per standing note).

## Single most important next action

The width-resize-desync fix pattern (`096fb2a`) and this run's height-floor
fix (`4c95a1b`) are now both closed for the two axes of "does resizing
break the visible game." No further resize-shaped bug hunting seems
promising for the next deepen run — if one lands before the finishing
prompt, prefer reading `reflections/README.md` and drafting reflection
language, or trying a genuinely different angle (not a repeat of the
width/height resize or cold-open-playtest checks already run several times
each).

When this **is** the finishing run: write `PROCESS.md` (map to real
commits: `1bf3c8f` build, `9d4e924` card+a11y, `c7126dd` distance-reset
fix, `aa8ce61` idle-screen affordance, `87c077d` aria-live restart fix,
`37d5530` keyboard-focus-shadowing fix, `096fb2a` resize-desync fix,
`e5a6620` resize-fix test coverage, `1e497aa` double-jump second
mechanic, `4c95a1b` canvas-height-floor fix) and `reflections/crit-5.md`
(headed "A game", not a week number). The double-jump addition (`1e497aa`)
is still the strongest breakthrough candidate — directly answers the
brief's "combining two interacting mechanics," verified fair via
simulation and a live traced build before ever playtesting, re-confirmed
discoverable via mashing across two separate playtests since. This run's
height-floor fix (`4c95a1b`) is a good second-tier PROCESS.md moment: found
by systematically testing an axis (window height) the checklist habit
hadn't covered, not by playtesting or code review. Include the honest a11y
limitation (fast one-button reflex game, effectively no on-screen text, a
screen-reader user gets death/restart announcements but can't play the
actual timing mechanic non-visually) in `PROCESS.md`. Confirm `git status`
clean and push only if this run's job per doctrine's finishing steps.
