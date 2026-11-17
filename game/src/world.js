// The game's rules and state, with no drawing and no browser in it: the salvage ship, the
// orbs and wave cores to collect, the comets and mines to dodge, the combo, the waves, the
// win and the loss. step() advances one fixed step and returns what happened as bit flags,
// so the caller can react (sound, announcements) without the world knowing about screens.

import {
  COMBO_MAX,
  COMBO_WINDOW,
  COMET,
  CORE,
  FIELD,
  HULL_MAX,
  MINE,
  ORB,
  SHIP,
  WAVE_COUNT,
  WAVE_SECONDS,
  orbsPerWave,
} from './config.js';

export const KIND_ORB = 0;
export const KIND_CORE = 1;
export const KIND_COMET = 2;
export const KIND_MINE = 3;

export const EVENT_PICKUP = 1;
export const EVENT_CORE = 2;
export const EVENT_HIT = 4;
export const EVENT_WAVE = 8;
export const EVENT_WIN = 16;
export const EVENT_OVER = 32;
export const EVENT_DASH = 64;

function distanceSquared(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

function overlapCircles(a, b) {
  const radius = a.radius + b.radius;
  return distanceSquared(a, b) < radius * radius;
}

export function createWorld(random, particles) {
  const ship = {
    x: FIELD.width / 2,
    y: FIELD.height / 2,
    vx: 0,
    vy: 0,
    angle: -Math.PI / 2,
    radius: SHIP.radius,
    invulnerable: 0,
    dashTime: 0,
    dashCooldown: 0,
    trail: [],
  };
  for (let index = 0; index < 14; index += 1) ship.trail.push({ x: ship.x, y: ship.y });
  const orbs = [];
  const hazards = [];
  const state = {
    ship,
    orbs,
    hazards,
    score: 0,
    best: 0,
    hull: HULL_MAX,
    wave: 1,
    waveTime: WAVE_SECONDS,
    combo: 0,
    comboTime: 0,
    orbsThisWave: 0,
    coreExposed: false,
    elapsed: 0,
    orbsCollected: 0,
    coresCollected: 0,
    hitsTaken: 0,
    dashes: 0,
    orbTimer: 0.4,
    cometTimer: 1.2,
    mineTimer: 3.0,
    banner: '',
    bannerTime: 0,
    shake: 0,
    flash: 0,
    won: false,
    over: false,
  };

  function spawnOrb() {
    let count = 0;
    for (const orb of orbs) if (orb.active) count += 1;
    if (count >= ORB.maxActive) return;
    const angle = random() * Math.PI * 2;
    orbs.push({
      active: true,
      kind: KIND_ORB,
      x: 60 + random() * (FIELD.width - 120),
      y: 60 + random() * (FIELD.height - 120),
      vx: Math.cos(angle) * ORB.drift,
      vy: Math.sin(angle) * ORB.drift,
      radius: ORB.radius,
      life: ORB.lifetime,
      phase: random() * Math.PI * 2,
    });
  }

  function spawnCore() {
    orbs.push({
      active: true,
      kind: KIND_CORE,
      x: 120 + random() * (FIELD.width - 240),
      y: 120 + random() * (FIELD.height - 240),
      vx: 0,
      vy: 0,
      radius: CORE.radius,
      life: Infinity,
      phase: 0,
    });
  }

  function spawnComet() {
    const speed = COMET.speedMin + random() * (COMET.speedMax - COMET.speedMin) + COMET.speedPerWave * (state.wave - 1);
    const radius = COMET.minRadius + random() * (COMET.maxRadius - COMET.minRadius);
    // Start just outside the field, on the side its velocity points away from.
    const margin = 50;
    const x = random() < 0.5 ? -margin : FIELD.width + margin;
    const y = random() * FIELD.height;
    const direction = x < 0 ? 1 : -1;
    const tilt = (random() - 0.5) * 0.9;
    const vertices = [];
    const points = 8;
    for (let index = 0; index < points; index += 1) {
      vertices.push(0.72 + random() * 0.5);
    }
    hazards.push({
      active: true,
      kind: KIND_COMET,
      x,
      y,
      vx: direction * speed * Math.cos(tilt),
      vy: speed * Math.sin(tilt) * 0.7,
      radius,
      rotation: random() * Math.PI * 2,
      spin: (random() - 0.5) * 2.2,
      vertices,
      age: 0,
    });
  }

  function spawnMine() {
    hazards.push({
      active: true,
      kind: KIND_MINE,
      x: 80 + random() * (FIELD.width - 160),
      y: 80 + random() * (FIELD.height - 160),
      vx: (random() - 0.5) * MINE.speed * 2,
      vy: (random() - 0.5) * MINE.speed * 2,
      radius: MINE.radius,
      rotation: 0,
      spin: 0,
      vertices: null,
      age: 0,
    });
  }

  function reset() {
    ship.x = FIELD.width / 2;
    ship.y = FIELD.height / 2;
    ship.vx = 0;
    ship.vy = 0;
    ship.angle = -Math.PI / 2;
    ship.invulnerable = 0;
    ship.dashTime = 0;
    ship.dashCooldown = 0;
    for (const point of ship.trail) {
      point.x = ship.x;
      point.y = ship.y;
    }
    orbs.length = 0;
    hazards.length = 0;
    state.score = 0;
    state.hull = HULL_MAX;
    state.wave = 1;
    state.waveTime = WAVE_SECONDS;
    state.combo = 0;
    state.comboTime = 0;
    state.orbsThisWave = 0;
    state.coreExposed = false;
    state.elapsed = 0;
    state.orbsCollected = 0;
    state.coresCollected = 0;
    state.hitsTaken = 0;
    state.dashes = 0;
    state.orbTimer = 0.4;
    state.cometTimer = 1.2;
    state.mineTimer = 3.0;
    state.banner = '';
    state.bannerTime = 0;
    state.shake = 0;
    state.flash = 0;
    state.won = false;
    state.over = false;
    for (let index = 0; index < 5; index += 1) spawnOrb();
  }

  function collectOrb(orb) {
    orb.active = false;
    state.combo = state.comboTime > 0 ? Math.min(COMBO_MAX, state.combo + 1) : 1;
    state.comboTime = COMBO_WINDOW;
    const points = ORB.value * state.combo;
    state.score += points;
    state.orbsCollected += 1;
    state.orbsThisWave += 1;
    particles.burst(orb.x, orb.y, '#ffd94a', 10, 170, 0.5, 3);
    particles.floatText(orb.x, orb.y - 14, `+${points}`, state.combo > 1 ? '#ffe98a' : '#ffd94a', 18 + state.combo * 2);
    if (!state.coreExposed && state.orbsThisWave >= orbsPerWave(state.wave)) {
      state.coreExposed = true;
      state.banner = 'CORE EXPOSED';
      state.bannerTime = 1.6;
      spawnCore();
    }
    return EVENT_PICKUP;
  }

  function collectCore(orb) {
    orb.active = false;
    state.combo = state.comboTime > 0 ? Math.min(COMBO_MAX, state.combo + 1) : 1;
    state.comboTime = COMBO_WINDOW;
    const points = CORE.value * state.combo;
    state.score += points;
    state.coresCollected += 1;
    particles.burst(orb.x, orb.y, '#ff4fd8', 26, 300, 0.8, 4);
    particles.ring(orb.x, orb.y, '#ff4fd8', 30, 380);
    particles.floatText(orb.x, orb.y - 20, `CORE +${points}`, '#ff8ae2', 26);
    if (state.wave >= WAVE_COUNT) {
      state.won = true;
      return EVENT_CORE | EVENT_WIN;
    }
    state.wave += 1;
    state.waveTime = WAVE_SECONDS;
    state.hull = Math.min(HULL_MAX, state.hull + 1);
    state.orbsThisWave = 0;
    state.coreExposed = false;
    state.banner = `WAVE ${state.wave}`;
    state.bannerTime = 1.6;
    state.score += CORE.waveBonus;
    return EVENT_CORE | EVENT_WAVE;
  }

  function hitHazard(hazard) {
    hazard.active = false;
    state.hull -= 1;
    state.hitsTaken += 1;
    state.combo = 0;
    state.comboTime = 0;
    ship.invulnerable = SHIP.hitInvulnerable;
    state.shake = 0.45;
    state.flash = 0.5;
    particles.burst(ship.x, ship.y, '#ff5a4e', 26, 320, 0.7, 4);
    particles.ring(ship.x, ship.y, '#ff8a7a', 22, 300);
    if (state.hull <= 0) {
      state.over = true;
      particles.burst(ship.x, ship.y, '#3df2ff', 40, 420, 1.0, 4);
      particles.burst(ship.x, ship.y, '#ff5a4e', 30, 340, 0.9, 4);
      return EVENT_HIT | EVENT_OVER;
    }
    return EVENT_HIT;
  }

  /**
   * One fixed step. `steer` is the wanted movement: { x, y } already normalised, plus a
   * `dash` boolean. With `harmless` set (the title screen's backdrop) things drift but
   * nothing touches the ship and nothing scores.
   */
  function step(dt, steer, harmless) {
    let events = 0;
    state.elapsed += dt;
    if (state.comboTime > 0) {
      state.comboTime -= dt;
      if (state.comboTime <= 0) state.combo = 0;
    }
    if (state.bannerTime > 0) state.bannerTime -= dt;
    if (state.shake > 0) state.shake = Math.max(0, state.shake - dt);
    if (state.flash > 0) state.flash = Math.max(0, state.flash - dt);
    if (ship.invulnerable > 0) ship.invulnerable = Math.max(0, ship.invulnerable - dt);
    if (ship.dashCooldown > 0) ship.dashCooldown = Math.max(0, ship.dashCooldown - dt);

    if (!harmless) {
      state.waveTime -= dt;
      if (state.waveTime < 0) state.waveTime = 0;
    }

    // Steering: accelerate toward the wanted direction; the dash is a burst with a cooldown.
    const wantDash = !harmless && steer.dash && ship.dashCooldown === 0 && ship.dashTime === 0;
    if (wantDash) {
      ship.dashTime = SHIP.dashTime;
      ship.dashCooldown = SHIP.dashCooldown;
      ship.invulnerable = Math.max(ship.invulnerable, SHIP.dashInvulnerable);
      state.dashes += 1;
      events |= EVENT_DASH;
    }
    const speed = ship.dashTime > 0 ? SHIP.dashSpeed : SHIP.speed;
    if (ship.dashTime > 0) ship.dashTime = Math.max(0, ship.dashTime - dt);
    const targetVx = steer.x * speed;
    const targetVy = steer.y * speed;
    const blend = ship.dashTime > 0 ? 1 : 1 - Math.pow(0.0001, dt);
    ship.vx += (targetVx - ship.vx) * blend;
    ship.vy += (targetVy - ship.vy) * blend;
    ship.x += ship.vx * dt;
    ship.y += ship.vy * dt;
    ship.x = Math.min(FIELD.width - ship.radius, Math.max(ship.radius, ship.x));
    ship.y = Math.min(FIELD.height - ship.radius, Math.max(ship.radius, ship.y));
    if (Math.abs(ship.vx) + Math.abs(ship.vy) > 20) {
      ship.angle = Math.atan2(ship.vy, ship.vx);
    }
    ship.trail.pop();
    ship.trail.unshift({ x: ship.x, y: ship.y });

    // Spawning.
    state.orbTimer -= dt;
    if (state.orbTimer <= 0) {
      spawnOrb();
      state.orbTimer += ORB.spawnInterval;
    }
    const cometInterval = COMET.intervalStart + (COMET.intervalEnd - COMET.intervalStart) * ((state.wave - 1) / (WAVE_COUNT - 1));
    state.cometTimer -= dt;
    if (state.cometTimer <= 0) {
      spawnComet();
      state.cometTimer += cometInterval;
    }
    if (state.wave >= MINE.firstWave) {
      const mineInterval = MINE.intervalStart + (MINE.intervalEnd - MINE.intervalStart) * ((state.wave - 1) / (WAVE_COUNT - 1));
      state.mineTimer -= dt;
      if (state.mineTimer <= 0) {
        spawnMine();
        state.mineTimer += mineInterval;
      }
    }

    // Orbs drift, age out, and get collected.
    for (let index = orbs.length - 1; index >= 0; index -= 1) {
      const orb = orbs[index];
      if (!orb.active) {
        orbs.splice(index, 1);
        continue;
      }
      orb.x += orb.vx * dt;
      orb.y += orb.vy * dt;
      orb.phase += dt * 3;
      if (orb.x < orb.radius || orb.x > FIELD.width - orb.radius) orb.vx *= -1;
      if (orb.y < orb.radius || orb.y > FIELD.height - orb.radius) orb.vy *= -1;
      if (orb.kind === KIND_ORB) {
        orb.life -= dt;
        if (orb.life <= 0) {
          orb.active = false;
          orbs.splice(index, 1);
          continue;
        }
      }
      if (harmless || state.won || state.over) continue;
      if (overlapCircles(ship, orb)) {
        events |= orb.kind === KIND_CORE ? collectCore(orb) : collectOrb(orb);
        orbs.splice(index, 1);
        if (events & (EVENT_WIN | EVENT_OVER)) break;
      }
    }

    // Hazards drift, spin, age, and hit the ship.
    for (let index = hazards.length - 1; index >= 0; index -= 1) {
      const hazard = hazards[index];
      if (!hazard.active) {
        hazards.splice(index, 1);
        continue;
      }
      hazard.age += dt;
      hazard.x += hazard.vx * dt;
      hazard.y += hazard.vy * dt;
      hazard.rotation += hazard.spin * dt;
      if (hazard.kind === KIND_MINE) {
        if (hazard.x < hazard.radius || hazard.x > FIELD.width - hazard.radius) hazard.vx *= -1;
        if (hazard.y < hazard.radius || hazard.y > FIELD.height - hazard.radius) hazard.vy *= -1;
      }
      const out = hazard.x < -80 || hazard.x > FIELD.width + 80 || hazard.y < -80 || hazard.y > FIELD.height + 80;
      if (out) {
        hazards.splice(index, 1);
        continue;
      }
      if (harmless || state.won || state.over) continue;
      if (hazard.kind === KIND_MINE && hazard.age < MINE.armTime) continue;
      if (ship.invulnerable === 0 && overlapCircles(ship, hazard)) {
        events |= hitHazard(hazard);
        hazards.splice(index, 1);
        if (events & EVENT_OVER) break;
      }
    }

    particles.step(dt);
    return events;
  }

  reset();
  return { state, reset, step };
}
