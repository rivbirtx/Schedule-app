/**
 * dom-utils.js
 * Helper DOM yang dipakai ulang. Bagian terpenting adalah tagged template `html`
 * yang MENGESCAPE semua nilai yang disisipkan, sehingga data pengguna
 * (judul tugas, deskripsi, dll.) tidak bisa menyuntikkan HTML/JS (XSS).
 *
 *   html`<h3>${task.title}</h3>`   // task.title otomatis di-escape
 *   html`<ul>${tasks.map(taskCard)}</ul>`   // hasil html`` lain disisipkan apa adanya
 */

const ESCAPE_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ESCAPE_MAP[char]);
}

/** Penanda "string ini sudah aman sebagai HTML". Hanya dibuat oleh `html` dan `raw`. */
export class SafeHtml {
  constructor(value) {
    this.value = value;
  }
  toString() {
    return this.value;
  }
}

/** Tandai string HTML tepercaya (mis. SVG buatan sendiri). JANGAN dipakai untuk input pengguna. */
export function raw(value) {
  return new SafeHtml(String(value));
}

function stringifyValue(value) {
  if (value instanceof SafeHtml) return value.value;
  if (Array.isArray(value)) return value.map(stringifyValue).join('');
  if (value === null || value === undefined || value === false) return '';
  return escapeHtml(value);
}

/** Tagged template: nilai yang disisipkan di-escape kecuali sudah SafeHtml. */
export function html(strings, ...values) {
  let output = '';
  strings.forEach((chunk, index) => {
    output += chunk;
    if (index < values.length) output += stringifyValue(values[index]);
  });
  return new SafeHtml(output);
}

/** Tulis SafeHtml ke elemen. */
export function render(container, safeHtml) {
  container.innerHTML = safeHtml instanceof SafeHtml ? safeHtml.value : escapeHtml(safeHtml);
}

/** URL aset di folder public/, mengikuti `base` Vite (./ saat build). */
export function assetUrl(path) {
  const base = import.meta.env?.BASE_URL ?? './';
  return `${base}${path}`.replace(/\/{2,}/g, (match, offset, whole) =>
    whole.slice(0, offset).endsWith(':') ? match : '/',
  );
}

/**
 * Event delegation: SATU listener di elemen induk untuk semua elemen yang cocok
 * dengan `selector`, termasuk elemen yang dibuat setelah render ulang.
 * Karena dipasang sekali saat startup, tidak ada listener yang menumpuk.
 */
export function delegate(root, eventType, selector, handler) {
  root.addEventListener(eventType, (event) => {
    const target = event.target instanceof Element ? event.target.closest(selector) : null;
    if (target && root.contains(target)) handler(event, target);
  });
}

// ---- Menjaga fokus & posisi scroll saat render ulang -------------------------

/**
 * Render ulang mengganti elemen DOM. Agar pengguna keyboard tidak kehilangan fokus
 * (dan kotak pencarian tidak "melompat"), kita catat elemen fokus yang punya
 * atribut data-focus-id, lalu fokuskan lagi elemen dengan id yang sama setelah render.
 */
export function captureViewState(root) {
  const active = document.activeElement;
  const focusId = active && root.contains(active) ? active.getAttribute('data-focus-id') : null;
  const snapshot = {
    focusId,
    selectionStart: null,
    selectionEnd: null,
    scrolls: [],
  };
  if (focusId && 'selectionStart' in active) {
    try {
      snapshot.selectionStart = active.selectionStart;
      snapshot.selectionEnd = active.selectionEnd;
    } catch {
      /* tipe input tertentu (date, number) tidak mendukung selection */
    }
  }
  root.querySelectorAll('[data-scroll-key]').forEach((element) => {
    snapshot.scrolls.push({ key: element.dataset.scrollKey, left: element.scrollLeft, top: element.scrollTop });
  });
  return snapshot;
}

export function restoreViewState(root, snapshot) {
  snapshot.scrolls.forEach(({ key, left, top }) => {
    const element = root.querySelector(`[data-scroll-key="${key}"]`);
    if (element) {
      element.scrollLeft = left;
      element.scrollTop = top;
    }
  });
  if (!snapshot.focusId) return;
  const element = root.querySelector(`[data-focus-id="${snapshot.focusId}"]`);
  if (!element) return;
  element.focus({ preventScroll: true });
  if (snapshot.selectionStart !== null && 'setSelectionRange' in element) {
    try {
      element.setSelectionRange(snapshot.selectionStart, snapshot.selectionEnd);
    } catch {
      /* diabaikan */
    }
  }
}

// ---- Fokus pada modal --------------------------------------------------------

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function getFocusableElements(container) {
  return [...container.querySelectorAll(FOCUSABLE_SELECTOR)].filter(
    (element) => element.offsetParent !== null || element === document.activeElement,
  );
}

/** Simpan teks sebagai berkas unduhan di peramban. */
export function downloadTextFile(filename, text, mimeType = 'application/json') {
  const blob = new Blob([text], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
