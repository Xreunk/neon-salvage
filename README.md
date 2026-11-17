# neon-salvage

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/Xreunk/neon-salvage/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/Xreunk/neon-salvage/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

Neon Salvage is a neon top-down arcade game: pilot a salvage ship through a drifting asteroid field, collect gold salvage orbs, chain pickups into a combo up to x5, and grab each wave's magenta core to advance. Clear all 5 waves to win. Dodge the comets, mind the mines — three hull hits and your run is over.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser. No network request is made; the game is plain static files, and all sound is synthesized in code with WebAudio.

---

<sub>Entered on [make.fun](https://make.fun/?ref=penmmk13&utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>

## How to play

- **Move:** WASD or arrow keys, or steer with the mouse (the ship follows your pointer).
- **Dash:** Space or click — a burst of speed with a brief shield. 2 second cooldown.
- **Pause:** P or Esc. **Mute:** M.
- **Start / restart:** Space, Enter, or click.

**Scoring:** orbs are worth 10 points times your combo multiplier; each wave core is worth 100 times the combo, plus a 50 point wave-clear bonus. Collect 6 orbs in wave 1 (one more each wave) to expose the wave's magenta core — grabbing it advances the wave. Pickups within 3.5 seconds of each other raise the combo; taking a hit resets it. Each cleared wave repairs one hull heart.

## Screenshots

The game supports deterministic screenshot scenes via query parameters:

- `?shot=start&seed=1` — title screen
- `?shot=play&seed=1` — mid-game action
- `?shot=end&seed=1` — game over
- `?shot=win&seed=1` — victory screen

`?seed=N` fixes the salvage pattern for any scene.

## Files

- `game/index.html` — the page; `game/src/` holds the game, one job per file:
  `config.js` (tuning and palette), `random.js` (seeded RNG), `audio.js` (synthesized
  sound), `input.js` (keyboard and pointer), `particles.js` (bursts and floating text),
  `world.js` (rules, spawning, collisions, waves), `render.js` (all drawing),
  `shots.js` (screenshot autopilot), `main.js` (boot and the game loop).
- `main.ts` — the entry program: copies `game/` and `screenshots/` to `/output` and
  writes `/output/dossier.json` with the vendored make.fun library.
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged.
