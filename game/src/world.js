// The simulation: one world, stepped at a fixed rate. It owns the player, the
// Star Core, every hostile, bullet, shard and particle, and it advances waves,
// combat, pickups and win/lose conditions. Sound and screens live outside: the
// world appends cue names to state.events and the shell plays and shows them.

import { CORE, DEFAULT_DIFFICULTY, LEVELS, PLAYER, SCORE, SHARD, VIEW, WAVES, difficultyById } from './config.js';
import {
  createBullet,
  createCore,
  createEnemy,
  createParticle,
  createPlayer,
  createShard,
  createText,
} from './entities.js';
import { createRandom } from './random.js';
import { buildWaveQueue, describeWave, hpScaleFor, spawnIntervalFor, spawnPoint } from './waves.js';

export const EVENT_LEVELUP = 'levelup';
export const EVENT_VICTORY = 'victory';
export const EVENT_GAMEOVER = 'gameover';

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function angleTo(a, b) {
  return Math.atan2(b.y - a.y, b.x - a.x);
}

export function createWorld(seed, difficultyId = DEFAULT_DIFFICULTY) {
  const random = createRandom(seed);
  const difficulty = difficultyById(difficultyId);
  const state = {
    time: 0,
    difficulty,
    difficultyName: difficulty.name,
    player: createPlayer(VIEW.width / 2, VIEW.height - 190),
    core: createCore(VIEW.width / 2, VIEW.height / 2),
    enemies: [],
    bullets: [],
    shards: [],
    particles: [],
    texts: [],
    wave: 0,
    phase: 'intermission',
    phaseTimer: 1.2,
    spawnQueue: [],
    spawnTimer: 0,
    banner: '',
    bannerTimer: 0,
    score: 0,
    kills: 0,
    pendingLevels: 0,
    shake: 0,
    events: [],
    over: false,
    won: false,
  };

  function burst(x, y, color, count, big = false) {
    for (let i = 0; i < count; i += 1) state.particles.push(createParticle(x, y, color, random, big));
  }

  // Every point a run earns passes through the difficulty's payout rate.
  function award(points) {
    return Math.round(points * difficulty.score);
  }

  function startWave(wave) {
    state.wave = wave;
    state.spawnQueue = buildWaveQueue(wave, random, difficulty.budget);
    state.spawnTimer = 0.4;
    state.phase = 'combat';
    state.banner = `WAVE ${wave} — ${describeWave(wave)}`;
    state.bannerTimer = 2.8;
  }

  function damagePlayer(amount) {
    const player = state.player;
    if (player.invulnerable > 0 || player.dashTimer > 0 || state.over) return;
    player.hp -= amount;
    player.invulnerable = PLAYER.invulnerableTime;
    state.shake = Math.max(state.shake, 9);
    state.events.push('hurt');
    burst(player.x, player.y, '#ff5d7a', 12);
    if (player.hp <= 0) {
      player.hp = 0;
      player.alive = false;
      state.over = true;
      burst(player.x, player.y, '#5df2ff', 46, true);
      state.events.push('explosion-big', EVENT_GAMEOVER);
    }
  }

  function damageCore(amount, fromX, fromY) {
    const core = state.core;
    core.hp -= amount;
    core.hurtFlash = 0.25;
    state.shake = Math.max(state.shake, 6);
    state.texts.push(createText(core.x, core.y - core.radius - 14, `-${amount}`, '#ffd75d'));
    burst(fromX, fromY, '#ffd75d', 8);
    if (core.hp <= 0) {
      core.hp = 0;
      state.over = true;
      burst(core.x, core.y, '#ffd75d', 60, true);
      state.events.push('explosion-big', EVENT_GAMEOVER);
    }
  }

  function killEnemy(enemy) {
    state.kills += 1;
    const gained = award(enemy.score);
    state.score += gained;
    state.events.push(enemy.kind === 'boss' || enemy.kind === 'tank' ? 'explosion-big' : 'explosion');
    burst(enemy.x, enemy.y, enemy.color, enemy.kind === 'boss' ? 70 : 16, enemy.kind === 'boss' || enemy.kind === 'tank');
    state.texts.push(createText(enemy.x, enemy.y - enemy.radius, `+${gained}`, '#dfe9ff'));
    for (let i = 0; i < enemy.shardCount; i += 1) state.shards.push(createShard(enemy.x, enemy.y, random));
    if (enemy.kind === 'splitter') {
      for (let i = 0; i < 3; i += 1) {
        const mini = createEnemy('mini', enemy.x + random.range(-14, 14), enemy.y + random.range(-14, 14), hpScaleFor(state.wave) * difficulty.enemyHp, difficulty.enemySpeed);
        state.enemies.push(mini);
      }
    }
    if (enemy.kind === 'boss') {
      state.won = true;
      state.score += award(SCORE.victory);
      state.events.push(EVENT_VICTORY);
    }
  }

  function stepPlayer(dt, controls) {
    const player = state.player;
    if (!player.alive) return;
    const speed = PLAYER.speed * (1 + (player.speedBonus || 0));
    if (player.dashTimer > 0) {
      player.dashTimer -= dt;
      player.x += player.dashDirX * PLAYER.dashSpeed * dt;
      player.y += player.dashDirY * PLAYER.dashSpeed * dt;
      state.particles.push({
        x: player.x,
        y: player.y,
        vx: 0,
        vy: 0,
        radius: player.radius * 0.8,
        color: 'rgba(93, 242, 255, 0.5)',
        life: 0.3,
        age: 0,
      });
    } else {
      player.x += controls.moveX * speed * dt;
      player.y += controls.moveY * speed * dt;
    }
    player.x = Math.min(VIEW.width - player.radius, Math.max(player.radius, player.x));
    player.y = Math.min(VIEW.height - player.radius, Math.max(player.radius, player.y));
    player.angle = Math.atan2(controls.aimY - player.y, controls.aimX - player.x);

    if (player.dashCooldown > 0) player.dashCooldown -= dt;
    if (controls.dashPressed && player.dashCooldown <= 0 && player.dashTimer <= 0) {
      const dirX = controls.moveX !== 0 || controls.moveY !== 0 ? controls.moveX : Math.cos(player.angle);
      const dirY = controls.moveX !== 0 || controls.moveY !== 0 ? controls.moveY : Math.sin(player.angle);
      const length = Math.hypot(dirX, dirY) || 1;
      player.dashDirX = dirX / length;
      player.dashDirY = dirY / length;
      player.dashTimer = PLAYER.dashTime;
      player.dashCooldown = player.dashCooldownMax || PLAYER.dashCooldown;
      state.events.push('dash');
    }
    if (player.invulnerable > 0) player.invulnerable -= dt;

    player.fireTimer -= dt;
    if (controls.firing && player.fireTimer <= 0) {
      player.fireTimer = player.fireInterval;
      const count = player.bulletCount;
      const spreadStep = 0.085;
      for (let i = 0; i < count; i += 1) {
        const offset = (i - (count - 1) / 2) * spreadStep;
        const bullet = createBullet(
          player.x + Math.cos(player.angle) * (player.radius + 6),
          player.y + Math.sin(player.angle) * (player.radius + 6),
          player.angle + offset,
          true,
        );
        bullet.damage = player.bulletDamage;
        state.bullets.push(bullet);
      }
      state.events.push('shoot');
    }
  }

  function stepEnemies(dt) {
    const player = state.player;
    const core = state.core;
    for (const enemy of state.enemies) {
      const targetsCore = enemy.kind === 'diver';
      const target = targetsCore ? core : player.alive ? player : core;
      const angle = angleTo(enemy, target);
      enemy.wobble += dt * 3;
      const wobbleX = Math.cos(enemy.wobble) * 14;
      const wobbleY = Math.sin(enemy.wobble * 1.3) * 14;
      enemy.x += (Math.cos(angle) * enemy.speed + wobbleX * 0.4) * dt;
      enemy.y += (Math.sin(angle) * enemy.speed + wobbleY * 0.4) * dt;
      if (enemy.flash > 0) enemy.flash -= dt;
      if (enemy.touchCooldown > 0) enemy.touchCooldown -= dt;

      // Gentle separation so the swarm reads as bodies, not a stack.
      for (const other of state.enemies) {
        if (other === enemy) continue;
        const d = distance(enemy, other);
        const min = enemy.radius + other.radius;
        if (d > 0 && d < min) {
          enemy.x += ((enemy.x - other.x) / d) * (min - d) * 0.32;
          enemy.y += ((enemy.y - other.y) / d) * (min - d) * 0.32;
        }
      }

      if (enemy.kind === 'boss') {
        enemy.burstTimer -= dt;
        if (enemy.burstTimer <= 0) {
          enemy.burstTimer = 2.6;
          const shots = 14;
          for (let i = 0; i < shots; i += 1) {
            const bullet = createBullet(enemy.x, enemy.y, (i / shots) * Math.PI * 2 + state.time, false);
            state.bullets.push(bullet);
          }
          state.events.push('bossshot');
          state.shake = Math.max(state.shake, 4);
        }
      }

      if (player.alive && distance(enemy, player) < enemy.radius + player.radius && enemy.touchCooldown <= 0) {
        enemy.touchCooldown = 0.65;
        damagePlayer(enemy.damage);
      }
      if (distance(enemy, core) < enemy.radius + core.radius && enemy.touchCooldown <= 0) {
        enemy.touchCooldown = 0.8;
        damageCore(enemy.coreDamage > 0 ? enemy.coreDamage : Math.ceil(enemy.damage / 2), enemy.x, enemy.y);
      }
    }
  }

  function stepBullets(dt) {
    const player = state.player;
    const core = state.core;
    for (const bullet of state.bullets) {
      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;
      bullet.life -= dt;
      if (!bullet.friendly) {
        if (player.alive && distance(bullet, player) < bullet.radius + player.radius) {
          bullet.life = 0;
          damagePlayer(bullet.damage);
        } else if (distance(bullet, core) < bullet.radius + core.radius) {
          bullet.life = 0;
          damageCore(6, bullet.x, bullet.y);
        }
        continue;
      }
      for (const enemy of state.enemies) {
        if (enemy.hp <= 0) continue;
        if (distance(bullet, enemy) < bullet.radius + enemy.radius) {
          bullet.life = 0;
          enemy.hp -= bullet.damage;
          enemy.flash = 0.09;
          state.events.push('hit');
          burst(bullet.x, bullet.y, enemy.color, 3);
          if (enemy.hp <= 0) killEnemy(enemy);
          break;
        }
      }
    }
    state.bullets = state.bullets.filter(
      (b) => b.life > 0 && b.x > -60 && b.x < VIEW.width + 60 && b.y > -60 && b.y < VIEW.height + 60,
    );
    state.enemies = state.enemies.filter((e) => e.hp > 0);
  }

  function stepShards(dt) {
    const player = state.player;
    for (const shard of state.shards) {
      shard.age += dt;
      shard.x += shard.vx * dt;
      shard.y += shard.vy * dt;
      shard.vx *= 0.92;
      shard.vy *= 0.92;
      if (player.alive) {
        const d = distance(shard, player);
        const magnetRadius = PLAYER.magnetRadius * (1 + (player.magnetBonus || 0));
        if (d < magnetRadius) {
          const angle = angleTo(shard, player);
          const pull = 560 * (1 - d / (magnetRadius * 1.6));
          shard.x += Math.cos(angle) * pull * dt;
          shard.y += Math.sin(angle) * pull * dt;
        }
        if (d < PLAYER.pickupRadius + shard.radius) {
          shard.age = SHARD.lifeTime;
          player.xp += shard.value;
          state.score += award(SCORE.shardPickup);
          state.events.push('pickup');
          while (player.xp >= player.xpNext) {
            player.xp -= player.xpNext;
            player.level += 1;
            player.xpNext += LEVELS.growth;
            state.pendingLevels += 1;
            state.events.push(EVENT_LEVELUP);
          }
        }
      }
    }
    state.shards = state.shards.filter((s) => s.age < SHARD.lifeTime);
  }

  function stepFx(dt) {
    for (const particle of state.particles) {
      particle.age += dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vx *= 0.94;
      particle.vy *= 0.94;
    }
    state.particles = state.particles.filter((p) => p.age < p.life);
    for (const text of state.texts) {
      text.age += dt;
      text.y -= 34 * dt;
    }
    state.texts = state.texts.filter((t) => t.age < t.life);
    if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 26);
    if (state.bannerTimer > 0) state.bannerTimer -= dt;
    state.core.pulse += dt * CORE.pulseSpeed;
    if (state.core.hurtFlash > 0) state.core.hurtFlash -= dt;
  }

  function step(dt, controls) {
    state.events.length = 0;
    if (state.over || state.won) {
      stepFx(dt);
      return state.events;
    }
    state.time += dt;

    if (state.phase === 'intermission') {
      state.phaseTimer -= dt;
      if (state.phaseTimer <= 0) startWave(state.wave + 1);
    } else if (state.phase === 'combat') {
      if (state.spawnQueue.length > 0) {
        state.spawnTimer -= dt;
        if (state.spawnTimer <= 0) {
          state.spawnTimer = spawnIntervalFor(state.wave);
          const kind = state.spawnQueue.shift();
          const point = spawnPoint(random);
          state.enemies.push(createEnemy(kind, point.x, point.y, hpScaleFor(state.wave) * difficulty.enemyHp, difficulty.enemySpeed));
        }
      } else if (state.enemies.length === 0 && !state.won) {
        state.score += award(SCORE.waveClear);
        state.events.push('waveclear');
        state.banner = `WAVE ${state.wave} CLEAR`;
        state.bannerTimer = 2;
        state.phase = 'intermission';
        state.phaseTimer = WAVES.intermission;
      }
    }

    stepPlayer(dt, controls);
    stepEnemies(dt);
    stepBullets(dt);
    stepShards(dt);
    stepFx(dt);
    return state.events;
  }

  return { state, step, random };
}
