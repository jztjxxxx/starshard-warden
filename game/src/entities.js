// Factories for everything that moves: the warden (player), the core it guards,
// hostiles, bullets, shards, particles and floating combat text. Entities are
// plain objects; the world updates them and the renderer draws them.

import { CORE, ENEMY_TYPES, PLAYER, SHARD } from './config.js';

export function createPlayer(x, y) {
  return {
    x,
    y,
    vx: 0,
    vy: 0,
    radius: PLAYER.radius,
    hp: PLAYER.hp,
    maxHp: PLAYER.hp,
    angle: -Math.PI / 2,
    fireTimer: 0,
    fireInterval: PLAYER.fireInterval,
    bulletDamage: PLAYER.bulletDamage,
    bulletCount: 1,
    spreadBonus: 0,
    dashTimer: 0,
    dashCooldown: 0,
    dashDirX: 1,
    dashDirY: 0,
    invulnerable: 0,
    level: 1,
    xp: 0,
    xpNext: 4,
    alive: true,
  };
}

export function createCore(x, y) {
  return {
    x,
    y,
    radius: CORE.radius,
    hp: CORE.hp,
    maxHp: CORE.hp,
    pulse: 0,
    hurtFlash: 0,
  };
}

export function createEnemy(kind, x, y, hpScale, speedScale = 1) {
  const spec = ENEMY_TYPES[kind];
  return {
    kind,
    x,
    y,
    vx: 0,
    vy: 0,
    radius: spec.radius,
    hp: Math.round(spec.hp * hpScale),
    maxHp: Math.round(spec.hp * hpScale),
    speed: spec.speed * speedScale,
    damage: spec.damage,
    coreDamage: spec.coreDamage,
    score: spec.score,
    shardCount: spec.shards,
    color: spec.color,
    wobble: Math.random() * Math.PI * 2,
    burstTimer: 2.4,
    flash: 0,
    touchCooldown: 0,
  };
}

export function createBullet(x, y, angle, friendly) {
  const speed = friendly ? PLAYER.bulletSpeed : 300;
  return {
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    radius: friendly ? PLAYER.bulletRadius : 5,
    damage: friendly ? 0 : 10,
    friendly,
    life: friendly ? 0.95 : 3.4,
  };
}

export function createShard(x, y, random) {
  const angle = random.range(0, Math.PI * 2);
  const speed = random.range(30, 120);
  return {
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    radius: SHARD.radius,
    value: SHARD.value,
    age: 0,
    magnetised: false,
  };
}

export function createParticle(x, y, color, random, big = false) {
  const angle = random.range(0, Math.PI * 2);
  const speed = random.range(big ? 60 : 30, big ? 340 : 190);
  return {
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    radius: random.range(1.4, big ? 4.4 : 3),
    color,
    life: random.range(0.3, big ? 0.95 : 0.6),
    age: 0,
  };
}

export function createText(x, y, value, color) {
  return { x, y, value, color, age: 0, life: 0.85 };
}
