// Every tuning number and colour for NEON SALVAGE in one place. The playfield is a fixed
// 1280x720 logical area; the renderer scales it to the window, so no rule below depends on
// the screen size.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

export const SHIP = {
  radius: 14,
  speed: 320,
  turnRate: 9,
  dashSpeed: 900,
  dashTime: 0.18,
  dashCooldown: 2.0,
  dashInvulnerable: 0.35,
  hitInvulnerable: 1.5,
};

export const HULL_MAX = 3;

/** One wave lasts this long at most; its core stays until collected. */
export const WAVE_SECONDS = 20;
export const WAVE_COUNT = 5;

/** Orbs to collect in a wave before its core is exposed: 6 in wave 1, one more each wave. */
export function orbsPerWave(wave) {
  return 5 + wave;
}

export const ORB = {
  radius: 11,
  value: 10,
  spawnInterval: 1.1,
  maxActive: 10,
  lifetime: 12,
  drift: 26,
};

export const CORE = {
  radius: 26,
  value: 100,
  waveBonus: 50,
};

export const COMET = {
  minRadius: 13,
  maxRadius: 30,
  speedMin: 150,
  speedMax: 300,
  speedPerWave: 22,
  intervalStart: 1.1,
  intervalEnd: 0.45,
};

export const MINE = {
  radius: 18,
  speed: 34,
  armTime: 1.0,
  intervalStart: 3.4,
  intervalEnd: 2.4,
  firstWave: 2,
};

/** Pickups within this window of each other raise the combo; the combo caps here. */
export const COMBO_WINDOW = 3.5;
export const COMBO_MAX = 5;

export const PARTICLE_MAX = 320;

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'neon-salvage.best';
export const MUTE_KEY = 'neon-salvage.muted';

export const PALETTE = {
  backdrop: '#05060f',
  skyTop: '#0a0d24',
  skyBottom: '#160a2e',
  nebulaPink: '#ff2e88',
  nebulaCyan: '#00e5ff',
  nebulaViolet: '#7b2fff',
  ship: '#3df2ff',
  shipGlow: '#00c8ff',
  flame: '#ffb347',
  orb: '#ffd94a',
  orbGlow: '#ffae00',
  core: '#ff4fd8',
  coreGlow: '#ff2e88',
  comet: '#8a6f6f',
  cometEdge: '#ff5a4e',
  mine: '#2a2f45',
  mineRing: '#ff3b30',
  text: '#f2f6ff',
  muted: '#9aa7c7',
  panel: 'rgba(10, 14, 34, 0.88)',
  panelEdge: '#2de2ff',
  danger: '#ff4d6d',
  good: '#4dffa6',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';
