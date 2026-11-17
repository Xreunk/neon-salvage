// Drawing only: the world's state and the current screen in, pixels out. The 1280x720
// playfield is scaled to fit the window and centred, the margin filled with the backdrop
// colour. A pre-rendered nebula backdrop, a twinkling starfield, glowing shapes, particles,
// the HUD and the panels. Text that holds a number is rebuilt only when the number changes,
// so a frame allocates nothing.

import { FIELD, FONT, HULL_MAX, PALETTE, orbsPerWave } from './config.js';
import { KIND_COMET, KIND_CORE, KIND_MINE, KIND_ORB } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';

const PANEL = { width: 640, top: 150, line: 34, bottom: 76 };

function cachedLabel(prefix) {
  let value = -1;
  let text = '';
  return function label(next) {
    if (next !== value) {
      value = next;
      text = prefix + next;
    }
    return text;
  };
}

export function createRenderer(canvas, random) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  const scoreLabel = cachedLabel('SCORE ');
  const waveLabel = cachedLabel('WAVE ');
  const finalLabel = cachedLabel('SCORE ');
  const bestLabel = cachedLabel('BEST ');
  const timeLabel = cachedLabel('TIME ');

  // The starfield never changes, so it is drawn once to an offscreen canvas.
  const stars = document.createElement('canvas');
  stars.width = FIELD.width;
  stars.height = FIELD.height;
  const starContext = stars.getContext('2d');
  const starfield = [];
  for (let index = 0; index < 170; index += 1) {
    starfield.push({
      x: random() * FIELD.width,
      y: random() * FIELD.height,
      radius: 0.6 + random() * 1.6,
      phase: random() * Math.PI * 2,
      speed: 0.6 + random() * 1.8,
    });
  }
  // The nebula is three soft radial blobs, painted once to the same offscreen canvas.
  const nebula = document.createElement('canvas');
  nebula.width = FIELD.width;
  nebula.height = FIELD.height;
  const nebulaContext = nebula.getContext('2d');
  const blobs = [
    { x: 210, y: 150, radius: 340, color: 'rgba(123, 47, 255, 0.20)' },
    { x: 1080, y: 560, radius: 380, color: 'rgba(255, 46, 136, 0.14)' },
    { x: 980, y: 120, radius: 300, color: 'rgba(0, 229, 255, 0.10)' },
    { x: 180, y: 600, radius: 260, color: 'rgba(0, 229, 255, 0.08)' },
  ];
  for (const blob of blobs) {
    const gradient = nebulaContext.createRadialGradient(blob.x, blob.y, 0, blob.x, blob.y, blob.radius);
    gradient.addColorStop(0, blob.color);
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    nebulaContext.fillStyle = gradient;
    nebulaContext.fillRect(blob.x - blob.radius, blob.y - blob.radius, blob.radius * 2, blob.radius * 2);
  }

  function paintStars(now) {
    starContext.clearRect(0, 0, FIELD.width, FIELD.height);
    for (const star of starfield) {
      const twinkle = 0.45 + 0.55 * Math.abs(Math.sin(now * star.speed + star.phase));
      starContext.globalAlpha = twinkle;
      starContext.fillStyle = '#dfe9ff';
      starContext.beginPath();
      starContext.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
      starContext.fill();
    }
    starContext.globalAlpha = 1;
  }

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }

  const fonts = new Map();
  function text(value, x, y, size, color, align, weight = 600) {
    const key = `${weight}:${size}`;
    if (!fonts.has(key)) fonts.set(key, `${weight} ${size}px ${FONT}`);
    context.font = fonts.get(key);
    context.fillStyle = color;
    context.textAlign = align;
    context.fillText(value, x, y);
  }

  function glowText(value, x, y, size, color, align, blur = 18) {
    context.save();
    context.shadowColor = color;
    context.shadowBlur = blur;
    text(value, x, y, size, color, align, 800);
    context.restore();
  }

  function drawBackground(now) {
    const gradient = context.createLinearGradient(0, 0, 0, FIELD.height);
    gradient.addColorStop(0, PALETTE.skyTop);
    gradient.addColorStop(1, PALETTE.skyBottom);
    context.fillStyle = gradient;
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    context.drawImage(nebula, 0, 0);
    paintStars(now);
    context.drawImage(stars, 0, 0);
  }

  function drawShip(state, now) {
    const ship = state.ship;
    // Engine trail: the stored positions, fading back.
    for (let index = ship.trail.length - 1; index >= 1; index -= 1) {
      const point = ship.trail[index];
      const alpha = (1 - index / ship.trail.length) * 0.5;
      context.globalAlpha = alpha;
      context.fillStyle = PALETTE.shipGlow;
      context.beginPath();
      context.arc(point.x, point.y, ship.radius * (0.55 - index * 0.02), 0, Math.PI * 2);
      context.fill();
    }
    context.globalAlpha = 1;
    if (ship.invulnerable > 0 && Math.floor(now * 12) % 2 === 0) return;
    context.save();
    context.translate(ship.x, ship.y);
    context.rotate(ship.angle);
    context.shadowColor = PALETTE.shipGlow;
    context.shadowBlur = 22;
    context.fillStyle = PALETTE.ship;
    context.beginPath();
    context.moveTo(20, 0);
    context.lineTo(-13, -11);
    context.lineTo(-7, 0);
    context.lineTo(-13, 11);
    context.closePath();
    context.fill();
    context.shadowBlur = 0;
    context.fillStyle = '#e8feff';
    context.beginPath();
    context.moveTo(10, 0);
    context.lineTo(-6, -5);
    context.lineTo(-3, 0);
    context.lineTo(-6, 5);
    context.closePath();
    context.fill();
    // Engine flame, flickering with time.
    const flame = 10 + Math.sin(now * 40) * 4 + (ship.dashTime > 0 ? 14 : 0);
    context.fillStyle = PALETTE.flame;
    context.beginPath();
    context.moveTo(-12, -5);
    context.lineTo(-12 - flame, 0);
    context.lineTo(-12, 5);
    context.closePath();
    context.fill();
    context.restore();
  }

  function drawOrbs(state, now) {
    for (const orb of state.orbs) {
      if (!orb.active) continue;
      const blink = orb.kind === KIND_ORB && orb.life < 3 ? (Math.floor(now * 6) % 2 === 0 ? 0.35 : 1) : 1;
      context.save();
      context.globalAlpha = blink;
      if (orb.kind === KIND_CORE) {
        const pulse = 1 + Math.sin(now * 4) * 0.12;
        context.shadowColor = PALETTE.coreGlow;
        context.shadowBlur = 30;
        context.fillStyle = PALETTE.core;
        context.beginPath();
        context.arc(orb.x, orb.y, orb.radius * pulse, 0, Math.PI * 2);
        context.fill();
        context.shadowBlur = 0;
        context.strokeStyle = 'rgba(255, 143, 226, 0.9)';
        context.lineWidth = 2;
        context.beginPath();
        context.arc(orb.x, orb.y, orb.radius * pulse + 9 + Math.sin(now * 4) * 3, 0, Math.PI * 2);
        context.stroke();
        context.fillStyle = '#ffe9fb';
        context.beginPath();
        context.arc(orb.x, orb.y, orb.radius * 0.45, 0, Math.PI * 2);
        context.fill();
      } else {
        context.shadowColor = PALETTE.orbGlow;
        context.shadowBlur = 16;
        context.fillStyle = PALETTE.orb;
        context.beginPath();
        context.arc(orb.x, orb.y, orb.radius, 0, Math.PI * 2);
        context.fill();
        context.shadowBlur = 0;
        context.strokeStyle = 'rgba(255, 255, 255, 0.85)';
        context.lineWidth = 2;
        const sparkle = orb.phase;
        context.beginPath();
        context.moveTo(orb.x - Math.cos(sparkle) * (orb.radius + 5), orb.y - Math.sin(sparkle) * (orb.radius + 5));
        context.lineTo(orb.x + Math.cos(sparkle) * (orb.radius + 5), orb.y + Math.sin(sparkle) * (orb.radius + 5));
        context.moveTo(orb.x - Math.cos(sparkle + Math.PI / 2) * (orb.radius + 5), orb.y - Math.sin(sparkle + Math.PI / 2) * (orb.radius + 5));
        context.lineTo(orb.x + Math.cos(sparkle + Math.PI / 2) * (orb.radius + 5), orb.y + Math.sin(sparkle + Math.PI / 2) * (orb.radius + 5));
        context.stroke();
      }
      context.restore();
    }
  }

  function drawHazards(state) {
    for (const hazard of state.hazards) {
      if (!hazard.active) continue;
      if (hazard.kind === KIND_COMET) {
        context.save();
        context.translate(hazard.x, hazard.y);
        context.rotate(hazard.rotation);
        context.fillStyle = PALETTE.comet;
        context.strokeStyle = PALETTE.cometEdge;
        context.lineWidth = 2;
        context.beginPath();
        for (let index = 0; index < hazard.vertices.length; index += 1) {
          const angle = (index / hazard.vertices.length) * Math.PI * 2;
          const radius = hazard.radius * hazard.vertices[index];
          if (index === 0) context.moveTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
          else context.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
        }
        context.closePath();
        context.fill();
        context.stroke();
        context.fillStyle = 'rgba(255, 90, 78, 0.35)';
        context.beginPath();
        context.arc(0, 0, hazard.radius * 0.45, 0, Math.PI * 2);
        context.fill();
        context.restore();
      } else if (hazard.kind === KIND_MINE) {
        const armed = hazard.age >= 1.0;
        const pulse = armed ? 1 + Math.sin(hazard.age * 6) * 0.18 : 0.7;
        context.save();
        context.translate(hazard.x, hazard.y);
        context.shadowColor = armed ? PALETTE.mineRing : '#666';
        context.shadowBlur = armed ? 18 : 4;
        context.fillStyle = PALETTE.mine;
        context.beginPath();
        context.arc(0, 0, hazard.radius * pulse, 0, Math.PI * 2);
        context.fill();
        context.shadowBlur = 0;
        context.strokeStyle = armed ? PALETTE.mineRing : '#7a8199';
        context.lineWidth = 2.5;
        for (let index = 0; index < 8; index += 1) {
          const angle = (index / 8) * Math.PI * 2;
          context.beginPath();
          context.moveTo(Math.cos(angle) * hazard.radius * 0.9, Math.sin(angle) * hazard.radius * 0.9);
          context.lineTo(Math.cos(angle) * (hazard.radius + 9), Math.sin(angle) * (hazard.radius + 9));
          context.stroke();
        }
        context.fillStyle = armed ? '#ff6b61' : '#565d75';
        context.beginPath();
        context.arc(0, 0, 5, 0, Math.PI * 2);
        context.fill();
        context.restore();
      }
    }
  }

  function drawParticles(state) {
    for (const particle of state.particles.pool) {
      if (!particle.active) continue;
      context.globalAlpha = Math.max(0, particle.life / particle.maxLife);
      context.fillStyle = particle.color;
      context.beginPath();
      context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      context.fill();
    }
    context.globalAlpha = 1;
    context.textBaseline = 'alphabetic';
    for (const item of state.particles.texts) {
      if (!item.active) continue;
      context.globalAlpha = Math.max(0, item.life / item.maxLife);
      text(item.text, item.x, item.y, item.size, item.color, 'center', 800);
    }
    context.globalAlpha = 1;
  }

  function drawHud(state, muted) {
    context.textBaseline = 'top';
    text(scoreLabel(state.score), 26, 18, 30, PALETTE.text, 'left', 800);
    // Combo meter under the score.
    if (state.combo > 1) {
      const width = 150;
      const fraction = Math.max(0, state.comboTime / 3.5);
      context.fillStyle = 'rgba(255, 217, 74, 0.25)';
      context.fillRect(26, 56, width, 8);
      context.fillStyle = PALETTE.orb;
      context.fillRect(26, 56, width * fraction, 8);
      text(`COMBO x${state.combo}`, 26, 68, 18, PALETTE.orb, 'left', 800);
    }
    text(waveLabel(state.wave), FIELD.width / 2, 18, 30, PALETTE.text, 'center', 800);
    const waveFraction = Math.max(0, state.waveTime / 20);
    context.fillStyle = 'rgba(61, 242, 255, 0.25)';
    context.fillRect(FIELD.width / 2 - 90, 56, 180, 6);
    context.fillStyle = PALETTE.ship;
    context.fillRect(FIELD.width / 2 - 90, 56, 180 * waveFraction, 6);
    // Salvage progress toward exposing the wave core.
    const quota = orbsPerWave(state.wave);
    if (state.coreExposed) {
      text('CORE EXPOSED — GRAB IT!', FIELD.width / 2, 68, 17, PALETTE.core, 'center', 800);
    } else {
      text(`SALVAGE ${Math.min(state.orbsThisWave, quota)}/${quota} TO EXPOSE THE CORE`, FIELD.width / 2, 68, 17, PALETTE.muted, 'center', 700);
    }
    // Hull hearts, top right.
    const heartSize = 22;
    const gap = 8;
    const firstHeart = FIELD.width - 26 - HULL_MAX * (heartSize + gap) + gap;
    for (let index = 0; index < HULL_MAX; index += 1) {
      const x = firstHeart + index * (heartSize + gap);
      const y = 24;
      context.fillStyle = index < state.hull ? PALETTE.danger : 'rgba(255, 77, 109, 0.18)';
      context.beginPath();
      context.moveTo(x + heartSize / 2, y + heartSize * 0.85);
      context.bezierCurveTo(x - 2, y + heartSize * 0.45, x + 2, y - 2, x + heartSize / 2, y + heartSize * 0.28);
      context.bezierCurveTo(x + heartSize - 2, y - 2, x + heartSize + 2, y + heartSize * 0.45, x + heartSize / 2, y + heartSize * 0.85);
      context.fill();
    }
    // Dash cooldown, bottom left.
    const dashReady = state.ship.dashCooldown === 0;
    const dashFraction = dashReady ? 1 : 1 - state.ship.dashCooldown / 2.0;
    context.fillStyle = 'rgba(255, 255, 255, 0.16)';
    context.fillRect(26, FIELD.height - 40, 150, 8);
    context.fillStyle = dashReady ? PALETTE.good : PALETTE.ship;
    context.fillRect(26, FIELD.height - 40, 150 * dashFraction, 8);
    text(dashReady ? 'DASH READY  [SPACE]' : 'DASH …', 26, FIELD.height - 62, 16, muted ? PALETTE.muted : PALETTE.text, 'left', 700);
    if (muted) text('MUTED  [M]', FIELD.width - 26, FIELD.height - 62, 16, PALETTE.muted, 'right', 700);
  }

  function drawBanner(state) {
    if (state.bannerTime <= 0) return;
    const alpha = Math.min(1, state.bannerTime / 0.5);
    context.save();
    context.globalAlpha = alpha;
    glowText(state.banner, FIELD.width / 2, 190, 54, PALETTE.ship, 'center', 26);
    context.restore();
  }

  function drawPanel(title, lines, prompt, accent) {
    const height = PANEL.top + lines.length * PANEL.line + PANEL.bottom;
    const x = (FIELD.width - PANEL.width) / 2;
    const y = (FIELD.height - height) / 2;
    context.save();
    context.fillStyle = PALETTE.panel;
    context.strokeStyle = accent ?? PALETTE.panelEdge;
    context.lineWidth = 2;
    context.beginPath();
    context.roundRect(x, y, PANEL.width, height, 18);
    context.fill();
    context.stroke();
    context.restore();
    context.textBaseline = 'alphabetic';
    glowText(title, FIELD.width / 2, y + 82, 52, accent ?? PALETTE.panelEdge, 'center', 22);
    for (let index = 0; index < lines.length; index += 1) {
      text(lines[index], FIELD.width / 2, y + PANEL.top + index * PANEL.line, 21, PALETTE.muted, 'center', 500);
    }
    text(prompt, FIELD.width / 2, y + height - 38, 23, PALETTE.orb, 'center', 700);
  }

  /** Paint one frame: the field, then the HUD or a panel for the screen the game is on. */
  function draw(state, screen, best, muted, now) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(0, 0, canvas.width, canvas.height);
    const shakeX = state.shake > 0 ? (Math.random() - 0.5) * state.shake * 26 : 0;
    const shakeY = state.shake > 0 ? (Math.random() - 0.5) * state.shake * 26 : 0;
    context.setTransform(view.scale, 0, 0, view.scale, view.x + shakeX * view.scale, view.y + shakeY * view.scale);
    drawBackground(now);
    drawOrbs(state, now);
    drawHazards(state);
    drawShip(state, now);
    drawParticles(state);
    if (state.flash > 0) {
      context.fillStyle = `rgba(255, 40, 60, ${state.flash * 0.28})`;
      context.fillRect(0, 0, FIELD.width, FIELD.height);
    }
    if (screen === SCREEN_TITLE) {
      drawPanel(
        'NEON SALVAGE',
        [
          'Pilot your ship. Collect the gold salvage orbs.',
          'Chain pickups for a combo up to x5. Collect 6 orbs',
          'to expose the wave’s magenta core — grab it to',
          'advance, and clear all 5 waves to win.',
          'Dodge the comets. Mind the mines. Three hull hits and',
          'your run is over.',
          'Move: WASD / arrows or mouse · Dash: Space / click',
          'Pause: P · Mute: M',
          best > 0 ? bestLabel(best) : '',
        ],
        'Press Space or click to launch',
        PALETTE.ship,
      );
      return;
    }
    drawHud(state, muted);
    drawBanner(state);
    if (screen === SCREEN_PAUSED) {
      drawPanel('PAUSED', ['The salvage will wait for you.'], 'Press P to resume', PALETTE.ship);
    } else if (screen === SCREEN_OVER) {
      drawPanel(
        'RUN LOST',
        [finalLabel(state.score), bestLabel(best), `Waves cleared: ${state.wave - 1} of 5`, ''],
        'Press Space or click to fly again',
        PALETTE.danger,
      );
    } else if (screen === SCREEN_WIN) {
      const minutes = Math.floor(state.elapsed / 60);
      const seconds = Math.floor(state.elapsed % 60);
      const time = `${minutes}:${String(seconds).padStart(2, '0')}`;
      drawPanel(
        'SECTOR CLEARED!',
        [finalLabel(state.score), bestLabel(best), timeLabel(time), `Orbs salvaged: ${state.orbsCollected}`, `Hits taken: ${state.hitsTaken}`],
        'Press Space or click to fly again',
        PALETTE.good,
      );
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw };
}
