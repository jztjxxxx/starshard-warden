// Every pixel of the game itself: the nebula field, the Star Core, the warden,
// hostiles with a silhouette per kind, bullets, shards, particles, floating
// text and the HUD. Screens (title, upgrade draft, game over, victory) are DOM
// overlays in index.html; this file draws the world beneath and behind them.

import { COLORS, VIEW } from './config.js';
import { createRandom } from './random.js';

const stars = (() => {
  const random = createRandom(20261115);
  const list = [];
  for (let i = 0; i < 170; i += 1) {
    list.push({
      x: random.range(0, VIEW.width),
      y: random.range(0, VIEW.height),
      radius: random.range(0.6, 2.1),
      layer: random.pick([0.25, 0.5, 1]),
      twinkle: random.range(0, Math.PI * 2),
    });
  }
  return list;
})();

function drawBackground(ctx, time) {
  const gradient = ctx.createLinearGradient(0, 0, VIEW.width, VIEW.height);
  gradient.addColorStop(0, COLORS.nebulaA);
  gradient.addColorStop(0.55, COLORS.void);
  gradient.addColorStop(1, COLORS.nebulaB);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);

  const glowA = ctx.createRadialGradient(VIEW.width * 0.22, VIEW.height * 0.2, 10, VIEW.width * 0.22, VIEW.height * 0.2, 420);
  glowA.addColorStop(0, 'rgba(64, 110, 255, 0.20)');
  glowA.addColorStop(1, 'rgba(64, 110, 255, 0)');
  ctx.fillStyle = glowA;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  const glowB = ctx.createRadialGradient(VIEW.width * 0.82, VIEW.height * 0.78, 10, VIEW.width * 0.82, VIEW.height * 0.78, 460);
  glowB.addColorStop(0, 'rgba(190, 60, 255, 0.14)');
  glowB.addColorStop(1, 'rgba(190, 60, 255, 0)');
  ctx.fillStyle = glowB;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);

  ctx.strokeStyle = COLORS.grid;
  ctx.lineWidth = 1;
  const gridSize = 64;
  ctx.beginPath();
  for (let x = gridSize; x < VIEW.width; x += gridSize) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, VIEW.height);
  }
  for (let y = gridSize; y < VIEW.height; y += gridSize) {
    ctx.moveTo(0, y);
    ctx.lineTo(VIEW.width, y);
  }
  ctx.stroke();

  for (const star of stars) {
    const drift = (time * 6 * star.layer) % (VIEW.height + 8);
    const y = (star.y + drift) % VIEW.height;
    const alpha = 0.35 + 0.4 * Math.abs(Math.sin(time * 0.7 + star.twinkle));
    ctx.fillStyle = `rgba(210, 228, 255, ${alpha.toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(star.x, y, star.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawCore(ctx, core) {
  const pulse = 1 + Math.sin(core.pulse) * 0.06;
  const radius = core.radius * pulse;
  ctx.save();
  ctx.translate(core.x, core.y);
  const halo = ctx.createRadialGradient(0, 0, radius * 0.3, 0, 0, radius * 2.6);
  halo.addColorStop(0, core.hurtFlash > 0 ? 'rgba(255, 84, 112, 0.5)' : 'rgba(255, 215, 93, 0.42)');
  halo.addColorStop(1, 'rgba(255, 215, 93, 0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(0, 0, radius * 2.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.rotate(core.pulse * 0.35);
  ctx.fillStyle = core.hurtFlash > 0 ? '#ff8fa3' : COLORS.core;
  ctx.shadowColor = COLORS.core;
  ctx.shadowBlur = 26;
  ctx.beginPath();
  for (let i = 0; i < 6; i += 1) {
    const angle = (i / 6) * Math.PI * 2;
    const px = Math.cos(angle) * radius;
    const py = Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#fff7d6';
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.38, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawPlayer(ctx, player, time) {
  if (!player.alive) return;
  const blink = player.invulnerable > 0 && Math.floor(time * 18) % 2 === 0;
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.rotate(player.angle);
  ctx.globalAlpha = blink ? 0.35 : 1;
  ctx.shadowColor = COLORS.player;
  ctx.shadowBlur = 18;
  ctx.fillStyle = COLORS.player;
  ctx.beginPath();
  ctx.moveTo(player.radius + 5, 0);
  ctx.lineTo(-player.radius, -player.radius * 0.78);
  ctx.lineTo(-player.radius * 0.45, 0);
  ctx.lineTo(-player.radius, player.radius * 0.78);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = COLORS.playerCore;
  ctx.beginPath();
  ctx.arc(1, 0, 4.6, 0, Math.PI * 2);
  ctx.fill();
  // Engine flame, longer while moving fast or dashing.
  const flame = player.dashTimer > 0 ? 26 : 12 + Math.sin(time * 31) * 3;
  ctx.fillStyle = 'rgba(255, 170, 60, 0.85)';
  ctx.beginPath();
  ctx.moveTo(-player.radius * 0.5, -4);
  ctx.lineTo(-player.radius * 0.5 - flame, 0);
  ctx.lineTo(-player.radius * 0.5, 4);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function polygon(ctx, x, y, radius, sides, rotation) {
  ctx.beginPath();
  for (let i = 0; i < sides; i += 1) {
    const angle = rotation + (i / sides) * Math.PI * 2;
    const px = x + Math.cos(angle) * radius;
    const py = y + Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function drawEnemy(ctx, enemy, time) {
  ctx.save();
  ctx.translate(enemy.x, enemy.y);
  const flash = enemy.flash > 0;
  ctx.fillStyle = flash ? '#ffffff' : enemy.color;
  ctx.shadowColor = enemy.color;
  ctx.shadowBlur = 12;
  const facing = Math.atan2(enemy.vy, enemy.vx);
  if (enemy.kind === 'chaser') {
    ctx.rotate(facing + Math.PI / 2);
    polygon(ctx, 0, 0, enemy.radius, 3, -Math.PI / 2);
    ctx.fill();
  } else if (enemy.kind === 'diver') {
    ctx.rotate(facing);
    ctx.beginPath();
    ctx.moveTo(enemy.radius + 4, 0);
    ctx.lineTo(-enemy.radius, -enemy.radius * 0.62);
    ctx.lineTo(-enemy.radius * 0.3, 0);
    ctx.lineTo(-enemy.radius, enemy.radius * 0.62);
    ctx.closePath();
    ctx.fill();
  } else if (enemy.kind === 'splitter') {
    polygon(ctx, 0, 0, enemy.radius, 6, time * 0.8);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.beginPath();
    ctx.arc(0, 0, enemy.radius * 0.3, 0, Math.PI * 2);
    ctx.fill();
  } else if (enemy.kind === 'mini') {
    polygon(ctx, 0, 0, enemy.radius, 4, time * 2.4);
    ctx.fill();
  } else if (enemy.kind === 'tank') {
    polygon(ctx, 0, 0, enemy.radius, 4, Math.PI / 4 + Math.sin(time) * 0.1);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.65)';
    ctx.lineWidth = 2;
    polygon(ctx, 0, 0, enemy.radius * 0.58, 4, Math.PI / 4);
    ctx.stroke();
  } else if (enemy.kind === 'boss') {
    polygon(ctx, 0, 0, enemy.radius, 8, time * 0.35);
    ctx.fill();
    polygon(ctx, 0, 0, enemy.radius * 0.66, 8, -time * 0.5);
    ctx.fillStyle = flash ? '#ffffff' : '#8f1030';
    ctx.fill();
    ctx.fillStyle = '#ffe3ec';
    ctx.beginPath();
    ctx.arc(0, 0, enemy.radius * 0.24 + Math.sin(time * 5) * 2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  if ((enemy.kind === 'tank' || enemy.kind === 'boss') && enemy.hp < enemy.maxHp) {
    const width = enemy.radius * 2;
    const ratio = Math.max(0, enemy.hp / enemy.maxHp);
    ctx.fillStyle = 'rgba(10, 12, 24, 0.7)';
    ctx.fillRect(enemy.x - enemy.radius, enemy.y - enemy.radius - 13, width, 5);
    ctx.fillStyle = '#ff5470';
    ctx.fillRect(enemy.x - enemy.radius, enemy.y - enemy.radius - 13, width * ratio, 5);
  }
}

function drawShards(ctx, shards, time) {
  for (const shard of shards) {
    const blink = shard.age > 20 && Math.floor(time * 6) % 2 === 0;
    ctx.save();
    ctx.translate(shard.x, shard.y);
    ctx.rotate(time * 2 + shard.x * 0.05);
    ctx.globalAlpha = blink ? 0.3 : 1;
    ctx.fillStyle = COLORS.shard;
    ctx.shadowColor = COLORS.shard;
    ctx.shadowBlur = 10;
    polygon(ctx, 0, 0, shard.radius, 4, 0);
    ctx.fill();
    ctx.restore();
  }
}

function drawBullets(ctx, bullets) {
  for (const bullet of bullets) {
    ctx.save();
    ctx.fillStyle = bullet.friendly ? COLORS.bullet : '#ff7a93';
    ctx.shadowColor = bullet.friendly ? COLORS.bullet : '#ff5470';
    ctx.shadowBlur = 9;
    ctx.beginPath();
    ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawParticles(ctx, particles) {
  for (const particle of particles) {
    const ratio = 1 - particle.age / particle.life;
    ctx.globalAlpha = Math.max(0, ratio);
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.radius * ratio + 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawTexts(ctx, texts) {
  ctx.font = '600 15px "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = 'center';
  for (const text of texts) {
    ctx.globalAlpha = Math.max(0, 1 - text.age / text.life);
    ctx.fillStyle = text.color;
    ctx.fillText(text.value, text.x, text.y);
  }
  ctx.globalAlpha = 1;
}

function bar(ctx, x, y, width, height, ratio, fill, label) {
  ctx.fillStyle = 'rgba(8, 10, 20, 0.72)';
  ctx.fillRect(x, y, width, height);
  ctx.strokeStyle = 'rgba(160, 190, 255, 0.35)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1);
  ctx.fillStyle = fill;
  ctx.fillRect(x + 2, y + 2, (width - 4) * Math.max(0, Math.min(1, ratio)), height - 4);
  if (label) {
    ctx.fillStyle = COLORS.text;
    ctx.font = '600 12px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(label, x + 6, y + height - 4);
  }
}

function drawHud(ctx, state) {
  const player = state.player;
  const core = state.core;
  ctx.save();
  bar(ctx, 18, 16, 230, 17, player.hp / player.maxHp, '#5df2ff', `WARDEN ${Math.ceil(player.hp)}/${player.maxHp}`);
  bar(ctx, 18, 38, 230, 12, player.xp / player.xpNext, '#7dffb2', null);
  ctx.fillStyle = COLORS.text;
  ctx.font = '600 13px "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`LV ${player.level}`, 256, 50);
  const dashRatio = 1 - Math.max(0, player.dashCooldown) / (player.dashCooldownMax || 2.4);
  bar(ctx, 18, 55, 120, 9, dashRatio, '#c86bff', null);
  ctx.fillStyle = COLORS.textDim;
  ctx.font = '12px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('DASH', 144, 63);

  bar(ctx, VIEW.width / 2 - 150, VIEW.height - 30, 300, 14, core.hp / core.maxHp, '#ffd75d', `STAR CORE ${Math.ceil(core.hp)}/${core.maxHp}`);

  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.text;
  ctx.font = '700 20px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(state.wave > 0 ? `WAVE ${state.wave} / 10` : 'STAND BY', VIEW.width / 2, 34);
  const remaining = state.spawnQueue.length + state.enemies.length;
  ctx.font = '13px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = COLORS.textDim;
  if (state.phase === 'combat') ctx.fillText(`${remaining} hostile${remaining === 1 ? '' : 's'} remain`, VIEW.width / 2, 54);

  ctx.textAlign = 'right';
  ctx.fillStyle = COLORS.text;
  ctx.font = '700 20px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(`${state.score}`, VIEW.width - 18, 34);
  ctx.font = '12px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = COLORS.textDim;
  ctx.fillText('SCORE', VIEW.width - 18, 52);

  const boss = state.enemies.find((enemy) => enemy.kind === 'boss');
  if (boss) {
    bar(ctx, VIEW.width / 2 - 260, 66, 520, 13, boss.hp / boss.maxHp, '#ff2e63', 'THE HOLLOW STAR');
  }

  if (state.bannerTimer > 0 && state.banner) {
    const alpha = Math.min(1, state.bannerTimer / 0.6);
    ctx.globalAlpha = alpha;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 34px "Segoe UI", system-ui, sans-serif';
    ctx.shadowColor = 'rgba(93, 242, 255, 0.8)';
    ctx.shadowBlur = 22;
    ctx.fillText(state.banner, VIEW.width / 2, 150);
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  return {
    draw(state) {
      ctx.save();
      if (state.shake > 0.2) {
        ctx.translate((Math.random() - 0.5) * state.shake, (Math.random() - 0.5) * state.shake);
      }
      drawBackground(ctx, state.time);
      drawShards(ctx, state.shards, state.time);
      drawCore(ctx, state.core);
      for (const enemy of state.enemies) drawEnemy(ctx, enemy, state.time);
      drawBullets(ctx, state.bullets);
      drawPlayer(ctx, state.player, state.time);
      drawParticles(ctx, state.particles);
      drawTexts(ctx, state.texts);
      ctx.restore();
      drawHud(ctx, state);
    },
  };
}
