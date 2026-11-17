// Balance and presentation constants for Starshard Warden.
// Every tunable number lives here so the rest of the code stays declarative.

export const VIEW = { width: 1280, height: 800 };

export const STEP = 1 / 120;

export const COLORS = {
  void: '#070912',
  nebulaA: '#131a3a',
  nebulaB: '#2a1140',
  grid: 'rgba(96, 140, 255, 0.07)',
  player: '#5df2ff',
  playerCore: '#eaffff',
  bullet: '#aef7ff',
  core: '#ffd75d',
  coreDim: '#8a6a1f',
  shard: '#7dffb2',
  heart: '#ff5d7a',
  text: '#dfe9ff',
  textDim: '#8fa3cc',
  danger: '#ff5470',
};

export const PLAYER = {
  radius: 14,
  speed: 265,
  hp: 100,
  fireInterval: 0.21,
  bulletSpeed: 640,
  bulletDamage: 13,
  bulletRadius: 4,
  dashSpeed: 1150,
  dashTime: 0.16,
  dashCooldown: 2.4,
  magnetRadius: 92,
  pickupRadius: 22,
  invulnerableTime: 0.7,
};

export const CORE = {
  radius: 30,
  hp: 175,
  pulseSpeed: 2.2,
};

export const ENEMY_TYPES = {
  chaser: { radius: 15, hp: 22, speed: 112, damage: 10, coreDamage: 0, score: 40, shards: 1, color: '#ff5d7a' },
  diver: { radius: 13, hp: 16, speed: 148, damage: 6, coreDamage: 9, score: 55, shards: 1, color: '#ff9f43' },
  splitter: { radius: 19, hp: 34, speed: 86, damage: 12, coreDamage: 0, score: 70, shards: 2, color: '#c86bff' },
  mini: { radius: 9, hp: 8, speed: 172, damage: 5, coreDamage: 0, score: 15, shards: 0, color: '#e39bff' },
  tank: { radius: 24, hp: 105, speed: 52, damage: 20, coreDamage: 14, score: 160, shards: 3, color: '#ff3860' },
  boss: { radius: 46, hp: 1450, speed: 34, damage: 26, coreDamage: 22, score: 2500, shards: 14, color: '#ff2e63' },
};

export const WAVES = {
  total: 10,
  bossWave: 10,
  intermission: 2.6,
  // Kills needed is implicit: a wave ends when its spawn queue is empty and the field is clear.
  baseBudget: 6,
  budgetPerWave: 3,
};

export const LEVELS = {
  first: 4,
  growth: 3,
};

export const SHARD = {
  radius: 6,
  value: 1,
  driftTime: 0.9,
  lifeTime: 26,
};

export const SCORE = {
  shardPickup: 5,
  waveClear: 250,
  victory: 2000,
};

// The three watches. A difficulty scales how tough and how numerous the
// Hollow are, and what a run pays out: an easier dark is safer and poorer,
// the Hollow watch is richer because it is likelier to end you. Records are
// kept per difficulty (see records.js), so scores never compare across them.
export const DIFFICULTIES = {
  patrol: {
    id: 'patrol',
    name: 'PATROL',
    blurb: 'A gentler dark. Learn the watch.',
    enemyHp: 0.8,
    enemySpeed: 0.92,
    budget: 0.8,
    score: 0.8,
  },
  warden: {
    id: 'warden',
    name: 'WARDEN',
    blurb: 'The watch as it was meant to be stood.',
    enemyHp: 1,
    enemySpeed: 1,
    budget: 1,
    score: 1,
  },
  hollow: {
    id: 'hollow',
    name: 'HOLLOW',
    blurb: 'The dark pushes back. Riches for the bold.',
    enemyHp: 1.3,
    enemySpeed: 1.08,
    budget: 1.25,
    score: 1.5,
  },
};

export const DEFAULT_DIFFICULTY = 'warden';

export function difficultyById(id) {
  return DIFFICULTIES[id] || DIFFICULTIES[DEFAULT_DIFFICULTY];
}
