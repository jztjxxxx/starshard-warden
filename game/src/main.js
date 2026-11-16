// The shell: boots the game, runs the fixed-step loop, routes world events to
// the synth, and moves between the title, play, upgrade-draft, game-over and
// victory screens. With ?shot=<scene>&seed=<n> it instead stages one
// deterministic scene from shots.js and holds it for the screenshot.

import { STEP } from './config.js';
import { createAudio } from './audio.js';
import { createInput } from './input.js';
import { createRenderer } from './render.js';
import { autopilotControls, stageShot } from './shots.js';
import { draftUpgrades } from './upgrades.js';
import { createWorld, EVENT_GAMEOVER, EVENT_LEVELUP, EVENT_VICTORY } from './world.js';

const canvas = document.getElementById('game');
const renderer = createRenderer(canvas);
const audio = createAudio();
const input = createInput(canvas);

const screens = {
  title: document.getElementById('screen-title'),
  upgrade: document.getElementById('screen-upgrade'),
  over: document.getElementById('screen-over'),
  victory: document.getElementById('screen-victory'),
};
const pauseBadge = document.getElementById('pause-badge');
const cardsBox = document.getElementById('upgrade-cards');

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const shotSeed = Number(params.get('seed') || '1') >>> 0;

let world = createWorld(20261115);
let mode = 'title';
let paused = false;
let currentDraft = [];
let lastHitSound = 0;
let lastPickupSound = 0;
let endSoundPlayed = false;

function showOnly(name) {
  for (const [key, element] of Object.entries(screens)) {
    element.classList.toggle('hidden', key !== name);
  }
}

function statsLine() {
  const minutes = Math.floor(world.state.time / 60);
  const seconds = Math.floor(world.state.time % 60).toString().padStart(2, '0');
  return `Score <b>${world.state.score}</b> · reached wave <b>${Math.max(1, world.state.wave)}</b> · ` +
    `<b>${world.state.kills}</b> kills · ${minutes}:${seconds} on the watch`;
}

function openDraft() {
  mode = 'upgrade';
  currentDraft = draftUpgrades(world.random, 3);
  cardsBox.innerHTML = '';
  currentDraft.forEach((upgrade, index) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'card';
    card.innerHTML = `<span class="key">${index + 1}</span><h3></h3><p></p>`;
    card.querySelector('h3').textContent = upgrade.name;
    card.querySelector('p').textContent = upgrade.blurb;
    card.addEventListener('click', () => chooseUpgrade(index));
    cardsBox.appendChild(card);
  });
  showOnly('upgrade');
  audio.levelUp();
}

function chooseUpgrade(index) {
  const upgrade = currentDraft[index];
  if (!upgrade || mode !== 'upgrade') return;
  upgrade.apply(world.state.player, world.state.core);
  world.state.pendingLevels -= 1;
  if (world.state.pendingLevels > 0) {
    openDraft();
    return;
  }
  mode = 'playing';
  showOnly(null);
}

function startRun() {
  world = createWorld((Date.now() & 0xffffffff) >>> 0);
  mode = 'playing';
  paused = false;
  endSoundPlayed = false;
  pauseBadge.classList.add('hidden');
  showOnly(null);
  audio.unlock();
}

function finishRun(won) {
  mode = won ? 'victory' : 'over';
  document.getElementById(won ? 'victory-stats' : 'over-stats').innerHTML = statsLine();
  showOnly(won ? 'victory' : 'over');
  if (!endSoundPlayed) {
    endSoundPlayed = true;
    if (won) audio.victory();
    else audio.gameOver();
  }
}

function playEvents(events) {
  const now = performance.now();
  for (const event of events) {
    if (event === 'shoot') audio.shoot();
    else if (event === 'hit' && now - lastHitSound > 70) {
      lastHitSound = now;
      audio.hit();
    } else if (event === 'explosion') audio.explosion(false);
    else if (event === 'explosion-big') audio.explosion(true);
    else if (event === 'pickup' && now - lastPickupSound > 60) {
      lastPickupSound = now;
      audio.pickup();
    } else if (event === 'hurt') audio.hurt();
    else if (event === 'dash') audio.dash();
    else if (event === 'waveclear') audio.waveClear();
  }
}

function stepLive(dt) {
  const controls = input.controls(world.state.player);
  const events = world.step(dt, controls);
  playEvents(events);
  if (events.includes(EVENT_VICTORY)) {
    finishRun(true);
    return;
  }
  if (events.includes(EVENT_GAMEOVER)) {
    finishRun(false);
    return;
  }
  if (events.includes(EVENT_LEVELUP) && world.state.pendingLevels > 0 && mode === 'playing') {
    openDraft();
  }
}

document.getElementById('btn-start').addEventListener('click', startRun);
document.getElementById('btn-retry').addEventListener('click', startRun);
document.getElementById('btn-again').addEventListener('click', startRun);
window.addEventListener('pointerdown', () => audio.unlock(), { once: false });
window.addEventListener('keydown', (event) => {
  audio.unlock();
  if (event.key === 'Enter' && mode === 'title') startRun();
  if ((event.key === 'r' || event.key === 'R') && (mode === 'over' || mode === 'victory')) startRun();
  if ((event.key === 'p' || event.key === 'P') && mode === 'playing') {
    paused = !paused;
    pauseBadge.classList.toggle('hidden', !paused);
  }
  if (event.key === 'm' || event.key === 'M') audio.toggleMute();
  if (mode === 'upgrade' && ['1', '2', '3'].includes(event.key)) chooseUpgrade(Number(event.key) - 1);
});

if (shotName !== null) {
  const staged = stageShot(shotName, shotSeed, STEP);
  world = staged.world;
  mode = 'shot';
  if (staged.screen === 'title') {
    showOnly('title');
  } else if (staged.screen === 'upgrade') {
    currentDraft = draftUpgrades(world.random, 3);
    cardsBox.innerHTML = '';
    currentDraft.forEach((upgrade, index) => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'card';
      card.innerHTML = `<span class="key">${index + 1}</span><h3></h3><p></p>`;
      card.querySelector('h3').textContent = upgrade.name;
      card.querySelector('p').textContent = upgrade.blurb;
      cardsBox.appendChild(card);
    });
    showOnly('upgrade');
  } else {
    showOnly(null);
  }
  renderer.draw(world.state);
  window.__shotReady = staged.screen;
} else {
  showOnly('title');
  let last = performance.now();
  let accumulator = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    let elapsed = (now - last) / 1000;
    last = now;
    if (elapsed > 0.1) elapsed = 0.1;
    accumulator += elapsed;
    while (accumulator >= STEP) {
      accumulator -= STEP;
      if (mode === 'title') {
        world.step(STEP, autopilotControls(world.state));
        if (world.state.over || world.state.won) world = createWorld(20261115);
      } else if (mode === 'playing' && !paused) {
        stepLive(STEP);
      }
    }
    renderer.draw(world.state);
  }
  requestAnimationFrame(frame);
}
