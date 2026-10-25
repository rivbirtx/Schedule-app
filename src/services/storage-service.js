/**
 * storage-service.js
 * Satu-satunya modul yang menyentuh LocalStorage.
 *
 * Alur memuat (loadState):
 *   1. Tidak ada data            -> status 'empty'   (pemanggil memuat data demo)
 *   2. Ada data, JSON valid      -> status 'ok'
 *   3. Ada data, rusak/invalid   -> JSON mentah dicadangkan ke BACKUP_KEY lebih dulu,
 *                                   lalu status 'recovered' dan state kosong dikembalikan.
 *   4. LocalStorage tidak bisa dipakai (mode privat, kuota) -> status 'unavailable'
 *      dan aplikasi tetap jalan di memori saja.
 */

import { STORAGE_KEY, BACKUP_KEY } from '../data/constants.js';
import { sanitizeState } from '../utils/validation.js';

function getStorage(storage) {
  if (storage) return storage;
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null; // akses localStorage bisa melempar error (cookie diblokir)
  }
}

/**
 * @param {Storage} [storage] dapat diganti objek tiruan saat pengujian
 * @returns {{status: 'empty'|'ok'|'recovered'|'unavailable', state: Object|null, problems: string[]}}
 */
export function loadState(storage) {
  const store = getStorage(storage);
  if (!store) return { status: 'unavailable', state: null, problems: [] };

  let rawText;
  try {
    rawText = store.getItem(STORAGE_KEY);
  } catch {
    return { status: 'unavailable', state: null, problems: [] };
  }
  if (rawText === null) return { status: 'empty', state: null, problems: [] };

  let parsed;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    backupRawText(store, rawText);
    return { status: 'recovered', state: null, problems: ['Stored JSON is corrupted'] };
  }

  const { state, problems } = sanitizeState(parsed);
  if (!state) {
    backupRawText(store, rawText);
    return { status: 'recovered', state: null, problems };
  }
  return { status: 'ok', state, problems };
}

function backupRawText(store, rawText) {
  try {
    store.setItem(BACKUP_KEY, rawText); // data rusak tidak dibuang, hanya dipindah
  } catch {
    /* kuota penuh: tidak ada yang bisa dilakukan */
  }
}

/** @returns {boolean} true jika berhasil tersimpan */
export function saveState(state, storage) {
  const store = getStorage(storage);
  if (!store) return false;
  try {
    store.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

/** Teks cadangan data rusak (jika ada), untuk diunduh dari Settings. */
export function getBackupText(storage) {
  const store = getStorage(storage);
  try {
    return store?.getItem(BACKUP_KEY) ?? null;
  } catch {
    return null;
  }
}

export function clearState(storage) {
  const store = getStorage(storage);
  try {
    store?.removeItem(STORAGE_KEY);
  } catch {
    /* diabaikan */
  }
}

/** Ekspor data sebagai teks JSON (untuk tombol Export di Settings). */
export function exportStateText(state) {
  return JSON.stringify(state, null, 2);
}

/**
 * Impor teks JSON dari berkas pengguna. Data divalidasi dulu; jika tidak valid,
 * data yang sedang aktif TIDAK diganti.
 * @returns {{ok: boolean, state?: Object, error?: string, problems?: string[]}}
 */
export function importStateText(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: 'File is not valid JSON.' };
  }
  const { state, problems } = sanitizeState(parsed);
  if (!state) return { ok: false, error: problems[0] ?? 'Unrecognized data format.' };
  return { ok: true, state, problems };
}
