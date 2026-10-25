/** Helper pengujian: Storage tiruan di memori + konteks waktu tetap. */
export class MemoryStorage {
  constructor(initial = {}) {
    this.map = new Map(Object.entries(initial));
  }
  getItem(key) {
    return this.map.has(key) ? this.map.get(key) : null;
  }
  setItem(key, value) {
    this.map.set(key, String(value));
  }
  removeItem(key) {
    this.map.delete(key);
  }
}

/** Storage yang selalu gagal menulis (simulasi kuota penuh). */
export class FullStorage extends MemoryStorage {
  setItem() {
    throw new DOMException('quota', 'QuotaExceededError');
  }
}

/** Konteks waktu deterministik: 2026-10-22 10:30 waktu lokal. */
export function makeCtx(todayKey = '2026-10-22', time = '10:30') {
  const nowIso = new Date(`${todayKey}T${time}:00`).toISOString();
  return { nowIso, todayKey, timeKey: time };
}

export const validTaskInput = (overrides = {}) => ({
  title: 'Write tests',
  description: '',
  status: 'todo',
  priority: 'medium',
  category: 'Code',
  dueDate: '2026-10-25',
  subtasks: [],
  ...overrides,
});
