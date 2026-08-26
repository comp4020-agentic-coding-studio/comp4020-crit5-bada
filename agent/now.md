# now

## State as of this run (2026-08-26, 118.5 h to cutoff, crit 5 "A game")

Eighth run on `comp4020-crit5-bada`. Still a deepen run (`PROCESS.md`/
`reflections/crit-5.md` still template — correctly untouched per doctrine,
which reserves those for the finishing run). This run made a real code
change, not another cold-open playtest.

Confirmed `pnpm check` green on arrival (typecheck, build, 21 tests across
3 files), matching the last hand-off's clean state. Rather than forcing an
eighth identical cold-open pass (memory already said two clean passes in a
row is legitimate evidence, not grounds to keep repeating the same test),
tried a genuinely different angle: does the game's page-wide keydown
listener interfere with the *rest* of the page, not just the game itself.

**Found and fixed a real bug**: the `window`-scoped keydown handler
intercepted Space/ArrowUp/Enter unconditionally, so tabbing to the page's
own "Home" nav link and pressing Enter (standard keyboard link activation)
got swallowed by the game instead of navigating — confirmed with
`agent-browser` (a `window.__marker` set before the keypress survived,
proving no real navigation happened, while `#status` showed a run had
just started and ended). Fixed by gating the handler to only act when
`document.activeElement` is the canvas or `document.body`
(`37d5530`) — re-verified both that the link now navigates correctly on
Enter, and that body/canvas focus still trigger the game exactly as
before. Full detail and the general lesson (any "works without clicking
first" page-wide key listener needs to check it isn't shadowing other
focusable elements' native semantics) is in `memory/MEMORY.md`.

Ran `pnpm check` again after the fix — still green. Committed and pushed
(`37d5530`, `git status` clean, `origin/main` matches).

## Single most important next action

No known open bug. The game has three real fixes from playing/testing now
(idle affordance, distance-reset, aria-live restart clear, mash-ceiling
check from earlier runs, plus this run's keyboard-focus-shadowing fix) —
plenty of material for `PROCESS.md`'s "moments that mattered" and the
reflection's breakthrough, whichever run is told it's last.

If more deepen time remains before the finishing-run prompt: this run's
angle (does the game shadow other page elements' native behaviour) is a
reasonable one to try once more in a different shape if something occurs —
e.g. check `Tab` order doesn't get trapped, or whether any other native
keyboard affordance (browser find-in-page shortcuts, etc.) gets swallowed —
but don't force it if nothing concrete comes to mind. Doing nothing further
is still defensible.

If this **is** the finishing run instead: write `PROCESS.md` (map to real
commits: `1bf3c8f` build, `9d4e924` card+a11y, `c7126dd` distance-reset fix,
`aa8ce61` idle-screen affordance, `87c077d` aria-live restart fix, `37d5530`
keyboard-focus-shadowing fix) and `reflections/crit-5.md` (headed "A game",
not a week number, per doctrine). Strong breakthrough candidates, in rough
order of strength: (1) this run's keyboard-focus-shadowing fix — found by
asking a structurally different question (does the game interfere with the
*rest* of the page) after cold-open playtesting of the game itself had gone
clean twice running, a genuine methodology point about knowing when to
change the angle of attack rather than repeat the same test; (2) the
corrupted-vs-isolated blind-subagent contrast across multiple runs — a
repeatable methodology lesson; (3) the faithful-simulation verification of
back-to-back-obstacle jump timing (a concrete, non-live-pod answer to the
brief's own "only playing can tell you whether the collision feels fair"
bullet); (4) the mash-test skill-ceiling check from the build run. Include
the honest a11y limitation (fast one-button reflex game, effectively no
on-screen text, a screen-reader user gets death/restart announcements but
can't play the actual timing mechanic non-visually) in `PROCESS.md` rather
than glossing over it — the standing honest call across many runs now.
Confirm `git status` clean and push only if this run's job per doctrine's
finishing steps.
