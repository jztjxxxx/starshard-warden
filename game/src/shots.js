// Deterministic screenshot scenes, behind ?shot=title|play|upgrade|boss&seed=n.
// Each scene steps the real simulation with an autopilot that flies the warden
// the way a careful player does: keep distance, aim at the nearest hostile,
// dash out of a crowd, drift back to the core when divers break through. The
// same seed always stages the same frame, and nothing here is drawn by hand.

import { VIEW, WAVES } from './config.js';
import { UPGRADES } from './upgrades.js';
import { createWorld } from './world.js';

const IDLE = { moveX: 0, moveY: 0, aimX: VIEW.width / 2, aimY: 0, mouseX: 0, mouseY: 0, firing: false, dashPressed: false };

function nearest(list, from) {
  let best = null;
  let bestDistance = Infinity;
  for (const item of list) {
    const d = Math.hypot(item.x - from.x, item.y - from.y);
    if (d < bestDistance) {
      bestDistance = d;
      best = item;
    }
  }
  return { target: best, distance: bestDistance };
}

export function autopilotControls(state) {
  const player = state.player;
  const core = state.core;
  if (!player.alive) return IDLE;
  const { target, distance } = nearest(state.enemies, player);
  const diver = state.enemies.find((enemy) => enemy.kind === 'diver' && Math.hypot(enemy.x - core.x, enemy.y - core.y) < 190);

  let moveX = 0;
  let moveY = 0;
  if (target) {
    const awayX = player.x - target.x;
    const awayY = player.y - target.y;
    const awayLength = Math.hypot(awayX, awayY) || 1;
    if (distance < 210) {
      moveX = awayX / awayLength;
      moveY = awayY / awayLength;
    } else if (distance > 330) {
      moveX = -awayX / awayLength;
      moveY = -awayY / awayLength;
    } else {
      // Orbit: perpendicular drift keeps the firing line fresh.
      moveX = -awayY / awayLength;
      moveY = awayX / awayLength;
    }
    // Stay near the core so divers cannot feast on it.
    const coreDistance = Math.hypot(player.x - core.x, player.y - core.y);
    if (coreDistance > 300 && !diver) {
      moveX += (core.x - player.x) / coreDistance;
      moveY += (core.y - player.y) / coreDistance;
    }
  } else {
    const coreDistance = Math.hypot(player.x - core.x, player.y - core.y);
    if (coreDistance > 120) {
      moveX = (core.x - player.x) / coreDistance;
      moveY = (core.y - player.y) / coreDistance;
    }
  }
  const moveLength = Math.hypot(moveX, moveY);
  if (moveLength > 1) {
    moveX /= moveLength;
    moveY /= moveLength;
  }
  const aimTarget = diver || target;
  return {
    moveX,
    moveY,
    aimX: aimTarget ? aimTarget.x : player.x + 1,
    aimY: aimTarget ? aimTarget.y : player.y,
    mouseX: aimTarget ? aimTarget.x : player.x,
    mouseY: aimTarget ? aimTarget.y : player.y,
    firing: Boolean(target) && distance < 560,
    dashPressed: Boolean(target) && distance < 92 && player.dashCooldown <= 0,
  };
}

function runSeconds(world, seconds, step) {
  const steps = Math.floor(seconds / step);
  for (let i = 0; i < steps; i += 1) {
    world.step(step, autopilotControls(world.state));
    if (world.state.over) break;
  }
}

function settle(world) {
  // A staged frame should show each hostile in its true colours, not caught
  // in the white flash of the hit that landed on the final step.
  for (const enemy of world.state.enemies) enemy.flash = 0;
  return world;
}

export function stageShot(name, seed, step) {
  const world = createWorld(seed);
  const state = world.state;
  if (name === 'play') {
    // Field-promote once and jump to wave 4, where the field is dense, then
    // advance until a genuinely busy moment and let it breathe for a second
    // so bolts, shards and particles are all in the air at once.
    UPGRADES[1].apply(state.player, state.core);
    state.player.level = 3;
    state.wave = 3;
    state.phase = 'intermission';
    state.phaseTimer = 0.05;
    let guard = 0;
    while (guard < 120 * 75) {
      world.step(step, autopilotControls(state));
      guard += 1;
      const near = state.enemies.filter(
        (enemy) => Math.hypot(enemy.x - state.player.x, enemy.y - state.player.y) < 430,
      ).length;
      if (state.enemies.length >= 5 && near >= 3 && state.bullets.length >= 3) break;
      if (state.over) break;
    }
    runSeconds(world, 0.7, step);
    return { world: settle(world), screen: 'play' };
  }
  if (name === 'upgrade') {
    let guard = 0;
    while (state.pendingLevels === 0 && !state.over && guard < 120 * 110) {
      world.step(step, autopilotControls(state));
      guard += 1;
    }
    return { world, screen: 'upgrade' };
  }
  if (name === 'boss') {
    // Field-promote the warden, then jump the director to the boss wave.
    const player = state.player;
    UPGRADES[2].apply(player, state.core);
    UPGRADES[1].apply(player, state.core);
    UPGRADES[0].apply(player, state.core);
    player.level = 7;
    state.score = 8640;
    state.kills = 132;
    state.wave = WAVES.bossWave - 1;
    state.phase = 'intermission';
    state.phaseTimer = 0.05;
    runSeconds(world, 13, step);
    return { world: settle(world), screen: 'boss' };
  }
  // Title: a living field behind the menu — one wave, flown gently.
  runSeconds(world, 7, step);
  return { world, screen: 'title' };
}
