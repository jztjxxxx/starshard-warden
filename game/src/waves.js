// The wave director: turns a wave number into a spawn queue of enemy kinds,
// deals them out from the arena edges over time, and scales their toughness.
// Wave 10 is the boss wave: clear it and the run is won.

import { ENEMY_TYPES, VIEW, WAVES } from './config.js';

const EDGE_MARGIN = 36;

export function buildWaveQueue(wave, random) {
  if (wave === WAVES.bossWave) {
    return ['boss', 'chaser', 'chaser', 'diver', 'chaser', 'diver', 'splitter', 'chaser', 'chaser', 'diver'];
  }
  const budget = WAVES.baseBudget + wave * WAVES.budgetPerWave;
  const queue = [];
  const table = [
    { kind: 'chaser', from: 1, weight: 10 },
    { kind: 'diver', from: 1, weight: 6 },
    { kind: 'splitter', from: 2, weight: 5 },
    { kind: 'tank', from: 4, weight: 3 },
  ];
  let spent = 0;
  while (spent < budget) {
    const options = table.filter((row) => wave >= row.from);
    const totalWeight = options.reduce((sum, row) => sum + row.weight, 0);
    let roll = random.next() * totalWeight;
    let chosen = options[0];
    for (const row of options) {
      roll -= row.weight;
      if (roll <= 0) {
        chosen = row;
        break;
      }
    }
    queue.push(chosen.kind);
    spent += chosen.kind === 'tank' ? 3 : chosen.kind === 'splitter' ? 2 : 1;
  }
  // Shuffle so kinds interleave instead of arriving in blocks.
  for (let i = queue.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random.next() * (i + 1));
    const swap = queue[i];
    queue[i] = queue[j];
    queue[j] = swap;
  }
  return queue;
}

export function hpScaleFor(wave) {
  return 1 + (wave - 1) * 0.16;
}

export function spawnIntervalFor(wave) {
  return Math.max(0.55, 1.35 - wave * 0.08);
}

export function spawnPoint(random) {
  const side = random.int(0, 3);
  if (side === 0) return { x: random.range(EDGE_MARGIN, VIEW.width - EDGE_MARGIN), y: -EDGE_MARGIN };
  if (side === 1) return { x: VIEW.width + EDGE_MARGIN, y: random.range(EDGE_MARGIN, VIEW.height - EDGE_MARGIN) };
  if (side === 2) return { x: random.range(EDGE_MARGIN, VIEW.width - EDGE_MARGIN), y: VIEW.height + EDGE_MARGIN };
  return { x: -EDGE_MARGIN, y: random.range(EDGE_MARGIN, VIEW.height - EDGE_MARGIN) };
}

export function describeWave(wave) {
  if (wave === WAVES.bossWave) return 'THE HOLLOW STAR AWAKENS';
  const names = {
    1: 'FIRST CONTACT',
    2: 'THEY FOUND THE CORE',
    3: 'SPLITTERS INBOUND',
    4: 'HEAVY SIGNATURES',
    5: 'THE SWARM THICKENS',
    6: 'NO QUARTER',
    7: 'DARK HARVEST',
    8: 'THE WALL CRACKS',
    9: 'LAST LIGHT',
  };
  return names[wave] || 'THE VOID STARES BACK';
}

export function enemyCountHint(queue) {
  return queue.reduce((sum, kind) => sum + (kind === 'boss' ? ENEMY_TYPES.boss.shardCount : 1), 0);
}
