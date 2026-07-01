import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, 'state.json');

const initialState = {
  users: [],
  events: [],
};

async function ensureStoreFile() {
  try {
    await fs.access(DB_PATH);
  } catch {
    await fs.mkdir(__dirname, { recursive: true });
    await fs.writeFile(DB_PATH, JSON.stringify(initialState, null, 2), 'utf8');
  }
}

export async function readState() {
  await ensureStoreFile();
  const raw = await fs.readFile(DB_PATH, 'utf8');
  const parsed = JSON.parse(raw);
  return {
    ...initialState,
    ...parsed,
  };
}

export async function writeState(state) {
  await ensureStoreFile();
  await fs.writeFile(DB_PATH, JSON.stringify(state, null, 2), 'utf8');
  return state;
}

export async function updateState(mutator) {
  const state = await readState();
  const result = await mutator(state);
  await writeState(state);
  return result;
}