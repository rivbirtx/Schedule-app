/**
 * calendar-navigation.js
 * Logika murni navigasi kalender (tanpa DOM): maju/mundur, label rentang, dan pergerakan
 * dengan tombol panah. Dipisah supaya mudah diuji dan dipakai ulang oleh tampilan Month/Week/Day.
 */
import {
  addDays, addMonths, getWeekDays, formatMonthYear, formatLongDate, formatShortDate, parseDateKey,
} from '../../utils/date-utils.js';

/** Geser tanggal acuan satu "langkah" sesuai view. direction: -1 (mundur) atau 1 (maju). */
export function shiftDate(view, dateKey, direction) {
  if (view === 'month') return addMonths(dateKey, direction);
  if (view === 'week') return addDays(dateKey, 7 * direction);
  return addDays(dateKey, direction);
}

/** Teks judul di toolbar kalender. */
export function getRangeLabel(view, dateKey) {
  if (view === 'month') return formatMonthYear(dateKey);
  if (view === 'week') {
    const days = getWeekDays(dateKey);
    const year = parseDateKey(days[6]).getFullYear();
    return `${formatShortDate(days[0])} - ${formatShortDate(days[6])}, ${year}`;
  }
  return formatLongDate(dateKey);
}

/**
 * Tombol panah di grid hari -> tanggal baru yang dipilih (atau null bila tombol bukan panah).
 * Kiri/kanan = +-1 hari, atas/bawah = +-7 hari, Home/End = awal/akhir minggu.
 */
export function moveSelection(dateKey, key) {
  switch (key) {
    case 'ArrowLeft': return addDays(dateKey, -1);
    case 'ArrowRight': return addDays(dateKey, 1);
    case 'ArrowUp': return addDays(dateKey, -7);
    case 'ArrowDown': return addDays(dateKey, 7);
    case 'Home': return getWeekDays(dateKey)[0];
    case 'End': return getWeekDays(dateKey)[6];
    default: return null;
  }
}

/** Apakah tanggal berada di bulan yang sama dengan tanggal acuan? (YYYY-MM) */
export function isSameMonth(a, b) {
  return a.slice(0, 7) === b.slice(0, 7);
}
