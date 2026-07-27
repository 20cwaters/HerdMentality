/**
 * A player id that survives refreshes and dropped connections — the server
 * uses it to give you your seat, cows and Pink Cow back when you come home.
 */

const ID_KEY = 'herd.playerId';
const NAME_KEY = 'herd.name';
const ROOM_KEY = 'herd.room';
const TUTORIAL_KEY = 'herd.tutorial';

function makeId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `p-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
}

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null; // private browsing, storage disabled, etc.
  }
}

function write(key: string, value: string | null): void {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* not worth interrupting the game over */
  }
}

export function getPlayerId(): string {
  const existing = read(ID_KEY);
  if (existing) return existing;
  const id = makeId();
  write(ID_KEY, id);
  return id;
}

export const getSavedName = (): string => read(NAME_KEY) ?? '';
export const saveName = (name: string): void => write(NAME_KEY, name);

export const getSavedRoom = (): string | null => read(ROOM_KEY);
export const saveRoom = (code: string | null): void => write(ROOM_KEY, code);

export const getTutorialOptIn = (): boolean => read(TUTORIAL_KEY) === 'on';
export const setTutorialOptIn = (on: boolean): void =>
  write(TUTORIAL_KEY, on ? 'on' : 'off');

/** Room code from ?room=ABCD, so a shared link drops you straight in. */
export function getRoomFromUrl(): string {
  try {
    const params = new URLSearchParams(window.location.search);
    return (params.get('room') ?? '').toUpperCase();
  } catch {
    return '';
  }
}

export function shareLink(roomCode: string): string {
  return `${window.location.origin}/?room=${roomCode}`;
}
