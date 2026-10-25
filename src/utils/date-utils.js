/**
 * date-utils.js
 *
 * ATURAN PENTING: semua tanggal "tanpa jam" (deadline, tanggal event) disimpan sebagai
 * string lokal 'YYYY-MM-DD' (disebut "date key"). Kita TIDAK pernah memakai
 * `new Date('2026-10-22')` karena string itu diparse sebagai UTC dan bisa bergeser
 * sehari di zona waktu tertentu. Sebaliknya kita membangun Date lewat `new Date(y, m, d)`
 * (waktu lokal) di `parseDateKey`.
 */

const pad2 = (number) => String(number).padStart(2, '0');

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
export const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Date -> 'YYYY-MM-DD' (zona waktu lokal). */
export function toDateKey(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

/** Cek apakah string adalah tanggal kalender yang nyata (menolak 2026-02-31). */
export function isValidDateKey(key) {
  if (typeof key !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(key)) return false;
  const [year, month, day] = key.split('-').map(Number);
  if (year < 1900 || year > 2200) return false;
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

/** 'YYYY-MM-DD' -> Date pada tengah malam waktu LOKAL. */
export function parseDateKey(key) {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/** Timestamp ISO (UTC) -> date key tanggal LOKAL. Dipakai untuk "selesai hari ini". */
export function isoToDateKey(iso) {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '' : toDateKey(date);
}

export function getTodayKey(now = new Date()) {
  return toDateKey(now);
}

/**
 * Konteks waktu yang dibawa ke service supaya fungsi service tetap "murni"
 * (hasilnya hanya bergantung pada input, mudah diuji).
 */
export function createTimeContext(now = new Date()) {
  return {
    nowIso: now.toISOString(),
    todayKey: toDateKey(now),
    timeKey: `${pad2(now.getHours())}:${pad2(now.getMinutes())}`,
  };
}

export function addDays(key, amount) {
  const date = parseDateKey(key);
  date.setDate(date.getDate() + amount);
  return toDateKey(date);
}

export function daysInMonth(year, monthIndex) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

/** Tambah bulan; hari dipotong ke akhir bulan jika perlu (31 Jan + 1 bln = 28/29 Feb). */
export function addMonths(key, amount) {
  const date = parseDateKey(key);
  const day = date.getDate();
  date.setDate(1);
  date.setMonth(date.getMonth() + amount);
  date.setDate(Math.min(day, daysInMonth(date.getFullYear(), date.getMonth())));
  return toDateKey(date);
}

/** Minggu dimulai hari Minggu (sesuai desain referensi). */
export function startOfWeek(key) {
  const date = parseDateKey(key);
  date.setDate(date.getDate() - date.getDay());
  return toDateKey(date);
}

export function getWeekDays(key) {
  const start = startOfWeek(key);
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

/**
 * Grid bulan 6 baris x 7 kolom (42 sel) termasuk hari dari bulan sebelum/sesudahnya.
 * @returns {{dateKey: string, inMonth: boolean}[]}
 */
export function getMonthGrid(key) {
  const first = parseDateKey(key);
  first.setDate(1);
  const monthPrefix = toDateKey(first).slice(0, 7);
  const gridStart = addDays(toDateKey(first), -first.getDay());
  return Array.from({ length: 42 }, (_, index) => {
    const dateKey = addDays(gridStart, index);
    return { dateKey, inMonth: dateKey.startsWith(monthPrefix) };
  });
}

/** Format 'YYYY-MM-DD' aman dibandingkan secara leksikografis. */
export function compareDateKeys(a, b) {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

/** Selisih hari (b - a) tanpa terpengaruh DST. */
export function diffInDays(a, b) {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86400000);
}

// ---- Format tampilan (manual, supaya tidak tergantung locale peramban) -----

/** 'Wed, Oct 22, 2026' */
export function formatLongDate(key) {
  const date = parseDateKey(key);
  return `${WEEKDAY_SHORT[date.getDay()]}, ${MONTH_NAMES[date.getMonth()].slice(0, 3)} ${date.getDate()}, ${date.getFullYear()}`;
}

/** 'Oct 22' */
export function formatShortDate(key) {
  const date = parseDateKey(key);
  return `${MONTH_NAMES[date.getMonth()].slice(0, 3)} ${date.getDate()}`;
}

/** 'October 2026' */
export function formatMonthYear(key) {
  const date = parseDateKey(key);
  return `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
}

export function getDayNumber(key) {
  return Number(key.slice(8, 10));
}

export function getWeekdayShort(key) {
  return WEEKDAY_SHORT[parseDateKey(key).getDay()];
}

// ---- Waktu 'HH:MM' ---------------------------------------------------------

export function isValidTime(value) {
  return typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function timeToMinutes(value) {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

export function formatTimeRange(start, end) {
  return `${start} - ${end}`;
}
