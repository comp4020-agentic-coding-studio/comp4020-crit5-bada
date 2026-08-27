# now

## State as of this run (2026-08-27, 88.5 h to cutoff, crit 5 "A game")

Twelfth run on `comp4020-crit5-bada`. Still a deepen run — prompt hasn't
called it the finishing run yet.

With the cold-open-playtest thread and the resize-fix-coverage gap both
closed last run, took on the brief's explicit "harder, better move": added
a **double jump** as a second interacting mechanic. Chose it specifically
because it avoids the exact problem that got a duck mechanic rejected two
runs ago — a duck needs a *new* key, and a death against it can't be
attributed by the player to that specific input; a double jump reuses the
*same* jump button, so a death against a too-tall obstacle can plausibly
be attributed to "I didn't jump enough," same class of feedback as the
base mechanic already gives.

Implementation (`1e497aa`): a `jumpsUsed` counter (reset on landing/idle,
set to 1 on the launching press since that's jump 1) gates jumping via a
new pure `tryJump(jumpsUsed, maxJumps)` in `game-logic.ts` (same
extract-and-test treatment as `rectsOverlap`/`rescaleObstacleX` — 4 new
tests, 24→28). From the 3rd obstacle in a run onward, obstacles have a
35% chance of being "tall" (145–165px, blue, vs. the usual 26–54px dark
grey) — visually distinct with zero new UI/text. Verified the physics is
fair *before* touching game code: a Node simulation
(`node <inline script>`, not committed — scratch work) showed single-jump
max height is ~125px (discrete-stepped, matches the live game's real
`dt`), while a double jump timed anywhere from ~40ms to ~630ms after the
first press reaches 140–250px — a 500ms+ non-frame-perfect window. Then
confirmed live in the actual bundled build (not just the pure function)
by monkeypatching `CanvasRenderingContext2D.prototype.translate` via
`--init-script` (same node-creation/height-tracing technique already used
elsewhere in this project) — traced apex heights of exactly 125px
(single) and 229px (double, second press at 150ms), matching the
simulation precisely. `pnpm check` green throughout (28/28 tests).

Then ran the isolated blind-cold-open-playtest protocol (dedicated dev
server, main thread didn't touch `agent-browser` while the subagent ran)
specifically on the new mechanic. Result, and this is the real finding:
the double jump **is** discoverable and reproducible (confirmed at both
1280×577 and 390×844, via keyboard/click and click/tap-proxy respectively,
taking a run from a ~50-point ceiling to 114 once discovered) — but the
subagent's own initial strategy of one deliberate, well-timed press per
obstacle died against every tall obstacle and did *not* lead it to try a
second press; it only discovered the double jump once it started mashing
the same button out of frustration after repeated deaths. Zero console
errors throughout, both viewports otherwise clean, no other new bugs
found. Its other note (restart sometimes needing two presses) is expected
existing behaviour already covered by earlier runs' aria-live fix
(`87c077d`) — over→idle and idle→running are deliberately two separate
presses — not a regression, no action taken.

Deliberately did **not** add any visual hint distinguishing "this one
needs two jumps" — the brief's no-tutorial rule cuts against pre-teaching
a secondary mechanic, and "you don't get it on the first deliberate guess,
you get it by dying and experimenting" is itself Bushnell's-law "difficult
to master," not a broken mechanic. Recorded as an honest, considered
judgement call rather than a bug to fix.

## Single most important next action

Nothing currently broken or flagged. If more deepen time remains before
the finishing-run prompt: this thread (double jump discoverability) is
closed with a real, nuanced answer — don't force a repeat playtest on it.
A fresh angle worth trying next, if one is wanted: whether the *tall
obstacle spawn logic* itself needs a floor/ceiling check against the
speed ramp (does a tall obstacle ever spawn at a point in the run where
even a well-executed double jump's ~500ms window no longer fits the
reaction time available before it arrives, given `SPEED_RAMP`?) — this is
exactly the kind of question the exact-arithmetic-simulation technique
(already used for jump timing and the earlier back-to-back-obstacle
fairness check) can answer without a live pod.

If this **is** the finishing run instead: write `PROCESS.md` (map to real
commits: `1bf3c8f` build, `9d4e924` card+a11y, `c7126dd` distance-reset
fix, `aa8ce61` idle-screen affordance, `87c077d` aria-live restart fix,
`37d5530` keyboard-focus-shadowing fix, `096fb2a` resize-desync fix,
`e5a6620` resize-fix test coverage, `1e497aa` double-jump second
mechanic) and `reflections/crit-5.md` (headed "A game", not a week
number, per doctrine). The double-jump addition (`1e497aa`) is now a
strong, arguably the strongest, breakthrough candidate: it directly
answers the brief's "combining two interacting mechanics is the harder,
better move," was verified fair via simulation *and* a live traced
build before ever touching a playtest, and the playtest then surfaced a
genuinely interesting, non-obvious nuance (discoverable via frustrated
mashing, not deliberate first-guess timing) that's worth including
honestly rather than glossing over — a good fit for "what it changed
about the developer you want to be" in the reflection (resisting the
urge to over-hint a secondary mechanic just because a playtest showed
it wasn't instantly guessable). Other strong candidates, in rough order:
(2) the resize-desync self-correction (a false-negative test led to a
nearly-shipped wrong fix); (3) the keyboard-focus-shadowing fix (found by
asking a structurally different question after cold-open playtesting had
gone clean twice). Include the honest a11y limitation (fast one-button
reflex game, effectively no on-screen text, a screen-reader user gets
death/restart announcements but can't play the actual timing mechanic
non-visually) in `PROCESS.md`. Confirm `git status` clean and push only
if this run's job per doctrine's finishing steps.
