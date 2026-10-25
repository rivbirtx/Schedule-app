/**
 * drag-and-drop.js
 * Drag-and-drop Kanban memakai HTML5 Drag and Drop API (tanpa library).
 *
 * Cara kerja:
 *   1. dragstart pada kartu (.task-card)   -> catat id tugas yang diseret
 *   2. dragover pada kolom ([data-dropzone]) -> hitung "disisipkan sebelum kartu mana"
 *                                              dan tampilkan garis penunjuk
 *   3. drop                                 -> panggil onMove(taskId, status, beforeId)
 *
 * Modul ini TIDAK mengubah data. Ia hanya memberi tahu pemanggil lewat `onMove`;
 * perubahan state tetap lewat app-state, lalu tampilan dirender ulang dari state.
 * Listener dipasang SEKALI di elemen induk (event delegation), jadi tetap bekerja walau
 * kartu dirender ulang.
 *
 * Catatan: HTML5 DnD tidak andal di layar sentuh. Untuk sentuh & keyboard tersedia menu ⋮
 * pada kartu ("Move to ...") sebagai alternatif (lihat components/task-card.js).
 */

const CARD = '.task-card';
const ZONE = '[data-dropzone]';

/**
 * Cari kartu yang berada TEPAT SETELAH posisi kursor (kartu tempat item akan disisipkan di depannya).
 * @returns {HTMLElement|null} null berarti: taruh di akhir kolom
 */
export function findCardAfterPointer(zone, pointerY, draggingId) {
  const cards = [...zone.querySelectorAll(`${CARD}:not([data-task-id="${CSS.escape(draggingId)}"])`)];
  return cards.find((card) => {
    const box = card.getBoundingClientRect();
    return pointerY < box.top + box.height / 2;
  }) ?? null;
}

function clearIndicators(root) {
  root.querySelectorAll('.is-over, .drop-before, .drop-end').forEach((element) => {
    element.classList.remove('is-over', 'drop-before', 'drop-end');
  });
}

/**
 * @param {HTMLElement} root elemen induk (mis. document.body)
 * @param {{onMove: (taskId: string, status: string, beforeId: string|null) => void}} handlers
 */
export function bindDragAndDrop(root, { onMove }) {
  let draggingId = null;

  const zoneOf = (event) => (event.target instanceof Element ? event.target.closest(ZONE) : null);

  root.addEventListener('dragstart', (event) => {
    const card = event.target instanceof Element ? event.target.closest(CARD) : null;
    if (!card) return;
    draggingId = card.dataset.taskId;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', draggingId); // Firefox mewajibkan setData
    // tunda satu frame supaya "bayangan" drag diambil sebelum kartu dipudarkan
    requestAnimationFrame(() => card.classList.add('is-dragging'));
  });

  root.addEventListener('dragend', () => {
    draggingId = null;
    root.querySelectorAll('.is-dragging').forEach((element) => element.classList.remove('is-dragging'));
    clearIndicators(root);
  });

  root.addEventListener('dragover', (event) => {
    const zone = zoneOf(event);
    if (!zone || !draggingId) return;
    event.preventDefault(); // tanda "boleh di-drop di sini"
    event.dataTransfer.dropEffect = 'move';
    clearIndicators(root);
    zone.classList.add('is-over');
    const before = findCardAfterPointer(zone, event.clientY, draggingId);
    (before ?? zone).classList.add(before ? 'drop-before' : 'drop-end');
  });

  root.addEventListener('dragleave', (event) => {
    const zone = zoneOf(event);
    if (zone && !zone.contains(event.relatedTarget)) clearIndicators(root);
  });

  root.addEventListener('drop', (event) => {
    const zone = zoneOf(event);
    if (!zone || !draggingId) return;
    event.preventDefault();
    const taskId = draggingId;
    const before = findCardAfterPointer(zone, event.clientY, taskId);
    draggingId = null;
    clearIndicators(root);
    onMove(taskId, zone.dataset.status, before ? before.dataset.taskId : null);
  });
}
