/**
 * router.js
 * Router sederhana berbasis hash (#/tasks). Dipilih karena:
 *   - tidak butuh konfigurasi server (cocok untuk file statis / GitHub Pages)
 *   - tombol Back/Forward peramban dan bookmark langsung bekerja
 *
 * Link navigasi di sidebar adalah <a href="#/halaman">; router hanya mendengarkan `hashchange`
 * lalu memberi tahu app-state halaman mana yang aktif.
 */
import { PAGE_IDS } from '../../data/constants.js';
import { getState, setPage } from '../../state/app-state.js';

/** '#/tasks' -> 'tasks'; hash kosong atau tidak dikenal -> null */
export function parsePageFromHash(hash) {
  const match = /^#\/([a-z]+)/.exec(hash ?? '');
  return match && PAGE_IDS.includes(match[1]) ? match[1] : null;
}

export function initRouter() {
  const sync = () => {
    const page = parsePageFromHash(window.location.hash);
    // Tanpa hash -> halaman awal pilihan pengguna (Settings -> Default page).
    setPage(page ?? getState().settings.defaultPage);
  };
  window.addEventListener('hashchange', sync);
  sync();
}
