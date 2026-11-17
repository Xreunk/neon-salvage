// The screenshot scenes behind ?shot=start|play|end|win. Each one plays the real rules
// forward from a fresh world for a fixed number of steps, steered by a simple autopilot
// (chase the nearest orb or the wave core, keep clear of hazards), so the frame is what a
// short game really looks like and the same seed always gives the same frame.

import { FIELD, SHIP, STEP } from './config.js';
import { EVENT_OVER, EVENT_WIN, KIND_CORE, KIND_ORB } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';

const START_SECONDS = 6;
const PLAY_SECONDS = 34;
const END_LIMIT_SECONDS = 300;
const WIN_LIMIT_SECONDS = 900;
const SAMPLE = 1 / 30;
/** How far ahead, in seconds, the pilot checks each candidate direction. */
const HORIZON_PLAY = 0.55;
const HORIZON_WIN = 0.6;

/** Would moving with velocity (vx, vy) hit a hazard within `horizon` seconds? */
function dangerAhead(state, vx, vy, horizon) {
  const ship = state.ship;
  for (let t = SAMPLE; t <= horizon; t += SAMPLE) {
    const x = ship.x + vx * t;
    const y = ship.y + vy * t;
    if (x < ship.radius || x > FIELD.width - ship.radius || y < ship.radius || y > FIELD.height - ship.radius) return true;
    for (const hazard of state.hazards) {
      if (!hazard.active) continue;
      if (hazard.kind === 3 && hazard.age < 1.0) continue;
      const hx = hazard.x + hazard.vx * t;
      const hy = hazard.y + hazard.vy * t;
      const dx = hx - x;
      const dy = hy - y;
      const radius = hazard.radius + ship.radius + 8;
      if (dx * dx + dy * dy < radius * radius) return true;
    }
  }
  return false;
}

/** Steer toward `target` unless that way is dangerous; then try the safe direction that
 *  keeps the ship closest to the target. Returns { x, y, dash }. */
function steerToward(state, target, horizon, canDash) {
  const ship = state.ship;
  const dx = target.x - ship.x;
  const dy = target.y - ship.y;
  const length = Math.hypot(dx, dy) || 1;
  const wanted = { x: dx / length, y: dy / length };
  const candidates = [
    wanted,
    { x: 0, y: -1 },
    { x: 0, y: 1 },
    { x: -1, y: 0 },
    { x: 1, y: 0 },
    { x: wanted.x * 0.7 - wanted.y * 0.7, y: wanted.x * 0.7 + wanted.y * 0.7 },
    { x: wanted.x * 0.7 + wanted.y * 0.7, y: -wanted.x * 0.7 + wanted.y * 0.7 },
  ];
  let best = { x: 0, y: 0, dash: false };
  let bestScore = -Infinity;
  for (const candidate of candidates) {
    const magnitude = Math.hypot(candidate.x, candidate.y) || 1;
    const unit = { x: candidate.x / magnitude, y: candidate.y / magnitude };
    const dangerous = dangerAhead(state, unit.x * SHIP.speed, unit.y * SHIP.speed, horizon);
    const alignment = unit.x * wanted.x + unit.y * wanted.y;
    const score = (dangerous ? -2 : 0) + alignment;
    if (score > bestScore) {
      bestScore = score;
      best = { x: unit.x, y: unit.y, dash: false };
    }
  }
  const dash = canDash && ship.dashCooldown === 0 && dangerAhead(state, wanted.x * SHIP.speed, wanted.y * SHIP.speed, 0.35);
  return { x: best.x, y: best.y, dash };
}

/** The nearest collectible worth chasing: the wave core first, else the nearest orb. */
function pickTarget(state) {
  let core = null;
  let orb = null;
  let orbDistance = Infinity;
  for (const item of state.orbs) {
    if (!item.active) continue;
    if (item.kind === KIND_CORE) core = item;
    else if (item.kind === KIND_ORB) {
      const dx = item.x - state.ship.x;
      const dy = item.y - state.ship.y;
      const distance = dx * dx + dy * dy;
      if (distance < orbDistance) {
        orbDistance = distance;
        orb = item;
      }
    }
  }
  return core ?? orb ?? { x: FIELD.width / 2, y: FIELD.height / 2 };
}

/** The careful pilot: chase the target, dodge hazards, dash out of trouble. */
function autopilot(state, horizon) {
  return steerToward(state, pickTarget(state), horizon, true);
}

/** The careless pilot: chase the nearest orb, ignore the wave core, never dodge, never dash. */
function recklessPilot(state) {
  let orb = null;
  let orbDistance = Infinity;
  for (const item of state.orbs) {
    if (!item.active || item.kind !== KIND_ORB) continue;
    const dx = item.x - state.ship.x;
    const dy = item.y - state.ship.y;
    const distance = dx * dx + dy * dy;
    if (distance < orbDistance) {
      orbDistance = distance;
      orb = item;
    }
  }
  const target = orb ?? { x: FIELD.width / 2, y: FIELD.height / 2 };
  const dx = target.x - state.ship.x;
  const dy = target.y - state.ship.y;
  const length = Math.hypot(dx, dy) || 1;
  return { x: dx / length, y: dy / length, dash: false };
}

/**
 * Set `world` to the named scene (start, play, end or win; any other name is start) and
 * return the screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  world.reset();
  if (name !== 'play' && name !== 'end' && name !== 'win') {
    for (let index = 0; index < START_SECONDS / STEP; index += 1) world.step(STEP, { x: 0, y: 0, dash: false }, true);
    return { screen: SCREEN_TITLE, best: 0 };
  }
  const limit = name === 'end' ? END_LIMIT_SECONDS : name === 'win' ? WIN_LIMIT_SECONDS : PLAY_SECONDS;
  const pilot = name === 'end' ? recklessPilot : (state) => autopilot(state, name === 'win' ? HORIZON_WIN : HORIZON_PLAY);
  let events = 0;
  for (let index = 0; index < limit / STEP; index += 1) {
    events = world.step(STEP, pilot(world.state), false);
    if (events & (EVENT_OVER | EVENT_WIN)) break;
  }
  const state = world.state;
  if (state.won) return { screen: SCREEN_WIN, best: state.score };
  if (state.over) return { screen: SCREEN_OVER, best: state.score };
  return { screen: SCREEN_PLAY, best: state.score };
}
