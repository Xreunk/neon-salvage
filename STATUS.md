# Neon Salvage — status

**State: finished and verified. Ready for the parent to create the repo and submit.**

Deadline: submissions close **2026-11-19 01:00 WIB** (2026-11-18 18:00 UTC).
Competition: make.fun bounty "Make the best game" (best-game-01, harness program/v1).

## Done

- Original game **Neon Salvage** in `game/` (10 files, plain ES modules, no libraries,
  no assets, no network): title / play / paused / game-over / victory screens, HUD
  (score, combo, wave + timer, salvage progress, hull hearts, dash cooldown), WebAudio
  synth SFX with mute, keyboard + mouse controls, deterministic `?shot=` scenes.
- 4 real screenshots in `screenshots/` (1-start, 2-play, 3-end, 4-victory), each
  49–80 KiB, inspected by eye; they show four genuinely different states.
- `main.ts` entry program (copies game/ + screenshots/ to /output, writes dossier.json),
  `vendor/makefun-game.ts` (byte-identical to the kit starter), `serve.ts`, `shots.json`,
  `LICENSE` (MIT + SPDX line), `README.md` (no badges — parent adds the badge template),
  `BUILD_NOTES.md` (this file's sibling: design, controls, screenshots, verification).
- Verified: 9/9 modules parse; interactive play-test 8/8 PASS in real Chrome
  (start → steer → dash → pause/resume → game over → restart, zero page errors);
  `MAKEFUN_OUTPUT_DIR=out node main.ts` produces a complete `out/` with a byte-identical
  dossier across rebuilds; kit `check --worktree` passes 4/4 runnable rows
  (competition_open, snapshot, license_osi, entrypoint). Full results in BUILD_NOTES.md.

## Remaining — for the parent (do NOT do these in this subagent)

1. Create the GitHub repo (after 2026-11-15 18:00 UTC opening — a new repo now is fine)
   and push this entry. Include: `main.ts`, `serve.ts`, `shots.json`, `LICENSE`,
   `README.md` (rewritten with the required make.fun badge template), `BUILD_NOTES.md`,
   `STATUS.md`, `game/`, `screenshots/`, `vendor/`. `tools/` is dev-only (render/test
   scripts) — optional; `out/` is regenerable and is **not** in the entry directory.
2. Bundle the transcripts (`node cli/makefun.mjs bundle --repo <repo> --system-prompt
   <file> --effort <level> --out transcripts.tar.gz`, run from the top-level agent
   after all subagents finish, so this session is included) and re-run
   `check --transcripts <bundle>` until it passes.
3. Submit before 2026-11-19 01:00 WIB. Result due 2026-12-03T06:10:00Z.

## Notes for the parent

- `tools/render-shots.mjs` and `tools/test-play.mjs` import `playwright-core`. It is
  installed at `/tmp/shot/node_modules`; wire it with
  `ln -sfn /tmp/shot/node_modules tools/node_modules` (or `npm i playwright-core`
  inside `tools/`). The symlink is intentionally **not** committed.
- If screenshots are ever re-rendered, serve the game first (`node serve.ts`) and run
  `node tools/render-shots.mjs`; then open the four JPEGs and confirm they still show
  the four different states.
- Nothing in this entry was copied from the starter game or any commercial game; the
  starter's Block Dodger was read only as a reference for the entry layout.
