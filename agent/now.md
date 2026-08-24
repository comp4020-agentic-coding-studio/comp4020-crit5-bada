# now

## State as of this run (2026-08-24 ~15:45 AEST, 166.5 h to cutoff, crit 5 "A game")

First run on `comp4020-crit5-bada`. Fetched `crits/05-game.json`: brief is
"build a tiny browser game" with one mechanic, "obvious in ten seconds, still
interesting at five minutes, no tutorial in sight" (Bushnell's law, Mario 1-1
as the affordance-design exemplar). Acceptance bar: deployable, losable (a
wrong move is possible, play ends in a win/loss/finish), teaches itself with
literally no instructions on or off screen, a stranger reaches an ending
inside five minutes, one rule has a focused automated test, commits show
growth, and I can account for how the work was directed/grounded/corrected.
This is the plan-and-build run, not the finishing run (166.5h remaining) —
per doctrine, no `PROCESS.md`/reflection work yet.

Built a one-button jump/dodge endless runner (canvas, no words anywhere
except numeric score):

- `game-logic.ts`: pure `rectsOverlap` AABB test — the one game rule that's
  automated (`spec/collision.test.ts`, 4 cases including a same-axis-only
  overlap that shouldn't count and a touching-edges-isn't-a-collision case).
- `main.ts`: idle state bobs the player in place; the first input (space,
  arrow-up, enter, or a click/tap on the canvas — `pointerdown`, so touch
  works for free) both performs the jump *and* starts the run, so the
  mechanic is discovered by trying the obvious thing, not told. Speed and
  obstacle frequency ramp with survival time. Losing = colliding with an
  obstacle; a `role="status" aria-live` element (visually hidden) announces
  the numeric score on death for screen readers without narrating rules.
  `localStorage` keeps a best-distance high score.
- `index.html`/`styles.css`: full-bleed dark page, canvas centred and
  responsive (`min(90vw,720px)` × `min(60vh,480px)`), `touch-action: none`.
  Title "Jump", meta description updated. Did **not** touch `public/card.png`
  this run — it's still the template placeholder.

Committed as [`1bf3c8f`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-bada/commit/1bf3c8fba91bb744c9499dc6922ee92cb9ec3191).
`pnpm check` green (21/21 tests, typecheck + build clean) before committing.

Verified live in `agent-browser`, not just by reading the code:

- Cold open: idle bob, zero text besides a "0", console clean.
- First `press Space` both jumped and started the run (screenshot confirmed).
- Confirmed a loss is real and reachable: let a run play out with no input
  after a mashing burst, `#status` read "66. Best 66." — the aria-live text
  is a legitimate way to check "did it actually end" from the CLI without a
  visible game-over screen.
- Confirmed restart: a press after death returned to the idle-bob state.
- Confirmed click/tap (`mouse down`/`up` on the canvas) triggers jump the
  same as keyboard.
- Confirmed mobile viewport (390×844 via `set viewport`, called after the
  first `open`, per the ordering lesson in `MEMORY.md`) renders the canvas
  correctly, not just cropped.
- **Real check, not assumed**: mashed space every ~150ms for 18s straight
  to test whether constant jumping trivialises the game. It didn't — the
  player died and restarted multiple times within that window (best crept
  from lower values up to 59, final read mid-run at 47), confirming the
  speed ramp creates a genuine skill ceiling rather than a spam-to-win
  exploit. Worth citing in `PROCESS.md` later: this is the "only playing
  can tell you whether the collision feels fair" half of the brief, done
  empirically via scripted input timing, not by eyeballing.
- Killed both preview servers used for these checks by PID and re-curled to
  confirm down (background-job tracking across separate Bash calls isn't
  reliable in this sandbox — see `MEMORY.md`).

## Single most important next action

Deepen the game before the next run treats this as further along than it
is. Concretely, in priority order:

1. **Replace `public/card.png`** with a real screenshot-derived link-preview
   card (still the template placeholder from `git log` — never touched this
   run). Same ImageMagick-composite approach as `comp4020-crit4-bada`
   week 6.
2. **A11y pass**: the canvas currently has only an `aria-label` and no
   keyboard focus ring is exercised in practice since the jump listener is
   on `window`, not the canvas — a screen-reader user gets no ongoing
   feedback during play, only a death announcement. Worth deciding whether
   a game this reflex-based can be made meaningfully screen-reader
   accessible at all, or whether the honest answer is "no, and say so."
3. **A blind cold-open pass** (the technique used repeatedly on crit 4,
   `MEMORY.md`): spawn a subagent with only the live URL, no source access,
   told nothing except "you've never seen this, play it." Confirm it
   discovers the jump mechanic from the idle bob alone, within the five
   minutes the spec requires, on both a fresh desktop and mobile viewport
   session. This is the single most likely place a real bug hides, per the
   crit-4 track record — five of six cold-open passes there found something
   real.
4. Consider whether "still interesting at five minutes" needs anything
   beyond the speed ramp — e.g. a visible best-score/current-score contrast
   already exists (grey vs black digits), but there's no other progression
   signal. Not urgent; the mash-test above is real evidence the core loop
   already has some depth.

Not yet started: `PROCESS.md` rewrite and `reflections/crit-5.md` — both are
finishing-run work per doctrine, don't start them early.
