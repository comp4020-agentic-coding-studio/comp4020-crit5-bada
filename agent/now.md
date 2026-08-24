# now

## State as of this run (2026-08-24 ~21:40 AEST, 160.5 h to cutoff, crit 5 "A game")

Second run on `comp4020-crit5-bada`. Still a deepen run, not the finishing run
(160.5h remaining) — per doctrine, `PROCESS.md`/`reflections/crit-5.md` are
still untouched, on purpose.

Worked the previous run's priority list from its own `now.md` hand-off:

1. **`public/card.png` replaced.** No longer the template placeholder — built
   from a real `agent-browser` screenshot mid-play (cropped to the canvas,
   trimmed to the action band, composited with ImageMagick over the site's
   own dark background, DejaVu-Sans-Bold title text), same technique as
   `comp4020-crit4-bada` week 6. Verified served at `http://localhost:5183/card.png`
   (200, 1200×630, 6.7KB). Committed [`9d4e924`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-bada/commit/9d4e924).
2. **Small real a11y fix**: canvas got `tabindex="0"` so it's reachable in
   the keyboard tab order — `styles.css` already had a `canvas:focus-visible`
   rule with nothing to attach to. Confirmed via `agent-browser` (Tab twice →
   `document.activeElement` is `CANVAS#game`, focus ring visible in a
   screenshot). Bundled into the same commit as the card.
3. **Genuine a11y decision, not implemented**: this is a fast one-button
   reflex game with zero on-screen text (correctly, per the brief's own
   no-tutorial rule) — a screen-reader user gets the death announcement via
   `#status` `aria-live` but cannot play the actual timing-based mechanic
   non-visually in any meaningful sense. Concluded the honest answer is to
   say this plainly in `PROCESS.md` at finishing time, not invent a fake
   parallel non-visual mode that the brief's own scope doesn't call for.
4. **Blind cold-open playtest — ran, but the report was largely wrong.**
   Launched a background subagent with no source access, told only "here's
   a URL, you've never seen this, play it." **Its two headline claims were
   false**: "the game auto-starts on page load with no click needed" and
   "ArrowUp and Enter do nothing at all" — both falsified within seconds by
   opening a fresh session serially afterward (true cold open sits at score
   0 doing nothing until input; ArrowUp and Enter both jump and score
   exactly like Space, confirmed with screenshots). Root cause, recorded in
   `MEMORY.md`: the main run was *also* driving `agent-browser` against the
   same `localhost:5183` dev server at the same time (building the card
   screenshot) — the two sessions almost certainly contended for the same
   browser instance, so the subagent was observing a corrupted, cross-talked
   session, not a real isolated one. **Lesson for next time: never run
   `agent-browser` in the main thread while a background subagent's task
   also drives `agent-browser` at the same URL — wait for it to finish, or
   use a different port.**
5. **One real bug did survive independent, serial, by-hand verification**
   from that same corrupted report: after a death, `resetToIdle()` never
   reset `distance`, so the score readout stayed frozen at the just-ended
   run's number through the "return to idle" beat — a restart press looked
   like it did nothing until the *second* press actually started scoring
   again. Reproduced by hand on a fresh serial session (froze at "43",
   confirmed with a screenshot), fixed with one line (`distance = 0;` in
   `resetToIdle()`), reproduced-then-confirmed-fixed the same way (idle
   readout now shows `0` immediately). `pnpm check` green (21/21) before and
   after. Committed [`c7126dd`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-bada/commit/c7126dd).
   This is the "one change came from playing rather than reading code" the
   brief's own spec asks for — genuinely earned, even though the report that
   pointed at it was mostly unreliable.

`pnpm check` green throughout. Dev server (port 5183) and `agent-browser`
both confirmed shut down by PID + re-`curl` at the end of this run.

## Single most important next action

Not the finishing run yet — next run should either deepen further or, if the
prompt calls it the last run, do the finishing steps in doctrine order:

1. If more deepening time remains: reconsider now.md's old point 4 (does
   "still interesting at five minutes" need anything beyond the speed ramp?
   — the mash-test evidence from the build run says the core loop already
   has real depth, so this is optional polish, not a gap) and/or run
   **another** blind cold-open pass — properly isolated this time (no
   concurrent `agent-browser` use from the main thread) — since the last one
   was corrupted and didn't actually deliver a trustworthy verdict on
   discoverability, only one incidentally-true bug.
2. If this is the finishing run: write `PROCESS.md` (map to real commits:
   `1bf3c8f` build, `9d4e924` card+a11y, `c7126dd` the playtest-found bug fix)
   and `reflections/crit-5.md` (headed "A game", not a week number — the
   breakthrough candidate is either the mash-test skill-ceiling check from
   the build run or the corrupted-cold-open-report lesson from this run,
   whichever better fits "the developer you want to be" prompt). Include the
   honest a11y limitation in `PROCESS.md` rather than glossing over it.
   Confirm `git status` clean and push only if explicitly this run's job per
   the doctrine's finishing steps.
