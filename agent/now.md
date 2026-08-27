# now

## State as of this run (2026-08-28, 77.5 h to cutoff, crit 5 "A game")

Thirteenth run on `comp4020-crit5-bada`. Still a deepen run — prompt hasn't
called it the finishing run yet. `pnpm check` green (28/28) at the start and
unchanged; no commits this run, only investigation.

Closed out the flagged next-action from last run: does the tall-obstacle
spawn logic need a floor/ceiling check against `SPEED_RAMP`, i.e. can a tall
obstacle spawn at a point where even a well-executed double jump's ~500ms
timing window no longer fits before it arrives? Answered with a Node
simulation of the exact jump physics (`GRAVITY`, `JUMP_VELOCITY`, the real
integration step) plus the exact travel-time formula (`(canvas width×0.88+20)
/speed`, using the CSS-capped 720px width and `player.x`) — not committed,
scratch work, same technique as the earlier obstacle-pair and jump-apex
checks:

- Reaction+arrival time shrinks continuously as `speed` ramps
  (`speed = BASE_SPEED + SPEED_RAMP·t`, unbounded — no cap anywhere in
  `main.ts`). It drops under ~1.5s (comfortable-reaction territory) at
  ~27s of continuous survival, and under the ~0.75s floor a
  frame-perfect double jump needs to even reach 145px clearance at
  ~114s (score in the low thousands by then).
- Concluded this is **not a bug** — it's an intentional, unbounded
  difficulty ramp, the same shape as Chrome's Dino game: the ceiling is
  supposed to eventually outrun any player, that's Bushnell's-law
  "difficult to master" doing its job, not a fairness defect. It also
  doesn't touch the brief's "reach an ending inside five minutes" bar,
  since that's about a stranger finishing (losing) fast on an early
  attempt — trivially true here, tall obstacles start from the 3rd
  obstacle — not about surviving five continuous minutes.
- No code change made. This is a genuine "checked, found nothing to
  fix" outcome, not a rubber stamp: the simulation could have found a
  much earlier impossibility point (e.g. inside the first 5–10 seconds,
  which *would* have been a real bug worth fixing), and didn't.

## Single most important next action

Nothing broken or flagged. Deepen time remains before the finishing-run
prompt, but the two headline threads (double-jump fairness/discoverability,
and now the speed-ramp/tall-obstacle fairness question) are both closed with
real, verified answers — don't force a third identical angle just to keep
busy. If another deepen run lands before the finishing prompt, worth
rereading `spec/README.md`'s checklist bullets fresh (not from memory) in
case there's a spec requirement not yet explicitly covered, or doing one more
cold-open playtest pass focused specifically on the tall-obstacle visual
distinction (does the blue-vs-grey colour difference actually read at a
glance across the two marking viewports, given colour vision variation) —
that's a discoverability question the simulation above can't answer.

When this **is** the finishing run: write `PROCESS.md` (map to real commits:
`1bf3c8f` build, `9d4e924` card+a11y, `c7126dd` distance-reset fix, `aa8ce61`
idle-screen affordance, `87c077d` aria-live restart fix, `37d5530`
keyboard-focus-shadowing fix, `096fb2a` resize-desync fix, `e5a6620`
resize-fix test coverage, `1e497aa` double-jump second mechanic) and
`reflections/crit-5.md` (headed "A game", not a week number, per doctrine).
The double-jump addition (`1e497aa`) is still the strongest breakthrough
candidate — directly answers the brief's "combining two interacting
mechanics," verified fair via simulation and a live traced build before ever
playtesting, and the playtest surfaced a genuinely honest nuance (discovered
via frustrated mashing, not deliberate first-guess timing) worth including
rather than glossing over. Other candidates in rough order: (2) the
resize-desync self-correction (a false-negative test nearly shipped a wrong
`ResizeObserver` fix); (3) the keyboard-focus-shadowing fix. Include the
honest a11y limitation (fast one-button reflex game, effectively no on-screen
text, a screen-reader user gets death/restart announcements but can't play
the actual timing mechanic non-visually) in `PROCESS.md`. Confirm `git status`
clean and push only if this run's job per doctrine's finishing steps.
