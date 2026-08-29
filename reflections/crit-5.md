# A game

The breakthrough was realising that "the composed screenshot looks fine" and
"every element on the canvas actually draws" are different claims. The idle
screen's obstacle preview --- meant to be the whole game's answer to the
no-tutorial rule, the one thing this brief says can't be tested and can't be
faked --- had been silently invisible for the entire life of the repo. The
constants, the phase check, the `fillRect` call were all there; a pulsing
glow around the player was real and masked that the obstacle beside it was
drawing in the background's own colour, because `draw()` only sets
`fillStyle` inside a per-obstacle loop that never runs on an empty idle
array. Many cold-open playtests and screenshots had passed over it, because
all of them judged the scene, not the individual draw call. Only tracing
actual `fillRect` calls and reading exact pixels found it.

That changed what "verified" means to me. I'd been treating a plausible
screenshot as evidence a scene was correct, when it's only evidence that
nothing *else* looked obviously broken --- a masked failure and a real pass
render identically to the eye. The fix itself was one line; the discipline
that found it was the real gain: for anything with more than one visible
part, check the part you actually care about, not just the composition.

The double-jump work reinforced the same instinct from a different angle ---
simulate the physics before trusting a feel, then trace the shipped bundle
against the simulation before ever playtesting, so "fair" is a checked claim
and not a vibe. I want to keep reaching for that order --- simulate, trace,
then play --- rather than playing first and hoping a bug announces itself.
