# MEMORY

Durable self-knowledge, curated run by run; ephemeral state belongs in
`now.md`, not here.

## Environment quirks (this sandbox)

- `mise`-shimmed `pnpm`/`node` fail with "config.local.toml ... not trusted"
  until `mise trust /home/ben/.config/mise/config.local.toml` is run once per
  environment. That file holds Ben's real API tokens — read it only to
  confirm it's the expected, pre-existing secrets file before trusting it,
  never copy its contents anywhere, especially not into a course repo.
  `corepack pnpm <cmd>` works as a fallback before trust is established, but
  only for the initial `pnpm install` — `corepack pnpm check` (or any script
  that shells out to bare `pnpm` internally, as this template's `check` does)
  fails with a version-mismatch error, because corepack won't switch pnpm
  versions mid-script once it's already invoked one. Once `mise trust` has
  run, drop `corepack` entirely and call plain `pnpm` for everything else.
  Confirmed in `comp4020-crit2-bada` week 3.
- `agent-browser` needs `agent-browser install` once (downloads Chrome), and
  every `agent-browser open` needs `--args "--no-sandbox"` — Chromium's
  zygote sandbox doesn't work in this container and the browser otherwise
  fails to launch at all.
- `agent-browser screenshot <path> --full` — the flag is `--full` (or `-f`),
  NOT `--full-page`. The wrong flag gets silently treated as a second
  positional arg, and a stray file literally named `--full-page` lands in
  the cwd. Check `git status` for it before the first commit of a session.
- `agent-browser open <url> --viewport WxH` is not a real flag — `open --help`
  doesn't list it, and passing it doesn't error, it's just silently ignored,
  so two screenshots taken "at" 1920×1080 and 390×844 came back byte-identical
  (both at whatever the default viewport was) until I diffed the file sizes
  and noticed. The real command is `agent-browser set viewport <w> <h>`, kept
  for the rest of the browser session. Confirmed in `comp4020-crit1-bada`
  week 2: always sanity-check a "different viewport" screenshot pair actually
  differs (dimensions or at least file size) before trusting it as evidence a
  layout was checked at both marking viewports.
- Ordering matters for the above: call `set viewport` *after* the first
  `agent-browser open --args "--no-sandbox"`, not before. With no page open
  yet, `set viewport` tries to launch its own throwaway browser without the
  sandbox flag and dies on the same zygote error as an unflagged `open`.
  Confirmed in `comp4020-crit1-bada` week 2, ~46.5h-to-cutoff verification
  run: `open` first, then `set viewport`, then `screenshot`.
- Re-running the full `pnpm check` locally (not just CI) needs `CHROME_PATH`
  exported to the `agent-browser`-downloaded Chrome, or the Lighthouse spec
  errors outright (`chrome-launcher` can't auto-detect a system Chrome that
  doesn't exist in this sandbox) rather than being skipped:
  `export CHROME_PATH=$(find ~/.agent-browser/browsers -maxdepth 2 -iname
  'chrome*' -type d | head -1)/chrome`. CI doesn't need this — it has a real
  system Chrome. Confirmed in `comp4020-crit1-bada` week 2.
- `agent-browser`'s dark-mode/reduced-motion emulation is `set media dark`,
  not `media dark` — `--help` lists it under the `set` block (`media
  [dark|light] [reduced-motion]`) but a bare `agent-browser media dark`
  returns "Unknown command" without erroring loudly in a way that's easy to
  miss in a longer command chain. Same shape as the `set viewport` gotcha
  above: always confirm the subcommand needs the `set` prefix before trusting
  a one-off flag from the top-level help summary. Confirmed in
  `comp4020-ass1-bada` week 4.
- A real keyboard-only pass is checkable directly, not just inferable from
  markup: `agent-browser eval "document.activeElement.tagName + '#' +
  document.activeElement.id"` before/after repeated `agent-browser press Tab`
  reconstructs the actual tab order (and shows whether a `role="img"`/no-
  `tabindex` element is correctly skipped, vs. accidentally reachable or
  trapping focus); `agent-browser press ArrowRight` (or Left/Home/End) after
  focusing a specific element, then `eval` on the state it should have
  changed, confirms a native control's keyboard path actually drives the
  page rather than assuming "it's an `<input type=range>` so keyboard works
  for free." Used to confirm a pointer-drag affordance layered on top of an
  already-keyboard-accessible slider didn't need its own keyboard handling —
  a real check that turned up nothing to fix, which is a legitimate outcome,
  not a wasted one. Confirmed in `comp4020-ass1-bada` week 4.
- A hand-built `new PointerEvent(...)` dispatched via `agent-browser eval`
  with `document.dispatchEvent`/`window.dispatchEvent` does NOT route through
  a prior `element.setPointerCapture(pointerId)` call — the listener actually
  bound to that element never fires, so a synthetic "drag" silently does
  nothing while looking like it ran (no error, a plausible-looking readout
  left over from an earlier real event). This gave a false pass when
  re-testing a pointer-capture-based drag interaction mid-viewport-resize in
  `comp4020-ass1-bada` — the fix was to drive it with `agent-browser mouse
  move <x> <y>` / `mouse down` / `mouse up` instead, which are real synthetic
  input events the browser routes normally through pointer capture. Any test
  of a `setPointerCapture`-based drag must use `agent-browser mouse ...`, not
  a constructed-and-dispatched `PointerEvent`. Confirmed in
  `comp4020-ass1-bada` week 4, re-verifying against the production build
  (`vite preview`) rather than the dev server.
- `agent-browser mouse move/down/up` always dispatches with
  `event.pointerType === "mouse"`, even with `set device <touch-capable-name>`
  active first — device emulation changes viewport/UA/`hasTouch`, not what
  kind of pointer event the `mouse` commands generate. There is no CLI-level
  touch/swipe dispatch; the only touch-capable channel is a WebSocket
  `input_touch` message meant for the dashboard/MCP streaming surface, not a
  plain subcommand. So "does this actually work with a real touch drag" is
  not checkable from this CLI without building a client for that channel —
  confirmed by adding a temporary `pointerdown` listener recording
  `e.pointerType` before driving a `mouse` drag, at 390×844 against a
  production build, in `comp4020-ass1-bada` week 4. Don't spend time trying
  `set device` + `mouse` again expecting a touch-typed event.
- `gh` has no stored auth in this sandbox (`gh repo view`/`gh run list` both
  fail with "please run gh auth login", exit code 4) — so repo visibility and
  CI-run status aren't checkable that way here. `curl -s -o /dev/null -w
  "%{http_code}"` on the live Pages URL is the fallback for "has this repo
  shipped (gone public) and deployed yet" — a 404 there is expected and not a
  bug for as long as the repo is still private (doctrine: CI/Pages stays
  skipped pre-ship). Confirmed `comp4020-ass1-bada` week 4, 21h-to-cutoff run.
- `agent-browser screenshot --full` resizes the page to capture the full
  scrollable height, which fires a real `resize` event on `window` — if a
  `<canvas>`-based page has a resize handler that recomputes `canvas.width`/
  `canvas.height` from the element's layout box (the normal, correct way to
  keep a canvas crisp across viewport changes), setting those attributes
  clears the canvas's drawn content as a side effect of the HTML canvas spec,
  not a bug in the page. A `--full` screenshot taken right after drawing to a
  canvas can come back showing an empty canvas even though the draw call
  worked. Don't conclude "nothing rendered" from a `--full` screenshot of a
  canvas alone — cross-check with a plain `screenshot` (no `--full`, no
  resize) or with `ctx.getImageData(...)` on the specific pixel first. Found
  and confirmed this way in `comp4020-crit4-bada` week 5: `getImageData`
  showed the correct drawn colour at the exact drag coordinate while a
  `--full` screenshot taken moments later showed nothing, and a same-moment
  non-`--full` screenshot showed the dot correctly.
- A synthetic `PointerEvent` dispatched via `agent-browser eval` with a
  pointerId other than the real mouse's own makes
  `element.setPointerCapture(pointerId)` throw `NotFoundError: No active
  pointer with the given id is found` — Chromium's real mouse pointer is
  always pointerId `1` (so events built with `pointerId: 1` route through
  capture fine), but any other id (`2`, `3`, ...) isn't a real "active"
  pointer from the browser's perspective and throws. Use pointerId `1` when
  simulating the actual pointer via synthetic events. This also surfaces a
  production-code risk worth checking on any page that calls
  `setPointerCapture`: if it throws and runs *before* the code that actually
  starts the effect it's guarding (a sound, a drag, a draw), the whole
  handler aborts silently — wrap the capture call in try/catch so a capture
  failure degrades gracefully instead of eating the interaction. Found and
  fixed this way in `comp4020-crit4-bada` week 5 (`de810ef`): `setPointerCapture`
  ran before `startVoice` in the pointerdown handler, so a throw there would
  have hidden the hint text (already unconditional) while producing no sound
  at all — the exact silent-failure shape the crit's brief rules out.
- Reading a live `AudioParam.value` right after scheduling a
  `setTargetAtTime`/ramp doesn't confirm the automation is doing anything in
  this headless sandbox — `AudioContext.currentTime` never advances here
  without a real audio output device, so `.value` reads back as its initial
  value forever even when the scheduled automation is completely correct.
  Verify automation by tracing the *call* instead: monkey-patch
  `AudioParam.prototype.setTargetAtTime` (or whichever method) via an
  `--init-script`, same technique as patching `window.AudioContext` to count
  node creation, and read back the `target` argument each call was scheduled
  with. Confirmed in `comp4020-crit4-bada` week 5 (`de810ef`) verifying a
  speed-driven vibrato-depth parameter: `.gain.value` read `0` at every
  check, but the traced calls showed the correct target (~0.8 cents for a
  slow move, clamped to 40 cents for a fast one) — the feature worked, the
  read-back method was just the wrong probe.
- Course automation can rewrite a repo's course-owned surface mid-deliverable
  without the agent doing anything — `comp4020-crit4-bada` week 5 opened its
  fifth run to find a commit already sitting at the tip
  (`starter: bring the course-owned checks forward to the template tip`,
  `7da64d2`, authored by "COMP4020 course automation") that had landed
  between runs, dropping `oxlint`/`stylelint` out of `pnpm check`, rewriting
  `check-evidence.ts` to work offline, and adding a meta-description +
  og:image requirement to `spec/invariants.test.ts` plus a placeholder
  `public/card.png`. Nothing in the routine caused this; it showed up as
  already-committed history. Lesson: don't assume the check suite's shape
  (what `pnpm check` runs, what `check:evidence` requires) is stable across
  runs on a long-open deliverable — re-read `package.json`'s `check` script
  and `spec/README.md` each run rather than trusting a previous run's memory
  of what the checks cover, since the course side can move the goalposts
  forward without touching this repo's own commits.
- `agent-browser open ... --init-script <path>` takes a **file path**, not
  inline JS text — passing a JS string directly (e.g. to monkeypatch
  `OscillatorNode.prototype.start`/`.stop` for a call-counting check) silently
  no-ops: no error, the page loads fine, and the globals the script was
  supposed to set (`window.__starts`, etc.) just read back as `undefined`
  forever, which looks identical to "the script ran but the count stayed
  zero." Always `Write` the script to a temp file first and pass that path.
  Confirmed in `comp4020-crit4-bada` week 6: a rapid keyboard-retrigger check
  (5 fast keydown/keyup pairs on the same key, verifying start/stop counts
  match 1:1 with no stuck notes) read `typeof window.__starts === "undefined"`
  with the inline-string form and only started working once rewritten to a
  file path — same "looks-like-a-pass, isn't" shape as the earlier
  `AudioParam.value` read-back gotcha in this file, worth checking any
  `--init-script` invocation the same way before trusting a zero/undefined
  result.
- A browser session that already ran one `agent-browser eval`-dispatched
  interaction (a keydown, a click) is no longer in a true cold-open state for
  a *later* screenshot in the same session — any one-shot "before first
  interaction" flag the page sets (idle animation, hint text) has already
  flipped, so a screenshot taken afterwards shows the post-interaction page
  even though nothing was screenshotted in between. Looked like a rendering
  bug (idle glow and hint text both missing) in `comp4020-crit4-bada` week 6
  until re-running `agent-browser close` + a fresh `open` produced the actual
  cold view. Always open a fresh session (or verify no prior eval/dispatch
  ran in this one) before trusting a "does the cold-open state look right"
  screenshot.
- The `--init-script`-monkeypatch technique (see the entry above this one)
  generalises past tracing `AudioParam`/oscillator call arguments to counting
  node *creation and disposal*: patch `AudioContext.prototype.createOscillator
  /createGain/createBiquadFilter` etc. to increment a counter and wrap the
  returned node's `.stop`/equivalent to increment a second counter, then hold
  a note (or a chord) for several real seconds and diff the counts before vs.
  after. Confirmed clean (no growth, stop-count matched voice-count exactly)
  in `comp4020-crit4-bada` week 6 checking whether a long-held note or chord
  leaks nodes or drifts — a real check with a legitimate "found nothing"
  result, not a rubber stamp, since the technique would have caught actual
  growth had the code re-created nodes per frame for held notes.
- A sixth cold-open pass on `comp4020-crit4-bada` (run 11, week 6, `2fb9c06`)
  found a discoverability gap distinct from the earlier keyboard-hint-content
  bug in this file: at a 1280×577 viewport (a real laptop shape once browser
  chrome eats vertical space, not an exotic device), the hint `<p>` sat in
  normal page flow directly below a canvas sized `min(70vh, 32rem)` — on that
  viewport the two together don't fit above the fold, so the only visible
  pre-interaction affordance was the idle glow blob, with no scroll indicator
  hinting there's text below. A blind subagent playtest still managed to play
  the instrument (it tried mouse/keyboard regardless), but a stranger who
  needed the hint to know *which* keys work would have missed it entirely.
  Confirmed by comparing screenshots at 1280×577 (hint y≈584, viewport ends
  577) vs. 1366×768 (hint fully visible). Fixed by making the hint an
  `absolute`-positioned, `pointer-events: none` overlay inside a
  `position: relative` wrapper around the canvas, instead of a flow sibling
  below it — this guarantees the hint is visible whenever the play surface
  itself is, independent of page height/viewport, rather than trying to
  compute a canvas height that leaves just enough room. General check: any
  page whose primary interactive surface is viewport-height-relative
  (`vh`/`dvh` sizing) and has a *second*, separate element a stranger needs
  to see before interacting (a hint, a call-to-action) should overlay that
  element on the primary surface rather than stack it in flow after — stacking
  only works for viewports at least as tall as the one it was eyeballed at.
- Sandbox quirk, not project-specific: a `pnpm dev &`-style background job
  started via one Bash tool call is not reliably visible to `jobs -l`/`kill
  %1` in a *later*, separate Bash tool call in the same session — each Bash
  invocation can get a fresh subshell, so job-control state doesn't carry
  over the way it would in one continuous interactive terminal. `jobs -l`
  came back empty and `kill %1` silently no-op'd on a vite dev server that
  was still very much running and serving requests (confirmed via `curl` and
  `ps aux | grep vite`) in `comp4020-crit4-bada` run 11. Always verify a dev
  server is actually stopped by PID (`ps aux | grep <tool>` then `kill <pid>`,
  then re-`curl`/re-`ps` to confirm) rather than trusting `jobs -l`/`kill %N`
  to have found it, when "dev server was shut down" needs to be true, not
  just attempted.
- Running `agent-browser` directly in the main run's own shell *while* a
  background subagent's prompt also tells it to drive `agent-browser`
  against the same local dev-server URL produces a corrupted report from
  the subagent — they contend for the same underlying browser
  instance/session rather than each getting an isolated one. In
  `comp4020-crit5-bada` week 6, a "blind cold-open playtest" subagent was
  launched in the background at the same moment the main run started using
  `agent-browser` itself (screenshotting mid-play frames to build a link-
  preview card) against the same `localhost:5183` dev server. The subagent's
  report came back describing behaviour that flatly contradicted the source
  and the actual live page — "the game auto-starts on page load with no
  click needed" and "ArrowUp and Enter do nothing at all" — both falsified
  within seconds by opening a fresh session serially afterward (a true cold
  open sat at score 0 doing nothing until input; ArrowUp and Enter both
  jumped and scored exactly like Space). The most likely cause: the main
  run's concurrent screenshot/keypress traffic bled into what the subagent's
  own `agent-browser` calls were observing, so it was reporting on a
  contended, cross-talking session, not a real isolated cold-open one. One
  claim from the same corrupted report *did* independently reproduce by hand
  afterward (a restart press leaving the score readout frozen at the dead
  run's number) — so a corrupted report isn't necessarily 100% fabricated,
  but nothing in it can be trusted without a serial, single-session
  re-check. General rule: never drive `agent-browser` from the main thread
  while a background subagent's task also drives `agent-browser` at the
  same URL/port — either wait for the subagent to finish before touching
  the browser yourself, or give it a separate dev-server port so the two
  sessions can't collide.
- `pkill -f "<pattern>"` can match only the wrapper shell process a
  background job was launched under, not the real long-running process it
  execs — a `pnpm dev &`-style background start with `run_in_background`
  shows up in `ps aux` as `sh -c vite --port 5185`, so `pkill -f "vite
  --port 5185"` kills that wrapper (which the pattern matches) while the
  actual `node .../vite.js --port 5185` child it spawned keeps running and
  keeps the port listening — `curl` to the port still returns 200 after the
  "kill" with no error from `pkill` itself. Confirmed in
  `comp4020-crit5-bada` week 6, run 5. Always verify a dev server is truly
  down by re-`curl`ing (or `ss -ltnp`/`lsof -i :<port>` for the real
  listening PID) after any kill, the same discipline already recorded above
  for `jobs -l`/`kill %1` not finding a backgrounded job — and if the target
  process is still there, resolve the actual listening PID from `ss`/`lsof`
  and `kill` that PID directly rather than retrying the same `pkill -f`
  pattern.
- The `agent-browser` daemon can silently restart itself mid-session
  ("Daemon version mismatch detected, restarting...") after several quick
  separate CLI calls (`eval`/`press`/`open` in a tight loop), and the
  restarted daemon does *not* remember `--args "--no-sandbox"` from the
  `open` that started the original session — the very next `open` (even to
  the same URL) fails outright with the zygote-sandbox `FATAL` error this
  file already documents, even though nothing about the sandbox itself
  changed. It looks like an unrelated regression of the original
  no-sandbox fix but isn't. Fix: `pkill -f agent-browser` to clear the
  stray daemon, then re-`open` with `--args "--no-sandbox"` again. Better
  prevention: batch a multi-step timed check into one `eval --stdin`
  script (using in-page `setTimeout`/`sleep`-via-promise and
  `KeyboardEvent`/`performance.now()`) instead of many separate quick CLI
  round-trips, which both avoids triggering the restart and is more
  precise for timing-sensitive checks anyway. Confirmed in
  `comp4020-crit5-bada` week 6, run 9, verifying a death→restart cooldown
  window (dispatched `keydown Space` to start a run, waited for a real
  death, tried an immediate restart — correctly blocked — then one after
  the 0.6s cooldown — correctly allowed — all inside one `eval` call).

## Repo-independent lessons

- stylelint-config-standard rejects BEM double-underscore class names
  (`selector-class-pattern` wants plain kebab-case) and flags a lower-
  specificity selector (e.g. bare `a`) that comes *after* a higher-specificity
  one targeting overlapping elements (`no-descending-specificity`) — write
  generic element rules before scoped/attribute-selector rules that touch the
  same elements, not after.
- Before trusting a commit message, run `git show --stat HEAD` (or check
  `git status --short` immediately before committing). A `git add` with a
  stale pathspec can silently stage far less than intended while the commit
  message you'd already drafted describes the full intended diff — the
  message and the diff can drift apart without any command erroring loudly.
  Caught this once in `comp4020-crit1-bada` week 1
  (`5fedd84` vs the corrective `bfd0d1c`); worth the extra `git show --stat`
  every time from now on, not just when something feels off.
- A visual layout that looks reasonable in the diff can still be wrong at the
  marking viewport — a 2-column CSS grid gallery had an ugly reflow gap next
  to a tall image that was only obvious from an actual `agent-browser`
  screenshot at 1920×1080, not from reading the CSS. Always screenshot at
  both marking viewports before calling a layout done, not just after
  finishing all the CSS.
- `agent-browser eval --stdin` accepts a multi-KB script via heredoc — piping
  a whole minified library (e.g. `axe-core/axe.min.js`) followed by an
  `(async () => { ...; return JSON.stringify(...); })()` IIFE is how to run a
  real accessibility audit in an actual browser from the CLI, when the
  library is too big for a plain `eval "<js>"` positional arg. `eval` awaits a
  returned promise automatically.
- axe-core's `color-contrast` rule can't resolve inside jsdom (no layout
  engine) — it reports `incomplete`, never pass/fail, especially behind any
  gradient/pattern background. An axe-in-jsdom test should assert zero
  *violations*, not zero `incomplete`; verify contrast separately, either a
  real-browser axe run (see the `agent-browser eval --stdin` trick above) or
  by hand via the WCAG relative-luminance formula. Also sanity-check any such
  harness against a deliberately broken fixture (missing `alt`, empty link)
  before trusting a clean result on the real site — confirmed useful in
  `comp4020-crit1-bada` week 1.
- The `color-contrast` incomplete result isn't only a jsdom limitation — a
  *real-browser* axe run also reports `incomplete` (not pass/fail) for text
  positioned over a `<canvas>`/`<img>`, because axe can't sample a canvas's
  drawn pixels as a "background colour" the way it can a flat CSS colour.
  Same fix as the jsdom case: verify by hand instead of trusting the
  incomplete flag either way. For text over an *animated* canvas
  specifically, the useful hand-check isn't a static luminance formula on one
  frame — it's sampling the actual drawn pixel at the text's exact position
  across the full animation (`ctx.getImageData` inside a
  `requestAnimationFrame` loop via `agent-browser eval --stdin`, run for a
  few seconds to cover the animation's periods) and computing WCAG contrast
  against the worst pixel actually seen, not the worst pixel a quick mental
  estimate assumes. Confirmed in `comp4020-crit4-bada` week 7: a manual
  full-alpha estimate suggested the idle-glow animation could dip hint-text
  contrast to ~3.9:1 (below AA) if the glow's radial gradient ever passed
  fully behind the hint's overlay position, but 361-frame samples at three
  viewports (1280×577 default, 1920×1080, 390×844) never saw the glow reach
  that pixel above background at all — worst measured ratio was 7.11:1, and
  a corrected analytical pass (accounting for the gradient's actual radius
  and alpha falloff at that specific distance) matched the empirical result.
  A real, verified "no bug here" outcome, not a rubber stamp: the full-alpha
  assumption was a genuine plausible failure mode had the glow's geometry
  been different, and only pixel sampling (not axe, not a spec test)
  distinguishes a real dip from a hypothetical one.
- A prior run's memory claiming work is "not yet pushed" can be stale — one
  run in `comp4020-crit1-bada` recorded that note, but the next run's
  `git fetch` + `git status` showed `origin/main` already matched `HEAD`
  exactly. `git status`'s "up to date" line only reflects the locally cached
  `refs/remotes/origin/*`, which doesn't update without a fetch — always
  `git fetch` before trusting any claim (including your own memory's) about
  what has or hasn't been pushed.
- Doctrine says a reflection is headed with the course source's *title*,
  never a week number, since week counts drift but the title doesn't — but
  `reflections/crit-1.md` sat headed "Week 1: the forgotten web" through
  several verification-only runs before one actually re-read the doctrine
  line against the file instead of just checking it existed and cited real
  commits. `pnpm check:evidence` only checks the filename and that citations
  resolve — it does not check the heading text, so this class of drift is
  invisible to the automated sensor and only catchable by re-reading the
  doctrine text against the file by hand. Fixed in `comp4020-crit1-bada`
  week 1 (`368d730`). Worth doing once per deliverable: re-read the doctrine's
  reflection rules against the actual reflection file, not just confirm the
  check passes — a repeated "screenshot + pnpm check" verification loop can
  run green for many cycles while missing a plain-text doctrine violation the
  tooling was never built to catch.
- Wiring a real Lighthouse check (`lighthouse` + `chrome-launcher` npm
  packages, serving `dist/` with vite's own `preview()` API): `chrome-launcher`
  auto-detects a system Chrome on Linux by running `which` for
  `google-chrome-stable`/`google-chrome`/`chromium-browser`/`chromium`, which
  GitHub's `ubuntu-latest` runner has preinstalled — no extra CI setup needed.
  This sandbox has no system Chrome, only `agent-browser`'s downloaded copy at
  `~/.agent-browser/browsers/chrome-*/chrome`; pass that as `chromePath` (or
  via `CHROME_PATH` env, which `chrome-launcher` also reads) for a local run,
  leave it unset for CI. Confirmed in `comp4020-crit1-bada` week 1: the first
  real run of the sensor failed on real SEO gaps (missing meta description,
  and — subtler — vite preview's SPA-style fallback answering a `/robots.txt`
  request with the `index.html` body, which Lighthouse then tried and failed
  to parse as robots syntax line by line). That before/after failure was
  itself the sanity-check that the sensor isn't a rubber stamp, cheaper than
  building a separate deliberately-broken fixture.
- A live re-render that does `element.innerHTML = "<template string>"` on a
  container silently deletes any static children that container held before
  — including a `<title>`/`<desc>` an `aria-labelledby` elsewhere points at.
  jsdom-based spec tests didn't catch this (they mount a bare fixture, not the
  real `index.html`), only a real-browser axe-core audit against the actual
  page did (`svg-img-alt` violation, "aria-labelledby references elements
  that do not exist"). Fixed in `comp4020-ass1-bada` week 4 (`9a95b1a`) by
  re-emitting the title/desc inside the template string on every render, and
  added a jsdom regression test asserting they survive a render — but the
  bug itself was only findable by running axe against the live DOM, not by
  reading the diff. Worth checking any `innerHTML =` on a long-lived element
  for referenced children before trusting a static a11y annotation on it.
- A repo can be provisioned late enough that the normal week-long clock never
  applies — `comp4020-crit2-bada` opened with ~30 minutes of wall clock left
  before the crit itself, not 168 hours. What held up under that compression:
  picking a real target fast (a couple of `WebFetch` passes, not a deep
  crawl), building the smallest honest version of the brief rather than an
  ambitious one, running the check suite exactly once at the end rather than
  iteratively, and writing PROCESS.md/reflection content that names the one
  real judgement call made (here: refusing to fabricate opening hours two
  real sub-pages 404'd on) rather than padding out several. Confirmed in
  `comp4020-crit2-bada` week 3.
- This `agent-browser` build has no bandwidth/latency throttle (`network
  --help` only lists `route --abort`/`--body`, `har`, and request listing —
  no `emulate`/`throttle`/CDP network-conditions command). The working proxy
  for "what does a slow connection see" is `agent-browser network route
  "**/main.ts" --abort"` (swap the pattern for whatever script the page
  defers on) then reload: whatever renders with the script permanently
  blocked *is* what a slow connection sees for however long the real request
  takes. Found a real bug this way in `comp4020-ass1-bada` week 4 (`c009c90`):
  `<output>` elements and an interactive row/chart were blank/garbled
  ("a -chunk context") until JS ran — fixed by giving the static HTML
  defaults that match what the render function computes for the inputs' own
  default attribute values, so first paint is already correct. A citation
  check the same run showed the flip side of the same discipline: don't stop
  at the paper's abstract when checking a specific claim against it — one
  clause ("worse as more documents were added") wasn't abstract-supported but
  was true in the paper's body, findable only with a further search past the
  abstract text.
- A green test suite can still be asserting the wrong contract: a spec test
  in `comp4020-ass1-bada` was literally named "is symmetric around the
  middle of the context" and passed reliably, but a web search on the cited
  paper's actual figures (Liu et al. 2023) showed the real effect is
  asymmetric — primacy (start) recall edges out recency (end) recall, not a
  clean symmetric U. The test had encoded an unverified simplifying
  assumption from the model's first draft as if it were a real invariant.
  Fixed in `comp4020-ass1-bada` week 4 (`cdd57e9`) by changing the model to
  match the source and replacing the test with one asserting the verified
  asymmetry — a case where the correction was rewriting a test, not just
  editing the implementation to keep passing it. Worth treating any test
  whose name asserts a property of the *domain* (symmetric, monotonic,
  linear, etc.), rather than a property of the code's own behaviour, as a
  claim to verify against the real source before trusting it as a fixed
  contract.
- A page's own copy can describe an affordance that was never actually built
  — same failure mode as the domain-property test above, but in prose instead
  of a test name. `comp4020-ass1-bada`'s lede said "Drag it around" from the
  very first commit; the only control was ever a range slider, never real
  dragging, and it survived several later "interaction review" passes because
  each one read the markup rather than trying to drag the thing. Only caught
  by actually loading the live page in `agent-browser` and attempting the
  literal action the copy promised. Fixed week 4 (`0dd2315`) by wiring real
  pointer drag onto the row so the copy became true instead of editing the
  copy down to match the weaker mechanic — worth treating any second-person
  imperative in a page's own copy ("drag", "click", "type") as a claim to
  physically test, not just proofread.
- Self-review of your own prose is weaker than it looks once you've read the
  file with full context loaded --- you already know why each line is there,
  which makes it hard to see it as a first-time reader would. Spawning a
  fresh subagent with *only* the passage in question plus the grading bar
  text (no other page context, no history of prior edits) got a genuinely
  different read in `comp4020-ass1-bada` week 4: it caught that a lede opened
  on a definition before earning the reader's attention, and that the
  sentence's one surprising clause was grammatically subordinate rather than
  the main point --- the same failure mode a previous run had already fixed
  elsewhere on the same page, invisible to self-review because self-review
  keeps re-confirming what it already decided was fine. Don't skip
  fact-checking the subagent's proposed rewrite before adopting it, though:
  its rewrite claimed a mid-context fact "may as well not have been supplied
  at all," and a web search on the actual cited paper (Liu et al. 2023)
  showed this undersold the real finding (GPT-3.5-turbo scores *below* its
  no-context baseline with the fact mid-context) rather than oversold it ---
  lucky this time, but the check was still necessary before treating a
  fluent-sounding claim as verified. Confirmed in `comp4020-ass1-bada` week 4
  (`6c144dc`).
- jsdom has no layout engine, so `getBoundingClientRect()` on any element
  always returns zeros — a test for pointer-drag-to-nearest-element math
  needs to stub `getBoundingClientRect` on each candidate element by hand
  (return a fixed rect per index) rather than relying on real layout; test
  the actual coordinate math as a separate pure function so most of the logic
  is verifiable without any DOM at all. Also, plain jsdom (via the `JSDOM`
  import, not the `jsdom` vitest environment) has no global `PointerEvent`
  constructor — construct via `doc.defaultView.PointerEvent` (falling back to
  `MouseEvent`) and set `pointerId` with `Object.defineProperty` if the
  fallback doesn't carry one. Confirmed in `comp4020-ass1-bada` week 4
  (`0dd2315`).
- A subagent's proposed prose rewrite can read as strictly better while
  silently dropping a live-bound element it wasn't told mattered. A blind
  fresh-eyes reviewer in `comp4020-ass1-bada` week 4 proposed a figcaption
  rewrite that improved the prose but deleted the `<output>` element bound to
  a length slider, which would have quietly killed a working live-update
  mechanic — caught by grepping `main.ts` for the element's id
  (`length-value-2`) before accepting the text, not by reading the HTML diff
  alone, since the surrounding markup still looked plausible on its own.
  Adapted the rewrite to keep the binding rather than taking it verbatim.
  Worth checking any subagent-proposed markup change for `id`/`for`
  attributes referenced elsewhere before adopting it, same discipline as
  fact-checking a subagent's prose claim against its source (`deb8dd4`).
- The blind-fresh-eyes-subagent technique (give it only the artefact plus the
  grading bar, no conversation history) generalises past prose to interaction
  *logic*: pointed at `comp4020-ass1-bada`'s explainer with the actual spec
  bullets, it found that stretching a context length left the fact's raw
  array index untouched, so a fact pinned at "the end" of a short context
  silently drifted toward "the middle" of a longer one — the opposite of what
  the page's own copy promised ("stretch the context without moving the fact
  at all"). Confirmed empirically in a real browser before trusting the
  report (`agent-browser eval` toggling the sliders and reading the output
  text), then fixed by rescaling position proportionally on length change.
  Fixing it surfaced a second, general HTML gotcha worth keeping outside any
  one project: an `<input type="range">` clamps an assigned `.value` to its
  *current* `.max` at assignment time, so code that widens the range and
  moves the value in the same handler must set `.max` first — setting value
  first silently clamps it back to the old range with no error. Confirmed in
  `comp4020-ass1-bada` week 4 (`2b174bc`).
- A drag/click surface's coordinate *math* being correct doesn't mean the
  surface is correct — the pointer-drag row in `comp4020-ass1-bada` had fixed-
  width flex children with no `flex-grow`, so the visible bordered box was
  mostly empty at low item counts (89% dead space at the minimum setting) and
  any click there silently snapped to the last item instead of responding
  proportionally. `indexOfNearestCenter` was never wrong; the DOM just didn't
  fill the container it looked like it should. Only found by comparing
  `getBoundingClientRect()` of the last child against the container at more
  than one item count (`agent-browser eval`), not by reading the CSS or
  screenshotting only the default state — the ratio only looks obviously
  broken away from the default. Fixed with `flex: 1 1 0` on the children
  (`3fc1f1d`). General check: for any container a user clicks/drags across
  proportionally, measure filled-extent vs. container-extent at more than one
  configuration before trusting the interaction.
- A further variant of the blind-fresh-eyes-subagent technique: point it at a
  brief's own cited exemplar quote, not just the grading-bar text, when the
  brief names a specific standard for what "good" looks like. Assignment 1's
  brief calls Ciechanowski's *Mechanical Watch* the genre's ceiling because
  "every part is manipulable and the explanation *is* the interaction" — given
  only `comp4020-ass1-bada`'s page text plus that quote, a blind subagent
  found the lede pre-stated the entire finding the interactive section was
  supposed to teach, so the interaction was purely confirmatory, never
  load-bearing. Fixed with a copy-only edit (moved the explicit claim past the
  interactive section, left the lede as a hook), no interaction/scope change
  (`8f12b20`, `comp4020-ass1-bada` week 4). Worth trying on any future
  deliverable whose brief names a specific ceiling exemplar with a stated
  reason it's the ceiling — that reason is a checkable claim about your own
  page, not just flavour text.
- When a spec caps `PROCESS.md` at three or four moments and separately asks
  for a reflection breakthrough, a strong late-arriving finding doesn't have
  to displace one of the capped moments — it can carry its full weight in the
  reflection instead, if the existing moments are each a distinct failure
  mode and the new one would either duplicate one (two "copy" moments here)
  or leave no clearly-weakest one to cut. `comp4020-ass1-bada`'s four
  PROCESS.md moments (a11y bug, slow-connection defaults, domain-property
  test, copy-vs-build mismatch) stayed untouched at the assignment-1
  finishing pass; the lede-catch (`8f12b20`) became the reflection's
  breakthrough instead, since it's also the one finding driven by checking
  the brief's own language rather than a testing technique — a genuine fit
  for "response to the brief" as well as "process." Confirmed
  `comp4020-ass1-bada` week 4 (`8e7c202`). Worth revisiting explicitly at the
  finishing pass with the full candidate set in view, not deciding early or
  by default.
- For any deliverable whose own judging method is "try it cold, then talk"
  (an instrument crit's pod plays before anyone explains it — see the
  crit-4 source body), doing that same cold-open pass yourself before
  adding anything finds real, specific gaps that speculative feature
  brainstorming doesn't. `comp4020-crit4-bada` week 5 did this twice: run 2
  opened the page silently and found the only pre-interaction affordance
  was hint text, nothing visual moved (fixed with an idle glow, `de810ef`);
  run 3 did the same open-cold-and-play pass again and found pointer input
  had three expressive dimensions (pitch, brightness, speed-vibrato) while
  keyboard input had exactly one (pitch only, chords included) — a real
  asymmetry invisible from reading the code, only found by actually
  chording the home row and noticing every note landed at the same fixed
  brightness (fixed with a live arrow-key brightness sweep, `58dfda4`).
  Both fixes closed a genuine gap the brief's own bar names ("two players
  sound different," "playable with whatever is at hand") rather than
  adding a feature for its own sake — worth repeating this cold-open check
  at the start of every deepen run on this kind of deliverable, not just
  once.
- A third pass of that same cold-open check on `comp4020-crit4-bada` (run 4,
  week 5, `5d92c29`) found a different bug shape: a canvas redraw that only
  ever applies a translucent fade (for a fading-trail effect) rather than a
  hard clear, combined with an animation loop that permanently stops itself
  on a one-way state flag (`interacted = true`), means whatever the loop's
  last frame happened to be — here, an idle-glow blob mid-drift — freezes on
  screen forever once the loop stops, because nothing else was ever going to
  erase it. Confirmed with `ctx.getImageData` at the exact pixel (background
  should read `[11,11,20]`; it read `[41,50,76]`, the glow's tint, both
  before and stuck-around after a mouse-down/up) rather than eyeballing a
  screenshot alone. The general check: any canvas code that (a) redraws via
  a translucent overlay instead of a hard clear, and (b) has an animation
  loop that can permanently stop itself on a state transition, needs an
  explicit hard clear *at* that transition — the loop stopping is exactly
  the moment nothing will ever finish fading the last frame out.
- A fourth cold-open pass on `comp4020-crit4-bada` (run 5, week 6, `fc9eb47`)
  found a bug the previous three didn't, because it wasn't found by clicking
  and watching but by asking "what happens if I leave mid-note": any
  `window`-scoped `keydown`/`keyup` pair for held-note state is vulnerable to
  the browser never delivering the matching `keyup` when focus leaves the
  window while the key is still physically down (alt-tab is the common real
  case) — the note drones on, and if the handler also guards re-trigger with
  something like `heldNotes.has(e.code)`, the player can't even restart that
  note once focus returns, because the map still thinks it's held. No jsdom
  jump needed to find this: dispatch a real `keydown`, monkeypatch (via
  `agent-browser open --init-script`) whatever the "stop" primitive is (here
  `OscillatorNode.prototype.stop`) to count calls, dispatch a plain
  `window.dispatchEvent(new Event("blur"))` with no keyup, and check the stop
  counter didn't move. The fix is a `window` `blur` listener that force-stops
  and clears every held-key (and, defensively, held-pointer) voice — cheap,
  and it's the only way a player can ever silence a stuck note short of
  reloading. Worth checking any keyboard-driven interactive page (not just
  instruments — games, drag tools, anything with a "held" state keyed by
  `keydown`/`keyup` pairs) for a `blur` handler before assuming keyup alone
  is enough.
- An `og:image` link-preview card is a case where the doctrine's blanket
  "commit images as AVIF" rule has a real, checkable exception: AVIF support
  for social/chat link-preview thumbnails (Slack, X, LinkedIn, iMessage) is
  inconsistent, so an og:image card is safer shipped as PNG/JPEG even though
  it's a committed image well under the 2560px/5MB guidance. Applied in
  `comp4020-crit4-bada` week 6 (`9b4fe3a`) replacing a template placeholder
  card.png with a real one composed (ImageMagick `convert`, DejaVu-Sans-Bold
  for text) from an actual `agent-browser screenshot` of the instrument mid-
  play, rather than reaching for a generic asset — the same "use the real
  artefact, not a stand-in" instinct as the mid-context-fact tests elsewhere
  in this file. Worth checking any future `og:image`/link-preview asset
  against this exception before defaulting to AVIF.
- `agent/` in a deliverable repo really is harness-owned, and not just by
  convention — editing `agent/MEMORY.md`/`agent/now.md` directly (instead of
  the outer `memory/` files this repo's `CLAUDE.md` and the doctrine actually
  point at) gets silently reverted. A run in `comp4020-crit4-bada` week 6
  wrote a real finding straight into `agent/MEMORY.md`/`agent/now.md` in the
  repo (commit `1a8fb22`) without also updating the outer `memory/` files.
  The very next "memory: tick" commit (`3501a88`) overwrote both `agent/`
  files back to the *outer* memory's (unchanged, stale) content — the tick
  process syncs outer→repo, so any edit made only in the repo copy has a
  half-life of one tick. The lesson `1a8fb22` tried to record (a `now.md`
  hand-off can be stale even sitting at `HEAD`) was itself erased this way,
  and had to be reconstructed from `git show <commit> -- agent/MEMORY.md` on
  a commit that no longer matched the working tree. Always write to the
  outer `memory/now.md` and `memory/MEMORY.md` (`/home/ben/projects/comp4020
  /agents/bada/memory/` — one level up from any deliverable repo), never to
  a repo's own `agent/` copy, and diff the outer files against `agent/` at
  the start of a run if something in `agent/` looks newer than what was just
  read — that's the sync running backwards, not forwards.
- A lowpass filter's audible effect should be measured by spectral centroid
  (harmonic-amplitude-weighted mean frequency), not RMS — RMS is dominated by
  the fundamental (the loudest partial), so a filter that meaningfully
  reshapes the harmonics above it can leave RMS nearly unchanged even when
  the timbre change is real. This is a step beyond the earlier sine-vs-filter
  finding in this file (a *sine* has no harmonics to filter at all): here the
  oscillator already had real harmonic content (a triangle wave), yet an
  RMS-based check would have called the brightness control "basically fine"
  while a centroid measurement showed under 4% shift even at the best note —
  inaudible in practice. Also generalises the earlier fix's other half: don't
  size a filter's cutoff range as one fixed Hz band shared across a
  multi-octave scale — a low note's own harmonics already sit close together
  in Hz, so a fixed range barely reaches past them, while the same range
  barely touches a high note's much more widely (in Hz) spaced harmonics
  either, for the opposite reason. Fix is filter *keytracking*: cutoff =
  note frequency × ratio, so the same brightness fraction sweeps the same
  proportional harmonic content regardless of pitch — measured to bring
  every note in the scale to a consistent ~110% centroid shift, versus <4%
  with a fixed range. `BiquadFilterNode.getFrequencyResponse()` at each
  harmonic (weighted by the oscillator's own theoretical harmonic series —
  triangle: odd only, 1/n²; sawtooth: all, 1/n) computes this centroid
  without any real audio output, so it works in this headless sandbox same
  as the original filter-response check. Fixed in `comp4020-crit4-bada`
  week 6 (`981b2f9`), also switching triangle→sawtooth since a sawtooth's
  slower harmonic falloff gives the filter more to act on. Confirmed live in
  `agent-browser` too: traced the real `BiquadFilterNode.frequency` value at
  four corners of the pad (low/high pitch × dark/bright) and the ratio to
  the note's own fundamental stayed consistent (~1.5–14×) across all four,
  where the coordinates actually landed inside the canvas's own
  `getBoundingClientRect()` — a first pass at this got nonsense-looking
  identical readings back because the test coordinates (`y=100`) landed
  above the canvas, in the page's header, not on the pad at all; always
  check the canvas's real bounding rect before trusting synthetic
  coordinates as "on the pad."
- A spawned subagent with genuinely no source-code access (only the live
  rendered page via `agent-browser` and the brief's own spec bullets) playing
  an instrument cold is a stronger check than the agent's own cold-open pass,
  because the model that wrote the code can't help pattern-matching on what
  it already knows the hint/aria-label say. Given only "here's a URL, you've
  never seen this, play it," a blind subagent in `comp4020-crit4-bada` week 6
  tried Q/W/E first (no feedback at all — no dot, no hint change) and
  concluded keyboard didn't work, because the visible hint text said "press a
  key to play" without ever saying which key; the actual keys (A–L) were
  named only in the canvas's `aria-label`, invisible to a sighted player. Not
  a functional bug — mouse/touch worked immediately — but a real gap against
  "an uninstructed stranger can begin playing" for anyone who tries keyboard
  first. Fixed by putting the same key names already in the aria-label into
  the visible hint text too (`f2e2185`). General check: when a page's
  aria-label names a control's actual affordance (specific keys, specific
  gesture) that the visible copy only gestures at vaguely, that's a
  discoverability gap for sighted users, not just a missed a11y nicety in
  reverse — worth surfacing the same specifics in both places.
- A fifth cold-open pass on `comp4020-crit4-bada` (run 6, week 6, `be24405`)
  found a bug distinct from the earlier "one-way stopping transition leaves
  the last frame stuck" bug in this file: here there was no continuous
  animation loop driving the trail/glow at all while playing — every
  fade+redraw happened synchronously inside the pointermove/keydown handlers
  themselves, so a released note's dot only ever faded on the *next*
  unrelated input event, anywhere on the pad. A player who stopped got a
  frozen, stale-looking pad instead of watching the sound decay, confirmed
  with `getImageData` on the exact drawn pixel: bit-identical across a
  multi-second idle gap, then dimming only the instant some other key was
  pressed elsewhere. Any canvas effect meant to read as "fading/decaying
  over time" (trails, glows, particle effects) needs its own
  `requestAnimationFrame` loop independent of input event cadence — a
  per-event fade is really "fades one step per *other* action," which looks
  identical to "never fades" whenever the player goes idle. The general
  cold-open lesson holds again too: found by leaving a note playing and
  doing nothing, not by reading the code.
- A sixth cold-open pass on `comp4020-crit4-bada` (run 12, week 7) — same
  blind-subagent, source-inaccessible protocol as the five before it,
  covering mouse/keyboard/touch, chording, held-note decay, blur-mid-note,
  three viewports, and console-mash — came back clean for the first time.
  This is the expected end-state of repeated adversarial testing, not a sign
  the technique stopped working: five real bugs across five prior passes,
  each fixed, then a sixth pass that finds nothing is what "the fixes are
  holding up" looks like. Don't force a seventh identical pass on a future
  run just to keep the streak going if time is better spent on finishing-run
  prep (rereading `PROCESS.md`/`reflections/README.md`, drafting reflection
  language) — a clean cold-open result is legitimate evidence, not grounds
  for suspicion that the test wasn't thorough enough.
- After a clean cold-open pass, the productive next angle was a code-level
  edge case rather than another play session: `comp4020-crit4-bada`'s
  pointerdown handler did `pointerVoices.set(e.pointerId, startVoice(...))`
  unconditionally, with no check for an existing entry. A real mouse's
  pointerId is always `1` for the whole device, and pressing a *second*
  mouse button while the first is still held fires another `pointerdown` for
  that same pointerId with no `pointerup` in between (confirmed by
  dispatching two synthetic `pointerdown`s then one `pointerup` on
  `pointerId: 1`) — so the map overwrite orphaned the first voice's
  oscillator and LFO, which then droned forever with no way to stop them
  (the map only ever pointed at the newest voice). Same
  monkeypatched-`OscillatorNode`-counter technique as the blur-mid-note fix
  elsewhere in this file, applied to a different trigger: 4 `.start()` calls
  against only 2 `.stop()` calls before the fix, 4 against 4 after. Fixed by
  stopping any existing voice for that pointerId before starting the new one
  (`6e3e321`, run 13, week 7). General check: any `Map.set(key, ...)` keyed
  by an id a real device can reuse across overlapping "sessions" (a pointer
  id, a touch id) needs to check for and clean up an existing entry first,
  the same discipline `e.repeat || keyVoices.has(e.code)` already applied on
  the keyboard side of this same file — the pointer side was the one path
  that had never been checked for the analogous case.
- The template's `pnpm check:evidence` (`scripts/check-evidence.ts`) checks
  a narrower thing than "the citation is correct": it extracts each cited
  commit hash from `PROCESS.md` by regex on the bracket text alone —
  `[`<sha>`](...)` — and verifies the SHA resolves locally with
  `git cat-file -e`. It never reads or validates the URL inside the
  parentheses at all, so a citation whose link points at the wrong org, the
  wrong repo, or a typo'd path still prints a clean
  `✓ PROCESS.md: N cited commit(s) all resolve`. Confirmed by reading the
  script directly in `comp4020-crit4-bada` week 7 while writing the
  finishing-run `PROCESS.md`. Same shape as the reflection-heading-vs-check
  gap found in `comp4020-crit1-bada` week 1 (elsewhere in this file): the
  automated sensor verifies a narrower, mechanical proxy for the
  requirement, not the requirement itself. On any deliverable using this
  template, hand-check `PROCESS.md`'s citation URLs against `git remote -v`'s
  actual org/repo before shipping — a green `check:evidence` is not evidence
  the links themselves resolve to the right place on GitHub.
- For a reflex/timing game whose only mechanic is a single input (a jump, a
  dodge), "is there a real skill ceiling" is checkable from this CLI without
  a human pod: script `agent-browser press <key>` on a fixed short interval
  (faster than a human could deliberately time) for many seconds and read
  back a game-state hook (here, an `aria-live` status element's text) rather
  than eyeballing a screenshot. If constant mashing never loses, the
  "difficulty ramp" is decorative and the game can't actually be lost by a
  player paying attention, only by one who stops playing — a real design
  flaw, not just a hard-to-verify claim. Confirmed doing this on
  `comp4020-crit5-bada`'s runner (build run, week 6): 18s of
  press-every-150ms mashing still produced multiple deaths and restarts
  (best score crept up rather than never arriving), verifying the
  speed/spawn ramp genuinely defeats pure-spam play rather than assuming it
  from reading the ramp constants. Generalises the brief's own framing for
  this deliverable ("a collision ends the round can be tested, but only
  playing can tell you whether it feels fair") — scripted rapid input is a
  way to *play* it adversarially from a CLI, a middle ground between a unit
  test and a human pod.
- Following the earlier corrupted-cold-open lesson in this file exactly
  (finish any main-thread `agent-browser` use and close the browser *before*
  launching a background blind-playtest subagent, don't touch the browser
  again until it reports back) produced a genuinely reliable report on a
  second attempt, `comp4020-crit5-bada` week 6 (`87c077d`). The isolated
  subagent's claims were checkable and mostly true this time (fair-feeling
  collisions, clean restarts, working mobile viewport) except one flagged-as-
  unconfirmed anomaly it explicitly declined to assert as a real bug — a
  sign of a well-calibrated report, not a rubber stamp. Its one confirmed,
  reproducible finding: the `#status` `aria-live` element is written only on
  death (`endRun()`) and nothing ever clears it going the other way, so a
  screen-reader user restarting after a loss keeps hearing the previous run's
  final score long after the visible canvas score has reset to 0 and climbed
  past it. Reproduced by hand (`agent-browser eval` reading
  `#status.textContent` immediately after a death, then again immediately
  after the restart press, across two independent death/restart cycles) and
  fixed with one line clearing `status.textContent` in `resetToIdle()`.
  General check, generalising the `distance`-not-reset bug fixed the previous
  run: any one-way state write that only fires on entering a state (a status
  announcement, a "you died" flag, a persisted high score) needs an explicit
  clear or reset on the *reverse* transition, checked by driving both
  directions of the transition and reading the same hook each time, not just
  the direction that's easy to trigger once.
- A "no instructions, teaches itself" brief has a checkable test for whether
  a proposed *new* mechanic is safe to add, not just a vibe call: can a
  stranger who dies against it plausibly guess the input from the death
  alone, the same way they guessed the first mechanic? On
  `comp4020-crit5-bada` (week 6), adding a Chrome-Dino-style duck mechanic
  (an overhead obstacle only passable by crouching, made uncounterable by
  jumping by keeping the player's rect overlapping it through the whole jump
  arc, not just at apex) was mechanically buildable, but there's no way to
  design a death against it that teaches "hold ArrowDown" the way the
  existing single mechanic teaches itself — every input that currently
  matters (Space/ArrowUp/Enter/click/tap) is the *same* one a stranger tries
  within seconds of landing on the page. Decided against building it for
  that reason, not from generic scope-creep caution. General check for any
  future "should this game have a second mechanic" call on a no-tutorial
  brief: a second mechanic only clears the bar if a death against it can be
  attributed, by the player, to the *specific new input* needed — not just
  "something else must have been possible."
- "Only playing can tell you whether the collision feels fair" doesn't
  require a live human/browser pod every time — a faithful Node
  reimplementation of the exact collision function plus the exact physics
  constants, driven against the worst-case parameters the real code can
  generate, is a legitimate way to answer a specific fairness question the
  same technique already used for the `BiquadFilterNode.getFrequencyResponse`
  brightness-filter check elsewhere in this file, applied to jump timing
  instead of audio. On `comp4020-crit5-bada` (week 6), simulating a
  back-to-back obstacle pair at the coded minimum gap and max height found
  that a naive "clear both with one jump" strategy has a genuinely
  frame-perfect window (~5.5ms, under one real frame) right at its
  speed-threshold of first becoming possible — which would be a real
  fairness bug if it were the only path — but the "land, then immediately
  rejump" fallback stays comfortable (246–550ms) at every speed the game
  reaches, so the scenario is fair in practice. Worth reaching for this
  method before scripting live wall-clock-dependent browser input timing
  (fiddly, and vulnerable to the separate main-thread/subagent
  `agent-browser` cross-talk issue above) whenever the fairness question is
  really about deterministic physics/collision math and the source
  constants are known — reserve live pod/subagent testing for questions a
  simulation genuinely can't answer (does it *feel* right, is the input
  discoverable, does a real device deliver events the sim assumes).
- After two consecutive clean cold-open passes on `comp4020-crit5-bada` (see
  the run-12-equivalent lesson above), the productive next angle wasn't an
  eighth identical playtest but a different question: does the game's own
  global input handler interfere with the *rest of the page*, not just the
  game surface? A `window`-scoped `keydown` listener that intercepts
  Space/ArrowUp/Enter unconditionally (so mouse/keyboard work anywhere
  without first clicking the canvas) also fires when a completely unrelated
  focusable element — here, the page's own `<a href="./">Home</a>` nav
  link — has focus, and `preventDefault()`s before the browser's native
  Enter-activates-a-focused-link behaviour can run. Confirmed with
  `agent-browser`: tab to the link, set a `window.__marker`, press Enter —
  the marker survived (no real navigation happened) and `#status` showed a
  just-finished run, proving the keypress was swallowed by the game instead
  of activating the link. Fixed by gating the handler on
  `document.activeElement` being the canvas or `document.body` only
  (`37d5530`), re-verified the same way (marker now correctly cleared by a
  real navigation, and confirmed body/canvas focus still trigger the game
  as before). General check: any page-wide keydown listener installed for
  "works without clicking anything first" convenience needs an explicit
  check that it isn't shadowing the native keyboard semantics of *other*
  focusable elements already on the page (nav links, buttons) — a cold-open
  playtest of the game itself won't surface this, since it never tabs
  anywhere except into the game.
- A resize handler that recomputes one piece of live layout state (here,
  `groundY` from `height`) is an easy place to miss a *different* piece of
  state that's stored absolute rather than derived — `comp4020-crit5-bada`'s
  `resize()` (week 6/7) recomputed the player's y and, via a live
  width-fraction in `playerRect()`, the player's x every frame, but
  in-flight `Obstacle.x` values were set once at spawn and never touched by
  `resize()` at all. A width change moved the player instantly while every
  obstacle stayed exactly where it was, turning a mid-run browser resize
  into a free pass through an obstacle that would otherwise have hit, or an
  unearned death from one that wouldn't have. Fixed by capturing `oldWidth`
  before reassigning `width` and multiplying every obstacle's `x` by
  `width / oldWidth` when not idle (`096fb2a`). General check: for any
  layout-driven object whose position is a mix of "recomputed live from a
  dimension" (the player, here) and "set once and left absolute" (the
  obstacles), a resize handler needs to explicitly migrate the absolute
  ones by the same ratio, not just recompute the live ones — the two classes
  don't automatically stay in relative sync just because both use the same
  underlying `width`/`height`.
- That same fix had a real false start worth the general lesson on its own:
  a first resize test showed the player's traced x never changing across a
  viewport change, which looked like proof the native `window` `resize`
  event doesn't fire for `agent-browser set viewport`/CDP-driven viewport
  overrides — plausible enough that a `ResizeObserver`-based replacement got
  written and nearly shipped, comment and all, asserting this as
  "confirmed." The real cause was mundane and had nothing to do with event
  firing: `canvas { width: min(90vw, 720px) }` caps the canvas's actual
  rendered width once viewport width crosses ~800px, and both test
  viewports (the default, and 1400px) sat above that threshold, so the
  canvas's `getBoundingClientRect().width` was 720px in both cases — no
  resize of the *canvas* ever happened, native event or not. Caught by
  redesigning the test with two viewports that both stay under the cap
  (500px and 900px, giving genuinely different canvas widths of 450px and
  630/720px), which showed the native listener firing and updating the
  player's x correctly, disproving the theory before the wrong fix shipped;
  reverted the `ResizeObserver` change and kept only the real fix. General
  check: before trusting a "no effect observed" result from a resize/layout
  test, verify the thing being measured (here, the canvas's own rendered
  box) actually changed at all between the two conditions — a CSS
  `min()`/`max()`/`clamp()` cap on the element under test can silently make
  two different viewport values produce one identical rendered size, and a
  clean null result from that setup proves nothing about the code being
  tested.
- A bug fixed and verified only by hand (a live `agent-browser` trace, a
  screenshot, a manual arithmetic check) is still an untested regression
  risk once the run ends — the next person to touch that code has no
  automated signal if they break it again. Where the fix's core logic is a
  pure calculation buried inside a DOM-coupled function (here, the ratio
  math inside `resize()`), extracting it into a small named pure function
  in the project's already-DOM-free logic module (`game-logic.ts`, next to
  `rectsOverlap`) and adding a couple of unit tests costs very little and
  converts a one-off manual verification into a permanent sensor. Applied
  in `comp4020-crit5-bada` week 7 (`e5a6620`) to the resize-desync fix
  (`096fb2a`, itself only traced by hand the run before): pulled
  `rescaleObstacleX(x, oldWidth, newWidth)` out of `resize()`, three tests
  added, 21→24 in the suite. Worth doing this as a default follow-up
  whenever a deepen run's cold-open-playtest thread goes clean and a prior
  run's fix is sitting on manual verification alone — better use of
  remaining deepen time than forcing a repeat playtest past the
  established two-clean-passes-and-stop bar. Not every fix extracts this
  cleanly, though: a fix that's really about DOM state (an aria-live
  string, a visual affordance) doesn't have a pure-function core to pull
  out, and forcing one would just be testing implementation rather than
  the contract — that class is still better checked live.
