/**
 * validation.js
 * Dua tugas:
 *  1. Memvalidasi input formulir (task / event) -> { ok, errors, value }
 *  2. Membersihkan (sanitize) data dari LocalStorage agar data rusak tidak merusak aplikasi.
 *
 * @typedef {Object} Subtask   { id: string, title: string, done: boolean }
 * @typedef {Object} Task
 * @property {string} id
 * @property {string} title
 * @property {string} description
 * @property {'todo'|'in_progress'|'review'|'done'} status
 * @property {'low'|'medium'|'high'} priority
 * @property {string} category
 * @property {string} dueDate        'YYYY-MM-DD' atau '' bila tanpa deadline
 * @property {Subtask[]} subtasks
 * @property {string} createdAt      ISO timestamp
 * @property {string|null} completedAt ISO timestamp terakhir kali selesai
 * @typedef {Object} CalendarEvent
 * @property {string} id
 * @property {string} title
 * @property {string} date           'YYYY-MM-DD'
 * @property {string} startTime      'HH:MM'
 * @property {string} endTime        'HH:MM'
 * @property {string} color
 * @property {string} notes
 * @typedef {Object} AppState
 */

import {
  STATUS_IDS, PRIORITY_IDS, CATEGORY_IDS, EVENT_COLORS, DEFAULT_CATEGORY,
  DEFAULT_SETTINGS, PAGE_IDS, LIMITS, SCHEMA_VERSION,
} from '../data/constants.js';
import { isValidDateKey, isValidTime, timeToMinutes } from './date-utils.js';
import { generateId } from './id-generator.js';

const isPlainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const cleanText = (value, max) => String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

// ---------------------------------------------------------------------------
// Validasi formulir
// ---------------------------------------------------------------------------

/**
 * @param {Object} input data mentah dari formulir
 * @returns {{ok: boolean, errors: Object<string,string>, value: Object}}
 */
export function validateTaskInput(input) {
  const errors = {};
  const title = cleanText(input.title, LIMITS.TITLE_MAX);
  if (!title) errors.title = 'Title is required.';
  if (String(input.title ?? '').trim().length > LIMITS.TITLE_MAX) {
    errors.title = `Title must be at most ${LIMITS.TITLE_MAX} characters.`;
  }

  const status = STATUS_IDS.includes(input.status) ? input.status : null;
  if (!status) errors.status = 'Choose a valid status.';
  const priority = PRIORITY_IDS.includes(input.priority) ? input.priority : null;
  if (!priority) errors.priority = 'Choose a valid priority.';

  const dueDate = String(input.dueDate ?? '').trim();
  if (dueDate && !isValidDateKey(dueDate)) errors.dueDate = 'Date is not valid.';

  const subtasks = (Array.isArray(input.subtasks) ? input.subtasks : [])
    .map((sub) => ({
      id: typeof sub.id === 'string' && sub.id ? sub.id : generateId('sub'),
      title: cleanText(sub.title, LIMITS.SUBTASK_MAX),
      done: Boolean(sub.done),
    }))
    .filter((sub) => sub.title)
    .slice(0, LIMITS.SUBTASKS_PER_TASK);

  return {
    ok: Object.keys(errors).length === 0,
    errors,
    value: {
      title,
      description: String(input.description ?? '').trim().slice(0, LIMITS.DESCRIPTION_MAX),
      status,
      priority,
      category: CATEGORY_IDS.includes(input.category) ? input.category : DEFAULT_CATEGORY,
      dueDate,
      subtasks,
    },
  };
}

export function validateEventInput(input) {
  const errors = {};
  const title = cleanText(input.title, LIMITS.TITLE_MAX);
  if (!title) errors.title = 'Title is required.';

  const date = String(input.date ?? '').trim();
  if (!isValidDateKey(date)) errors.date = 'Choose a valid date.';

  const startTime = String(input.startTime ?? '');
  const endTime = String(input.endTime ?? '');
  if (!isValidTime(startTime)) errors.startTime = 'Start time is not valid.';
  if (!isValidTime(endTime)) errors.endTime = 'End time is not valid.';
  if (!errors.startTime && !errors.endTime && timeToMinutes(endTime) <= timeToMinutes(startTime)) {
    errors.endTime = 'End time must be after start time.';
  }

  return {
    ok: Object.keys(errors).length === 0,
    errors,
    value: {
      title,
      date,
      startTime,
      endTime,
      color: EVENT_COLORS.includes(input.color) ? input.color : EVENT_COLORS[0],
      notes: String(input.notes ?? '').trim().slice(0, LIMITS.DESCRIPTION_MAX),
    },
  };
}

