// Particles and floating score text. One fixed pool, allocated once at boot, so the game
// never allocates while it runs: bursts reuse dead particles, and the renderer reads the
// same arrays the world writes.

import { PARTICLE_MAX } from './config.js';

export function createParticles() {
  const pool = [];
  for (let index = 0; index < PARTICLE_MAX; index += 1) {
    pool.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, size: 2, color: '#ffffff', drag: 0.9 });
  }
  const texts = [];
  for (let index = 0; index < 24; index += 1) {
    texts.push({ active: false, x: 0, y: 0, text: '', life: 0, maxLife: 1, color: '#ffffff', size: 20 });
  }

  function spawn(x, y, vx, vy, life, size, color, drag = 0.92) {
    for (let index = 0; index < pool.length; index += 1) {
      const particle = pool[index];
      if (particle.active) continue;
      particle.active = true;
      particle.x = x;
      particle.y = y;
      particle.vx = vx;
      particle.vy = vy;
      particle.life = life;
      particle.maxLife = life;
      particle.size = size;
      particle.color = color;
      particle.drag = drag;
      return;
    }
  }

  return {
    pool,
    texts,
    /** A radial burst of `count` sparks. */
    burst(x, y, color, count, speed, life = 0.6, size = 3) {
      for (let index = 0; index < count; index += 1) {
        const angle = (index / count) * Math.PI * 2 + Math.random() * 0.6;
        const velocity = speed * (0.4 + Math.random() * 0.8);
        spawn(x, y, Math.cos(angle) * velocity, Math.sin(angle) * velocity, life * (0.6 + Math.random() * 0.7), size * (0.7 + Math.random() * 0.6), color);
      }
    },
    /** A ring that reads as a shockwave: sparks all at one speed, long lived. */
    ring(x, y, color, count = 26, speed = 320) {
      for (let index = 0; index < count; index += 1) {
        const angle = (index / count) * Math.PI * 2;
        spawn(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, 0.45, 3, color, 0.96);
      }
    },
    /** Floating "+25" style text that rises and fades. */
    floatText(x, y, text, color, size = 20) {
      for (let index = 0; index < texts.length; index += 1) {
        const item = texts[index];
        if (item.active) continue;
        item.active = true;
        item.x = x;
        item.y = y;
        item.text = text;
        item.life = 0.9;
        item.maxLife = 0.9;
        item.color = color;
        item.size = size;
        return;
      }
    },
    step(dt) {
      for (let index = 0; index < pool.length; index += 1) {
        const particle = pool[index];
        if (!particle.active) continue;
        particle.life -= dt;
        if (particle.life <= 0) {
          particle.active = false;
          continue;
        }
        particle.x += particle.vx * dt;
        particle.y += particle.vy * dt;
        particle.vx *= particle.drag;
        particle.vy *= particle.drag;
      }
      for (let index = 0; index < texts.length; index += 1) {
        const item = texts[index];
        if (!item.active) continue;
        item.life -= dt;
        if (item.life <= 0) {
          item.active = false;
          continue;
        }
        item.y -= 42 * dt;
      }
    },
    clear() {
      for (const particle of pool) particle.active = false;
      for (const item of texts) item.active = false;
    },
  };
}
