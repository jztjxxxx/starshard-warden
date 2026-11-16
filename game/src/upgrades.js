// The level-up draft: when the warden gains a level the game pauses and offers
// three of these. Each upgrade mutates the player or the core exactly once, and
// the same pool stays useful from wave 1 to the boss.

export const UPGRADES = [
  {
    id: 'rapid',
    name: 'Rapid Cycler',
    blurb: 'Fire 18% faster. The swarm hates arithmetic.',
    apply(player) {
      player.fireInterval = Math.max(0.07, player.fireInterval * 0.82);
    },
  },
  {
    id: 'heavy',
    name: 'Heavy Bolts',
    blurb: '+5 damage on every bolt you loose.',
    apply(player) {
      player.bulletDamage += 5;
    },
  },
  {
    id: 'twin',
    name: 'Twin Array',
    blurb: '+1 bolt per shot, fanned across your aim.',
    apply(player) {
      player.bulletCount += 1;
    },
  },
  {
    id: 'boots',
    name: 'Drift Boots',
    blurb: 'Move 12% faster. Distance is armour.',
    apply(player) {
      player.speedBonus = (player.speedBonus || 0) + 0.12;
    },
  },
  {
    id: 'dash',
    name: 'Phase Cell',
    blurb: 'Dash recharges 30% sooner.',
    apply(player) {
      player.dashCooldownMax = (player.dashCooldownMax || 2.4) * 0.7;
    },
  },
  {
    id: 'hull',
    name: 'Spare Hull',
    blurb: '+25 max health and mend 25 now.',
    apply(player) {
      player.maxHp += 25;
      player.hp = Math.min(player.maxHp, player.hp + 25);
    },
  },
  {
    id: 'magnet',
    name: 'Shard Magnet',
    blurb: 'Shards fly to you from 60% farther away.',
    apply(player) {
      player.magnetBonus = (player.magnetBonus || 0) + 0.6;
    },
  },
  {
    id: 'coreplate',
    name: 'Core Plating',
    blurb: 'The Star Core gains +30 max health and mends 30.',
    apply(player, core) {
      core.maxHp += 30;
      core.hp = Math.min(core.maxHp, core.hp + 30);
    },
  },
];

export function draftUpgrades(random, count = 3) {
  const pool = UPGRADES.slice();
  const chosen = [];
  while (chosen.length < count && pool.length > 0) {
    const index = Math.floor(random.next() * pool.length);
    chosen.push(pool.splice(index, 1)[0]);
  }
  return chosen;
}