// ---------------------------------------------------------------------------
// Sanitasi data dari LocalStorage
// ---------------------------------------------------------------------------

function sanitizeTask(raw) {
  if (!isPlainObject(raw) || typeof raw.id !== 'string' || !raw.id) return null;
  const title = cleanText(raw.title, LIMITS.TITLE_MAX);
  if (!title) return null;
  const subtasks = Array.isArray(raw.subtasks)
    ? raw.subtasks
        .filter((sub) => isPlainObject(sub) && cleanText(sub.title, LIMITS.SUBTASK_MAX))
        .map((sub) => ({
          id: typeof sub.id === 'string' && sub.id ? sub.id : generateId('sub'),
          title: cleanText(sub.title, LIMITS.SUBTASK_MAX),
          done: Boolean(sub.done),
        }))
    : [];
  return {
    id: raw.id,
    title,
    description: String(raw.description ?? '').slice(0, LIMITS.DESCRIPTION_MAX),
    status: STATUS_IDS.includes(raw.status) ? raw.status : 'todo',
    priority: PRIORITY_IDS.includes(raw.priority) ? raw.priority : 'medium',
    category: CATEGORY_IDS.includes(raw.category) ? raw.category : DEFAULT_CATEGORY,
    dueDate: isValidDateKey(raw.dueDate) ? raw.dueDate : '',
    subtasks,
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : new Date(0).toISOString(),
    completedAt: typeof raw.completedAt === 'string' ? raw.completedAt : null,
  };
}

function sanitizeEvent(raw) {
  if (!isPlainObject(raw) || typeof raw.id !== 'string' || !raw.id) return null;
  const check = validateEventInput(raw);
  if (!check.ok) return null;
  return { id: raw.id, ...check.value };
}

function uniqueById(list) {
  const seen = new Set();
  return list.filter((item) => (seen.has(item.id) ? false : (seen.add(item.id), true)));
}

/**
 * Ubah objek JSON apa pun menjadi AppState yang valid.
 * @returns {{state: AppState|null, problems: string[]}} state null jika bentuk dasarnya tidak dikenali
 */
export function sanitizeState(raw) {
  const problems = [];
  if (!isPlainObject(raw)) return { state: null, problems: ['Root is not an object'] };
  if (raw.schemaVersion !== SCHEMA_VERSION) {
    return { state: null, problems: [`Unsupported schemaVersion: ${raw.schemaVersion}`] };
  }
  if (!Array.isArray(raw.tasks) || !Array.isArray(raw.events)) {
    return { state: null, problems: ['tasks/events must be arrays'] };
  }

  const tasks = uniqueById(raw.tasks.map(sanitizeTask).filter(Boolean));
  const events = uniqueById(raw.events.map(sanitizeEvent).filter(Boolean));
  if (tasks.length !== raw.tasks.length) problems.push(`${raw.tasks.length - tasks.length} invalid task(s) dropped`);
  if (events.length !== raw.events.length) problems.push(`${raw.events.length - events.length} invalid event(s) dropped`);

  const gamification = { awardedTasks: {}, achievements: {} };
  const rawAwards = isPlainObject(raw.gamification?.awardedTasks) ? raw.gamification.awardedTasks : {};
  for (const [taskId, award] of Object.entries(rawAwards)) {
    if (!isPlainObject(award)) continue;
    const xp = Number(award.xp);
    if (!Number.isFinite(xp) || xp < 0 || xp > 1000 || !isValidDateKey(award.awardedDate)) continue;
    gamification.awardedTasks[taskId] = {
      xp: Math.round(xp),
      priority: PRIORITY_IDS.includes(award.priority) ? award.priority : 'medium',
      awardedDate: award.awardedDate,
    };
  }
  const rawAchievements = isPlainObject(raw.gamification?.achievements) ? raw.gamification.achievements : {};
  for (const [id, unlockedAt] of Object.entries(rawAchievements)) {
    if (typeof unlockedAt === 'string') gamification.achievements[id] = unlockedAt;
  }

  const rawSettings = isPlainObject(raw.settings) ? raw.settings : {};
  const settings = {
    defaultPage: PAGE_IDS.includes(rawSettings.defaultPage) ? rawSettings.defaultPage : DEFAULT_SETTINGS.defaultPage,
    confirmDelete:
      typeof rawSettings.confirmDelete === 'boolean' ? rawSettings.confirmDelete : DEFAULT_SETTINGS.confirmDelete,
  };

  return { state: { schemaVersion: SCHEMA_VERSION, tasks, events, gamification, settings }, problems };
}
