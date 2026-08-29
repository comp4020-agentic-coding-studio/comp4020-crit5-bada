# now

## State as of this run (2026-08-29, 40.5 h to cutoff, crit 5 "A game")

Eighteenth run on `comp4020-crit5-bada`. Still a deepen run — prompt still
hasn't called it the finishing run (`PROCESS.md` is still template, no
`reflections/crit-5.md`). `pnpm check` green (28/28) at start and end.

Re-fetched the course source: brief unchanged. Followed the prior run's
next-action (audit any other DOM/Web API call in `main.ts` that could
throw or misbehave). That audit itself came up empty — `canvas.getContext
("2d")` returning `null` is the only other un-guarded browser API call,
and it's not a meaningfully fixable case (a canvas game has no fallback
without canvas support, so guarding it buys nothing).

But going back for a genuinely fresh cold-open pass (last one predates the
double-jump, resize, and storage-guard commits) turned up a real,
previously invisible bug: the idle-screen obstacle preview — the
`IDLE_OBSTACLE_RATIO`/`IDLE_OBSTACLE_HEIGHT` rect drawn only in `phase ===
"idle"`, evidently meant as the game's own affordance hint that jumping
matters before the player does anything — was rendering **completely
invisible**. `draw()` sets `ctx.fillStyle` to the obstacle colour only
inside the per-obstacle loop (`for (const o of obstacles) { ctx.fillStyle
= ...; ctx.fillRect(...) }`), and on the idle screen `obstacles` is always
`[]`, so that loop never runs and the idle-preview `fillRect` right after
it inherits whatever `fillStyle` was last set — the background fill colour
`#e8e4da`, set at the very top of `draw()`. Confirmed by monkeypatching
`CanvasRenderingContext2D.prototype.fillRect` via `agent-browser
--init-script` to log `this.fillStyle` on every call: the idle-preview
call logged `fillStyle: "#e8e4da"` (identical to the background fill
logged two calls earlier), and a direct `getImageData` read at the
preview's exact drawn coordinates came back as flat background colour, no
obstacle-shaped region at all. This is a genuinely serious finding against
this brief specifically — "the opening screen itself has to make the
first move obvious" is the crit's one hard requirement, and this asset
existed in the code (the constants, the phase check, the fillRect call)
but had never actually been visible on screen in any prior playtest,
screenshot, or cold-open pass across seventeen runs, because every one of
those checks looked at the *composed* idle screen (the pulsing red glow
was real and visible, so nothing looked broken) rather than isolating
each drawn element's actual fill colour. Fixed with one line —
`ctx.fillStyle = "#3a3a3a";` immediately before the idle-preview
`fillRect` (matching the short-obstacle colour used everywhere else) —
re-verified live: `getImageData` at the same coordinates now reads
`58,58,58,255`, and a screenshot shows a clearly visible dark bar sitting
on the ground line next to the player. `pnpm check` still 28/28 after the
fix. Committed (`bd68e48`) and pushed. Dev server (port 5241) torn down by
real PID (`kill`, not `pkill`/`jobs`) and reconfirmed down via `curl`
(refused) and `ss -ltnp` (no listener).

General lesson worth keeping past this specific bug: a canvas draw call
with no explicit `fillStyle` set *immediately* before it inherits
whatever the *previous* draw call left the context in — normal canvas
semantics, not a bug in the API — so any conditional/rare-branch draw
call (a phase-specific overlay, an idle-only hint, anything that isn't
inside the same loop that sets colour per-iteration) needs its own
explicit `fillStyle`/`strokeStyle` set right before it, never assumed
inherited from a sibling branch. A screenshot of the *composed* scene
looking plausible doesn't clear this — the fix here was found by tracing
actual `fillRect` calls and reading exact pixels, not by eyeballing a
render that had *other* visible elements (the glow) masking the missing
one.

## Single most important next action

The idle-preview-invisible bug is exactly the kind of "one change came
from playing the finished game rather than reading its code" moment
the brief's spec bullet calls for, and it's a stronger PROCESS.md/
reflection candidate than the storage-guard fix from the previous run —
it's specifically about the no-tutorial affordance requirement, not a
generic robustness fix. If another deepen run lands before the finishing
prompt: do one more fresh cold-open pass (ideally an isolated background
subagent, following the main-thread/subagent `agent-browser` non-overlap
rule already in `MEMORY.md`) focused specifically on the idle screen
now that the preview obstacle is actually visible — confirm a genuinely
new player would read "small dark bar ahead, red glowing square is me"
as "I should probably jump over that" without further prompting. If that
comes up clean, this deliverable is very likely converged: prioritise
drafting `PROCESS.md` and `reflections/crit-5.md` over forcing a further
distinct bug-hunting angle.

When this **is** the finishing run: write `PROCESS.md` (map to real
commits: `1bf3c8f` build, `9d4e924` card+a11y, `c7126dd` distance-reset
fix, `aa8ce61` idle-screen affordance, `87c077d` aria-live restart fix,
`37d5530` keyboard-focus-shadowing fix, `096fb2a` resize-desync fix,
`e5a6620` resize-fix test coverage, `1e497aa` double-jump second
mechanic, `4c95a1b` canvas-height-floor fix, `04c362d` localStorage
storage-failure guard, `bd68e48` idle-preview-invisible fix) and
`reflections/crit-5.md` (headed "A game", not a week number). Two strong
breakthrough candidates now: the double-jump addition (`1e497aa`,
directly answers "combining two interacting mechanics," verified fair via
simulation + traced build before playtesting) and this run's idle-preview
fix (`bd68e48`, the literal "the opening screen has to make the first
move obvious" requirement was silently unmet for the entire life of the
repo until a fresh cold-open pass caught it). The idle-preview fix is
probably the stronger single reflection breakthrough — it's the most
direct hit on the brief's one truly hard, unfakeable requirement, and the
process point (a screenshot of the composed scene looked fine; only
tracing actual draw calls found it) is a genuine "process, not vibes"
story. Include the honest a11y limitation (fast one-button reflex game,
effectively no on-screen text, a screen-reader user gets death/restart
announcements but can't play the actual timing mechanic non-visually) in
`PROCESS.md`. Confirm `git status` clean and push only if this run's job
per doctrine's finishing steps.
