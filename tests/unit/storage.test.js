import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { STORAGE_KEY, BACKUP_KEY } from '../../src/data/constants.js';
import { createDemoState } from '../../src/data/demo-data.js';
import {
  loadState, saveState, exportStateText, importStateText, getBackupText,
} from '../../src/services/storage-service.js';
import * as app from '../../src/state/app-state.js';
import { MemoryStorage, FullStorage, validTaskInput } from './helpers.js';

beforeEach(() => app.__resetForTests());

test('loadState: tidak ada data -> status empty', () => {
  assert.equal(loadState(new MemoryStorage()).status, 'empty');
});

test('saveState lalu loadState mengembalikan data yang sama', () => {
  const storage = new MemoryStorage();
  const demo = createDemoState('2026-10-22');
  assert.equal(saveState(demo, storage), true);
  const loaded = loadState(storage);
  assert.equal(loaded.status, 'ok');
  assert.deepEqual(loaded.state, demo);
});

test('JSON rusak -> dicadangkan ke BACKUP_KEY, status recovered', () => {
  const storage = new MemoryStorage({ [STORAGE_KEY]: '{rusak' });
  const loaded = loadState(storage);
  assert.equal(loaded.status, 'recovered');
  assert.equal(storage.getItem(BACKUP_KEY), '{rusak');
  assert.equal(getBackupText(storage), '{rusak');
});

test('schema asing -> dicadangkan, bukan ditimpa diam-diam', () => {
  const text = JSON.stringify({ schemaVersion: 42, tasks: [], events: [] });
  const storage = new MemoryStorage({ [STORAGE_KEY]: text });
  assert.equal(loadState(storage).status, 'recovered');
  assert.equal(storage.getItem(BACKUP_KEY), text);
});

test('storage penuh: saveState mengembalikan false tanpa melempar error', () => {
  assert.equal(saveState(createDemoState('2026-10-22'), new FullStorage()), false);
});

test('storage tidak tersedia: loadState status unavailable', () => {
  const broken = { getItem() { throw new Error('blocked'); } };
  assert.equal(loadState(broken).status, 'unavailable');
});

test('export/import round-trip dan penolakan file tidak valid', () => {
  const demo = createDemoState('2026-10-22');
  const imported = importStateText(exportStateText(demo));
  assert.equal(imported.ok, true);
  assert.equal(imported.state.tasks.length, demo.tasks.length);
  assert.equal(importStateText('bukan json').ok, false);
  assert.equal(importStateText('{"schemaVersion":7}').ok, false);
});

// ---- Integrasi state + storage (WBS 7.4 - 7.6) -------------------------------

test('initApp pertama kali memuat data demo dan menyimpannya', () => {
  const storage = new MemoryStorage();
  assert.equal(app.initApp(storage), 'empty');
  assert.ok(app.getState().tasks.length > 0);
  assert.ok(storage.getItem(STORAGE_KEY));
});

test('data demo TIDAK menimpa data pengguna yang sudah ada', () => {
  const storage = new MemoryStorage();
  app.initApp(storage);
  app.addTask(validTaskInput({ title: 'Tugas saya sendiri' }));
  const countBefore = app.getState().tasks.length;

  app.__resetForTests();
  assert.equal(app.initApp(storage), 'ok');
  assert.equal(app.getState().tasks.length, countBefore);
  assert.ok(app.getState().tasks.some((t) => t.title === 'Tugas saya sendiri'));
});

test('perubahan tersimpan dan bertahan setelah "reload" (init ulang)', () => {
  const storage = new MemoryStorage();
  app.initApp(storage);
  const added = app.addTask(validTaskInput({ title: 'Persist me', priority: 'high' }));
  app.moveTaskToStatus(added.task.id, 'done');
  const xpBefore = JSON.parse(storage.getItem(STORAGE_KEY)).gamification.awardedTasks[added.task.id].xp;
  assert.equal(xpBefore, 30);

  app.__resetForTests();
  app.initApp(storage);
  const task = app.getState().tasks.find((t) => t.id === added.task.id);
  assert.equal(task.status, 'done');
  // XP tidak diberikan lagi setelah reload + buka/tutup ulang
  app.moveTaskToStatus(task.id, 'todo');
  app.moveTaskToStatus(task.id, 'done');
  assert.equal(app.getState().gamification.awardedTasks[task.id].xp, 30);
});

test('data rusak: aplikasi mulai kosong, memberi notice, backup tersimpan', () => {
  const storage = new MemoryStorage({ [STORAGE_KEY]: 'sampah' });
  const notices = [];
  app.onNotice((n) => notices.push(n));
  assert.equal(app.initApp(storage), 'recovered');
  assert.equal(app.getState().tasks.length, 0);
  assert.equal(notices[0].type, 'error');
  assert.equal(storage.getItem(BACKUP_KEY), 'sampah');
});

test('subscriber dipanggil setiap perubahan; unsubscribe berhenti', () => {
  app.initApp(new MemoryStorage());
  let calls = 0;
  const stop = app.subscribe(() => { calls += 1; });
  app.addTask(validTaskInput());
  assert.equal(calls, 1);
  stop();
  app.addTask(validTaskInput());
  assert.equal(calls, 1);
});

test('action gagal (input salah) tidak mengubah state dan tidak memanggil subscriber', () => {
  app.initApp(new MemoryStorage());
  let calls = 0;
  app.subscribe(() => { calls += 1; });
  const before = app.getState();
  const result = app.addTask(validTaskInput({ title: '' }));
  assert.equal(result.ok, false);
  assert.equal(app.getState(), before);
  assert.equal(calls, 0);
});

test('resetToDemoData mempertahankan pengaturan; clearAllData mengosongkan', () => {
  app.initApp(new MemoryStorage());
  app.updateSettings({ confirmDelete: false, defaultPage: 'tasks' });
  app.clearAllData();
  assert.equal(app.getState().tasks.length, 0);
  assert.equal(app.getState().settings.confirmDelete, false);
  app.resetToDemoData();
  assert.ok(app.getState().tasks.length > 0);
  assert.equal(app.getState().settings.defaultPage, 'tasks');
});

test('importData valid mengganti state, tidak valid dibiarkan', () => {
  app.initApp(new MemoryStorage());
  const bad = app.importData('{}');
  assert.equal(bad.ok, false);
  const text = exportStateText(createDemoState('2026-10-22'));
  assert.equal(app.importData(text).ok, true);
});

test('setTaskFilters: ganti sort mengembalikan arah bawaan', () => {
  app.initApp(new MemoryStorage());
  app.setTaskFilters({ sort: 'priority' });
  assert.equal(app.getUi().taskFilters.direction, 'desc');
  app.setTaskFilters({ direction: 'asc' });
  assert.equal(app.getUi().taskFilters.direction, 'asc');
  app.setTaskFilters({ sort: 'due' });
  assert.equal(app.getUi().taskFilters.direction, 'asc');
});

test('storage penuh memicu notice error sekali', () => {
  const storage = new MemoryStorage();
  app.initApp(storage);
  const notices = [];
  app.onNotice((n) => notices.push(n));
  const full = new FullStorage();
  app.__resetForTests();
  app.onNotice((n) => notices.push(n));
  app.initApp(full);
  app.addTask(validTaskInput());
  app.addTask(validTaskInput());
  assert.equal(notices.filter((n) => n.type === 'error').length, 1);
  assert.equal(app.isStorageAvailable(), false);
});
