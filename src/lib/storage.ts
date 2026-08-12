/**
 * Persistence: named profiles in localStorage, plus JSON export and import.
 *
 * No server and no account. The data never leaves the machine, so there is
 * nothing to authenticate against — a password here would protect a list of
 * owned spices from someone who already has your laptop. Export/import is the
 * real answer to "I want this on my phone too", and it doubles as the backup.
 *
 * Every read is defensive: a corrupt or hand-edited file must not brick the
 * app, so anything unparseable is reported and ignored rather than thrown.
 */

import type { UserState } from '../state/userState';
import { createUserState, migrateState, STATE_VERSION } from '../state/userState';

const PREFIX = 'ck';
const PROFILES_KEY = `${PREFIX}:profiles`;
const CURRENT_KEY = `${PREFIX}:current`;
const profileKey = (name: string) => `${PREFIX}:profile:${name}`;

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    // Private browsing, disabled storage, or a full quota.
    return null;
  }
}

function safeSet(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function listProfiles(): string[] {
  const raw = safeGet(PROFILES_KEY);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((p): p is string => typeof p === 'string') : [];
  } catch {
    return [];
  }
}

function writeProfiles(names: string[]): void {
  safeSet(PROFILES_KEY, JSON.stringify([...new Set(names)]));
}

export function currentProfile(): string | null {
  return safeGet(CURRENT_KEY);
}

export function setCurrentProfile(name: string): void {
  safeSet(CURRENT_KEY, name);
}

export function loadProfile(name: string): UserState | null {
  const raw = safeGet(profileKey(name));
  if (!raw) return null;
  try {
    return migrateState(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function saveProfile(state: UserState): boolean {
  const ok = safeSet(profileKey(state.profileName), JSON.stringify(state));
  if (ok) writeProfiles([...listProfiles(), state.profileName]);
  return ok;
}

export function createProfile(name: string): UserState {
  const state = createUserState(name);
  saveProfile(state);
  setCurrentProfile(name);
  return state;
}

export function deleteProfile(name: string): void {
  try {
    localStorage.removeItem(profileKey(name));
  } catch {
    /* nothing useful to do */
  }
  writeProfiles(listProfiles().filter((p) => p !== name));
  if (currentProfile() === name) {
    const next = listProfiles()[0];
    if (next) setCurrentProfile(next);
  }
}

// ── One-time onboarding ─────────────────────────────────────────────────────

const ONBOARDING_KEY = `${PREFIX}:onboarding-seen`;

/**
 * Device-level, not profile-level: switching profiles or importing a JSON
 * file should never bring the explainer back, and a second profile on the
 * same laptop doesn't need to see it again either.
 */
export function hasSeenOnboarding(): boolean {
  return safeGet(ONBOARDING_KEY) === '1';
}

export function markOnboardingSeen(): void {
  safeSet(ONBOARDING_KEY, '1');
}

/** True when the browser will actually keep anything we write. */
export function storageAvailable(): boolean {
  const probe = `${PREFIX}:probe`;
  if (!safeSet(probe, '1')) return false;
  try {
    localStorage.removeItem(probe);
  } catch {
    /* ignore */
  }
  return true;
}

// ── Export / import ────────────────────────────────────────────────────────

export interface ExportFile {
  app: 'component-kitchen';
  version: number;
  exportedAt: string;
  state: UserState;
}

export function exportToJSON(state: UserState): string {
  const file: ExportFile = {
    app: 'component-kitchen',
    version: STATE_VERSION,
    exportedAt: new Date().toISOString(),
    state,
  };
  return JSON.stringify(file, null, 2);
}

export function downloadExport(state: UserState): void {
  const blob = new Blob([exportToJSON(state)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `component-kitchen-${state.profileName}-${new Date()
    .toISOString()
    .slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export type ImportResult =
  | { ok: true; state: UserState }
  | { ok: false; error: string };

export function importFromJSON(text: string): ImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: 'That file is not valid JSON.' };
  }

  if (typeof parsed !== 'object' || parsed === null) {
    return { ok: false, error: 'That file does not contain a saved profile.' };
  }

  const file = parsed as Partial<ExportFile>;
  // Accept both a full export file and a bare state object, since people do
  // hand-edit these and it costs nothing to be forgiving.
  const candidate = file.app === 'component-kitchen' ? file.state : parsed;

  const state = migrateState(candidate);
  if (!state) {
    return { ok: false, error: 'That file is not a Component Kitchen profile.' };
  }
  if (typeof file.version === 'number' && file.version > STATE_VERSION) {
    return {
      ok: false,
      error: `That file was saved by a newer version (v${file.version}); this app reads v${STATE_VERSION}.`,
    };
  }

  return { ok: true, state };
}

/** Merge an imported profile into the current one, keeping the newer facts. */
export function mergeStates(current: UserState, incoming: UserState): UserState {
  const components = { ...current.components };
  for (const [id, incomingState] of Object.entries(incoming.components)) {
    const mine = components[id];
    // Whichever batch was made more recently is the one that is really there.
    if (!mine || (incomingState.madeOn ?? '') > (mine.madeOn ?? '')) {
      components[id] = incomingState;
    }
  }

  const cookedKey = (c: { dishId: string; date: string }) => `${c.dishId}@${c.date}`;
  const cooked = [...current.cooked];
  const seen = new Set(cooked.map(cookedKey));
  for (const entry of incoming.cooked) {
    if (!seen.has(cookedKey(entry))) cooked.push(entry);
  }

  const freezer = { ...current.freezer };
  for (const [id, count] of Object.entries(incoming.freezer)) {
    freezer[id] = Math.max(freezer[id] ?? 0, count);
  }

  return {
    ...current,
    pantry: { ...current.pantry, ...incoming.pantry },
    components,
    freezer,
    cooked,
    plan: incoming.plan ?? current.plan,
    settings: { ...current.settings, ...incoming.settings },
  };
}
