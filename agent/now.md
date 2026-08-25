# now

## State as of this run (2026-08-25 ~21:15 AEST, 136.5 h to cutoff, crit 5 "A game")

Fifth run on `comp4020-crit5-bada`. Still a deepen run (`PROCESS.md`/
`reflections/crit-5.md` still template — confirmed, left untouched on
purpose). No code changes this run — closed out the one concrete open item
from the previous hand-off, and it came back clean.

**Resolved the untested back-to-back-obstacle double-jump-timing edge case**
flagged last run. Rather than script live browser timing (fiddly, real
wall-clock-dependent, and easy to corrupt per the earlier main-thread/
subagent `agent-browser` cross-talk lesson), verified it with a faithful
Node simulation of the actual physics/collision code
(`game-logic.ts:rectsOverlap` plus the exact constants from `main.ts`:
`GRAVITY=2200`, `JUMP_VELOCITY=-760`, `PLAYER_SIZE=30`, `MIN_GAP=240`,
obstacle height range 26–54) — same "reuse the real constants, simulate
faithfully" method as the earlier `BiquadFilterNode.getFrequencyResponse`
brightness-filter verification, applied here to jump timing instead of
audio. Tested the true worst case the code can generate: two obstacles back
to back at the coded minimum gap (240px of travel) and both at max height
(54px).

Findings, swept across speed 300 (game start) to 2000 (~well past a 5-minute
session's ramp, since `SPEED_RAMP=5px/s²`):

- A single jump clearing *both* obstacles only becomes geometrically
  possible once speed ≥ ~536–600 (the fixed ~0.53s "above 54px height"
  window only covers enough ground at higher speed). Right at that
  threshold (speed 600) the single-jump window is razor-thin (~5.5ms — under
  one real frame at 60fps, effectively frame-perfect and not a strategy a
  player should rely on there).
- But the **land-between-and-immediately-rejump** strategy (clear obstacle
  1, land, jump again the instant grounded) has a wide, comfortable timing
  window at *every* speed tested: 246–550ms, never razor-thin, always far
  larger than one real frame. A player never needs the frame-perfect
  single-jump path — the robust fallback strategy is fair across the whole
  speed range the game can reach.
- Conclusion: the back-to-back-obstacle scenario is **not** an unfair/
  impossible edge case. Real finding, not a rubber stamp — the single-jump
  transition point genuinely is razor-thin and would have been a legitimate
  bug if it were the *only* available strategy there; it isn't, because
  double-jump stays generous throughout.

No code change needed. `pnpm check` reconfirmed green (21/21) at the end of
this run. Dev server (port 5185, spun up then abandoned in favour of the
Node simulation) confirmed killed by PID + re-curl (`ps`/`ss` showed the
underlying vite node process, PID `3530832`, survived a `pkill -f` match on
the wrapper shell command — always fall back to `ss -ltnp`/`lsof -i` and
kill the actual listening PID if a `pkill -f` pattern only matches the
parent `sh -c` wrapper, not the real process). `git status` clean, nothing
to push (not the finishing run).

## Single most important next action

No open items remain from the punch list built up over runs 2–4 (second-
mechanic question: resolved, decided against; corrupted-vs-isolated
blind-subagent playtest: done twice, clean; back-to-back-obstacle timing:
resolved this run, clean). The game is in a genuinely solid, now
triple/quadruple-validated state. If more deepening time remains before the
finishing-run prompt arrives, there is no known-open bug or untested edge
case to chase — don't manufacture new scope. A reasonable use of a further
deepen run, if one comes, is a fresh cold-open blind-subagent pass anyway
(cheap, and the technique has found real bugs 5 times before going clean —
but per the run-12 lesson, a clean pass is a legitimate outcome too, not
grounds to keep repeating it indefinitely).

If this is the finishing run instead: write `PROCESS.md` (map to real
commits: `1bf3c8f` build, `9d4e924` card+a11y, `c7126dd` distance-reset fix,
`aa8ce61` idle-screen affordance, `87c077d` aria-live restart fix) and
`reflections/crit-5.md` (headed "A game", not a week number). Strong
breakthrough candidates: the corrupted-vs-isolated blind-subagent contrast
across two consecutive runs (a repeatable methodology lesson, confirmed
twice), or the mash-test skill-ceiling check from the build run, or this
run's faithful-simulation verification of jump-timing fairness (a concrete
instance of the brief's own "only playing can tell you whether the
collision feels fair" bullet, answered by simulation rather than a human
pod). Include the honest a11y limitation (fast one-button reflex game, zero
on-screen text, a screen-reader user gets death announcements but can't
play the actual timing mechanic non-visually) in `PROCESS.md` rather than
glossing over it — this has been the standing honest call for four runs
now. Confirm `git status` clean and push only if this run's job per
doctrine's finishing steps.
