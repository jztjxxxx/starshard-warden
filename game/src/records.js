// Local best-score records, kept per difficulty in the browser's own
// localStorage. Nothing leaves the machine, and nothing depends on them:
// if storage is missing, blocked, or corrupt, the game simply plays with
// no memory, exactly as it did before records existed. A run itself is
// never stored — only the marks it left behind.

const STORAGE_KEY = 'starshard-warden.records.v1';

function emptyRecord() {
  return { bestScore: 0, bestWave: 0, wins: 0, runs: 0 };
}

function storage() {
  try {
    const store = globalThis.localStorage;
    if (!store) return null;
    // Some contexts expose localStorage but throw when it is touched.
    const probe = `${STORAGE_KEY}.probe`;
    store.setItem(probe, '1');
    store.removeItem(probe);
    return store;
  } catch {
    return null;
  }
}

function cleanRecord(value) {
  const record = emptyRecord();
  if (!value || typeof value !== 'object') return record;
  for (const key of Object.keys(record)) {
    const n = Number(value[key]);
    record[key] = Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  }
  return record;
}

export function loadRecords() {
  const store = storage();
  if (!store) return {};
  try {
    const parsed = JSON.parse(store.getItem(STORAGE_KEY) || '{}');
    if (!parsed || typeof parsed !== 'object') return {};
    const records = {};
    for (const [difficultyId, value] of Object.entries(parsed)) {
      records[difficultyId] = cleanRecord(value);
    }
    return records;
  } catch {
    return {};
  }
}

export function recordFor(records, difficultyId) {
  return records[difficultyId] || emptyRecord();
}

// Fold one finished run into the records and persist them. Returns the
// updated record for the difficulty and whether the score set a new best.
export function recordRun(difficultyId, run) {
  const records = loadRecords();
  const record = recordFor(records, difficultyId);
  const isBestScore = run.score > record.bestScore;
  record.runs += 1;
  if (run.won) record.wins += 1;
  if (isBestScore) record.bestScore = run.score;
  if (run.wave > record.bestWave) record.bestWave = run.wave;
  records[difficultyId] = record;
  const store = storage();
  if (store) {
    try {
      store.setItem(STORAGE_KEY, JSON.stringify(records));
    } catch {
      // A full or blocked store costs the record, never the game.
    }
  }
  return { record, isBestScore };
}
