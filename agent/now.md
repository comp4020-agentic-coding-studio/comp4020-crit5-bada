# now

## State as of this run (2026-08-27, 101.5 h to cutoff, crit 5 "A game")

Tenth run on `comp4020-crit5-bada`. Still a deepen run — prompt hasn't
called it the finishing run yet.

Followed up on the resize-desync angle last run's hand-off flagged but
left unconfirmed: does a mid-run resize unfairly move the player relative
to obstacles? Confirmed it's a real bug and fixed it in `096fb2a`
(`main: rescale in-flight obstacles when the canvas resizes mid-run`).

Root cause: `playerRect()` computes the player's x as `width * 0.12` live
every frame, but `Obstacle.x` is stored as an absolute pixel value set
once at spawn. `resize()` recomputed `groundY` and `playerY` (idle only)
but never touched `obstacles[].x`, so a width change moved the player
instantly while every obstacle stayed exactly where it was — a resize
could hand the player a free pass through an obstacle that would
otherwise have hit, or drop one on them out of nowhere.

Fix: `resize()` now captures `oldWidth` before reassigning `width`, and
when not idle and the width actually changed, multiplies every
`obstacles[].x` by `width / oldWidth` — the same fraction the player's
own x just moved by, so relative spacing is preserved.

Verification had a real false start worth remembering (written up as a
new dated entry in `MEMORY.md`'s environment-quirks section): my first
resize test showed no effect at all, and I nearly shipped a wrong fix
(swapping the `window` `resize` listener for a `ResizeObserver`) based on
a false "native resize doesn't fire for CDP viewport overrides" theory.
The real cause was mundane — `canvas { width: min(90vw, 720px) }` caps
canvas width once viewport ≥ ~800px, and both my test viewports sat above
that, so the canvas literally never resized. Caught it by testing two
viewports that both stay under the cap (500px and 900px, giving genuine
canvas widths of 450px and 720px), which reproduced the bug cleanly pre-fix
and confirmed the native listener does fire correctly — so I reverted the
`ResizeObserver` change back to the original `window.addEventListener`.

Confirmed the fix works with exact arithmetic, not just "looks better":
traced `ctx.translate` (player) and `ctx.fillRect` (obstacles) calls via
an `agent-browser --init-script` monkeypatch while rapidly toggling the
viewport 900↔500 eight times during a live run. Post-fix, two obstacles
present at a 450→720 (1.6×) transition went from `(81.31, 361.06)` to
exactly `(130.09, 577.7)` — `81.31×1.6=130.10`, `361.06×1.6=577.70`,
matching the player's own ratio to the decimal. `pnpm check` (typecheck,
build, 21/21 tests) green throughout. Dev server shut down and confirmed
dead by PID (both the `pnpm exec vite` wrapper and its real `node
vite.js` child, per the standing wrapper-vs-child kill lesson) before
committing.

## Single most important next action

The resize-desync angle from last run's hand-off is now closed with a
real, verified fix (`096fb2a`) — a fourth genuine bug found by testing
against the brief's own "only playing can tell you whether it feels
fair" framing, alongside the idle-affordance, distance-reset, aria-live-
restart, and keyboard-focus-shadowing fixes already in the log.

No further angle is currently flagged. If more deepen time remains
before the finishing-run prompt, a cold-open playtest pass (mouse,
keyboard, touch, chording if applicable, blur-mid-run) hasn't been
repeated since the keyboard-focus-shadowing fix landed (`37d5530`) — one
more pass to confirm that fix didn't regress anything else would be a
reasonable use of time, but two clean passes in a row on any one angle is
license to stop pulling that thread per established practice in this
file.

If this **is** the finishing run instead: write `PROCESS.md` (map to real
commits: `1bf3c8f` build, `9d4e924` card+a11y, `c7126dd` distance-reset
fix, `aa8ce61` idle-screen affordance, `87c077d` aria-live restart fix,
`37d5530` keyboard-focus-shadowing fix, `096fb2a` resize-desync fix) and
`reflections/crit-5.md` (headed "A game", not a week number, per
doctrine). Strong breakthrough candidates, in rough order of strength:
(1) the resize-desync fix — the self-correction is the real story: an
initial test gave a false negative, a plausible-but-wrong theory
followed from trusting it, and only building a more carefully-designed
test (viewports that actually stay under a CSS cap) caught the mistake
before it shipped as a wrong fix; (2) the keyboard-focus-shadowing fix —
found by asking a structurally different question (does the game
interfere with the *rest* of the page) after cold-open playtesting of
the game itself had gone clean twice running; (3) the corrupted-vs-
isolated blind-subagent contrast across multiple runs; (4) the faithful-
simulation verification of back-to-back-obstacle jump timing. Include the
honest a11y limitation (fast one-button reflex game, effectively no
on-screen text, a screen-reader user gets death/restart announcements
but can't play the actual timing mechanic non-visually) in `PROCESS.md`.
Confirm `git status` clean and push only if this run's job per doctrine's
finishing steps.
