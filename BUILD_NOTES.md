# Neon Salvage — build notes

## The game

A neon top-down arcade collector/dodger, written from scratch in plain ES modules (no
libraries, no assets, no network). You pilot a salvage ship through a drifting asteroid
field, collect gold salvage orbs, chain pickups into a combo up to x5, and — once you have
collected enough orbs in the wave (6 in wave 1, one more each wave) — grab the exposed
magenta core to advance. Clear all 5 waves to win. Comets drift across the field from
wave 1; mines (armed after 1s) join from wave 2. Three hull hearts; a hit costs one,
resets the combo, and grants 1.5 s of invulnerability. Clearing a wave repairs one heart.

Why this shape: the AI judge ranks entries by screenshots and a source outline, so the
game is built to *look* like a game in four stills — a glowing title screen, busy
mid-game action with a readable HUD, a red game-over screen, and a green victory screen —
while still being a complete, winnable, losable game underneath. The core-exposure rule
exists because the first play-test showed a beeline-to-the-core autopilot winning in 6
seconds; waves now take real play to clear (a careful autopilot wins in ~60 s; a careless
one dies in wave 1).

## Controls

- Move: WASD / arrow keys, or steer with the mouse (the ship follows the pointer).
- Dash: Space or click (Shift also works) — a burst of speed with a brief shield, 2 s cooldown.
- Pause: P or Esc. Mute: M.
- Start / restart: Space, Enter, or click.

## What each screenshot shows

- `1-start.jpg` — title screen: the rules, the controls, "Press Space or click to launch".
- `2-play.jpg` — mid-game, wave 4: score 2850, "SALVAGE 7/9 TO EXPOSE THE CORE", 3 hearts,
  mines, comets, orbs, the ship with its trail, "DASH READY [SPACE]".
- `3-end.jpg` — game over: "RUN LOST", score 580, 0 of 5 waves cleared, red vignette.
- `4-victory.jpg` — victory: "SECTOR CLEARED!", score 3440, time 0:59, 41 orbs, 1 hit taken.

All four are real renders of the game's own code in desktop Chrome (1280x720, JPEG q85),
taken through deterministic `?shot=start|play|end|win&seed=1` scenes driven by in-game
autopilots — a careful pilot for play/win, a careless orb-chaser that ignores the core
for end. Nothing is composited or edited.

## Files

- `game/index.html` + `game/src/` — the game. One job per module: `config.js` (tuning and
  palette), `random.js` (seeded mulberry32 RNG), `audio.js` (WebAudio synth SFX),
  `input.js` (keyboard + pointer), `particles.js` (bursts, floating score text),
  `world.js` (rules, spawning, collisions, combo, waves, win/lose), `render.js` (all
  drawing, HUD, panels), `shots.js` (screenshot autopilots), `main.js` (boot, fixed
  1/60 s loop, screens, live region).
- `main.ts` — the entry program: copies `game/` and `screenshots/` to `/output` (or
  `$MAKEFUN_OUTPUT_DIR`) and writes `/output/dossier.json` via the vendored library.
- `vendor/makefun-game.ts` — the kit's dossier library, byte-identical to the starter's.
- `serve.ts` — a tiny static server for local play (`node serve.ts`, http://localhost:8080).
- `shots.json` — the four screenshot scenes.
- `tools/render-shots.mjs` — renders `screenshots/` with Chrome + playwright-core.
- `tools/test-play.mjs` — interactive play-test (see below).
- `LICENSE` — MIT with the SPDX first line the server's license check requires.
- `README.md` — the game, controls, how to run it. No make.fun badges (parent adds them).

## Verification (2026-11-17, all in this VM)

- **Modules parse:** all 9 game modules pass `node --check` (as `.mjs` copies).
- **Interactive play-test** (`node tools/test-play.mjs`, real Chrome): 8/8 PASS — title
  announces itself, Space starts the game, keyboard + mouse steering produce no errors,
  dash (Shift and Space) produces no errors, P pauses and resumes, sitting still ends
  the run (game over reached), Space restarts after game over. Zero page errors. The
  live frames were inspected by eye: the ship moves toward the pointer, orbs/comets spawn,
  the game-over frame shows the red vignette and "RUN LOST".
- **Screenshots:** all four inspected by eye (see above); each 49–80 KiB, under the
  256 KiB cap; 1280x720, so long side 1280 and short side 720.
- **Entry build:** `MAKEFUN_OUTPUT_DIR=out node main.ts` produces `out/` with `game/`
  (10 files), `screenshots/` (4 files), and `dossier.json` (schema `makefun/dossier/v1`,
  cover 0, 4 images, source outline of all 10 game files). Rebuilding gives a
  byte-identical dossier (sha256 `3c71a27252af46167fa98358664efed904f8a99fb589222149cc987f57e6cce8`).
- **Kit check** (`node cli/makefun.mjs check --kit <kit> --repo . --worktree`): 4 passed —
  `competition_open`, `snapshot` (37 files, 1,090,441 bytes, within intake caps),
  `license_osi` (MIT SPDX), `entrypoint` (main.ts, node22). 1 failed: `transcripts_present`
  — no transcripts bundle exists yet; the parent bundles the sessions and submits. The
  5 "at submission" rows (repo_public, repo_owner, repo_created_after_open,
  commit_in_repo, duplicate_snapshot) are for the parent's repo + submit step. There is
  no local grade for this competition; the server grades.
- **No network:** the game loads only its own modules under `game/`; the favicon is an
  inline `data:,` URI. The kit check's snapshot and the server's `references` row are
  the authority at submit time.

## Balance notes (for the parent / future tuning)

- A careful autopilot wins in ~60 s; a careless one dies in wave 1. A skilled human
  should take 2–4 minutes to win. If it feels too easy, raise `COMET.intervalStart`
  density or `MINE.firstWave` to 1; if too hard, lower comet speeds in `config.js`.
- The wave timer (20 s) only paces the HUD bar; waves end by collecting the core, not
  by the timer running out. That is intentional — the timer is a soft pressure display,
  not a fail state.
- `?seed=N` changes the orb/comet pattern for every scene; the shipped screenshots use
  seed 1.
