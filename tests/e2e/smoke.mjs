/**
 * tests/e2e/smoke.mjs - uji end-to-end di browser sungguhan (Playwright + Chromium).
 *
 * Cara pakai (aplikasi harus sedang berjalan):
 *   terminal 1:  npm run build && npm run preview       (atau: npm run dev, lalu BASE_URL=http://localhost:5173/)
 *   terminal 2:  npm run test:e2e
 *
 * Variabel lingkungan:
 *   BASE_URL       alamat aplikasi          (bawaan http://localhost:4173/)
 *   CHROMIUM_PATH  jalur Chromium sendiri   (opsional; bawaan: browser hasil `npx playwright install chromium`)
 *
 * Setiap skenario memakai konteks browser BARU (LocalStorage bersih), jadi tes saling independen.
 * Skrip keluar dengan kode 1 jika ada yang gagal.
 */
import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:4173/';
const STORAGE_KEY = 'pixelschedule.v1';

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const results = [];

/** Jalankan satu skenario pada halaman baru. Error konsol/halaman otomatis menggagalkan skenario. */
async function scenario(name, fn, { viewport = { width: 1440, height: 900 } } = {}) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  const problems = [];
  page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    // Font Google dan jaringan luar boleh gagal saat offline; yang lain tidak boleh.
    if (message.type() === 'error' && !/fonts\.|Failed to load resource|ERR_/.test(message.text())) problems.push(`console: ${message.text()}`);
  });
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (route) => route.abort());
  try {
    await fn(page, context);
    assert.deepEqual(problems, [], 'ada error di konsol/halaman');
    results.push({ name, ok: true });
    console.log(`  ok   ${name}`);
  } catch (error) {
    results.push({ name, ok: false, error });
    console.log(`  FAIL ${name}\n       ${String(error.message).split('\n').join('\n       ')}`);
  } finally {
    await context.close();
  }
}

// ---- Helper ---------------------------------------------------------------------

const open = (page, hash = '') => page.goto(`${BASE_URL}${hash}`);
const cardsIn = (page, status) => page.locator(`[data-dropzone][data-status="${status}"] .task-card`);
const xpNow = async (page) => Number(await page.locator('.xp-bar').first().getAttribute('aria-valuenow'));
const storedState = (page) => page.evaluate((key) => JSON.parse(localStorage.getItem(key)), STORAGE_KEY);
const statValue = (page, label) => page.locator('.stat-card', { hasText: label }).locator('.stat-card__value').innerText();

async function addTask(page, { title, priority = 'medium', status = 'todo', due = '' }) {
  await page.locator('[data-action="add-task"]').first().click();
  await page.fill('#task-title', title);
  await page.selectOption('#task-status', status);
  await page.locator(`.modal input[name="priority"][value="${priority}"]`).check({ force: true });
  if (due) await page.fill('#task-due', due);
  await page.locator('.modal button[type="submit"]').click();
}

console.log(`Pixel Schedule e2e -> ${BASE_URL}`);

// ---- Skenario ---------------------------------------------------------------------

await scenario('dashboard: data demo, empat kartu statistik, empat kolom Kanban + Today Schedule', async (page) => {
  await open(page);
  await page.waitForSelector('.kanban-col');
  assert.equal(await page.locator('.stat-card').count(), 4);
  assert.deepEqual(await page.locator('.kanban-col__name').allInnerTexts(), ['TO DO', 'IN PROGRESS', 'REVIEW', 'DONE']);
  assert.equal(await page.locator('.agenda').count(), 1);
  assert.equal(await statValue(page, 'Total Tasks'), '8');
  assert.equal(await statValue(page, 'Completed'), '2');
  const saved = await storedState(page);
  assert.equal(saved.schemaVersion, 1);
  assert.equal(saved.tasks.length, 8);
});

await scenario('CRUD tugas: tambah, validasi, edit, hapus + konfirmasi, tersimpan setelah reload', async (page) => {
  await open(page);
  // validasi: judul kosong ditolak, modal tetap terbuka
  await page.locator('[data-action="add-task"]').first().click();
  await page.locator('.modal button[type="submit"]').click();
  await page.waitForSelector('#task-title-error:not([hidden])');
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('.modal').count(), 0, 'Esc menutup modal');

  await addTask(page, { title: 'Tulis tes e2e', priority: 'high', due: '2026-12-01' });
  await page.waitForSelector('.task-card:has-text("Tulis tes e2e")');
  assert.equal(await statValue(page, 'Total Tasks'), '9');

  await page.reload();
  assert.equal(await page.locator('.task-card:has-text("Tulis tes e2e")').count(), 1, 'data bertahan setelah reload');

  // edit lewat menu kartu
  const card = page.locator('.task-card:has-text("Tulis tes e2e")');
  await card.locator('[data-action="toggle-menu"]').click();
  await card.locator('[data-action="edit-task"]').click();
  await page.fill('#task-title', 'Tes e2e diedit');
  await page.locator('.modal button[type="submit"]').click();
  await page.waitForSelector('.task-card:has-text("Tes e2e diedit")');

  // hapus: batal dulu, lalu konfirmasi
  const edited = page.locator('.task-card:has-text("Tes e2e diedit")');
  await edited.locator('[data-action="toggle-menu"]').click();
  await edited.locator('[data-action="delete-task"]').click();
  await page.locator('[data-confirm-cancel]').click();
  assert.equal(await page.locator('.task-card:has-text("Tes e2e diedit")').count(), 1, 'batal tidak menghapus');
  await edited.locator('[data-action="toggle-menu"]').click(); // menu ditutup saat dialog dibuka; buka lagi
  await edited.locator('[data-action="delete-task"]').click();
  await page.locator('[data-confirm-ok]').click();
  await page.waitForFunction(() => !document.body.innerText.includes('Tes e2e diedit'));
  assert.equal(await statValue(page, 'Total Tasks'), '8');
});

await scenario('Kanban drag-and-drop + XP sekali saja + alternatif menu "Move to"', async (page) => {
  await open(page);
  const xp0 = await xpNow(page);
  assert.equal(xp0, 20, 'demo: dua tugas selesai x 10 XP');
  await addTask(page, { title: 'Quest naga', priority: 'high' }); // High = 30 XP
  const card = page.locator('.task-card:has-text("Quest naga")');
  await card.dragTo(page.locator('[data-dropzone][data-status="done"]'));
  await page.waitForSelector('[data-dropzone][data-status="done"] .task-card:has-text("Quest naga")');
  assert.equal(await xpNow(page), 50, '20 + 30 XP');
  await page.waitForSelector('.toast:has-text("+30 XP")');

  // buka lagi lewat menu -> XP tidak dihapus; selesai lagi -> tidak diberi dua kali
  const done = page.locator('.task-card:has-text("Quest naga")');
  await done.locator('[data-action="toggle-menu"]').click();
  await done.locator('[data-action="move-task"][data-status="review"]').click();
  await page.waitForSelector('[data-dropzone][data-status="review"] .task-card:has-text("Quest naga")');
  assert.equal(await xpNow(page), 50, 'membuka kembali tidak mengurangi XP');
  const back = page.locator('.task-card:has-text("Quest naga")');
  await back.locator('[data-action="toggle-menu"]').click();
  await back.locator('[data-action="move-task"][data-status="done"]').click();
  await page.waitForSelector('[data-dropzone][data-status="done"] .task-card:has-text("Quest naga")');
  assert.equal(await xpNow(page), 50, 'XP tidak diberikan dua kali');

  await page.reload();
  assert.equal(await xpNow(page), 50, 'XP tidak berubah setelah reload');
  assert.equal(await cardsIn(page, 'done').count(), 3);
});

await scenario('level naik tiap 100 XP', async (page) => {
  await open(page);
  for (const title of ['Boss 1', 'Boss 2', 'Boss 3']) {
    await addTask(page, { title, priority: 'high', status: 'done' }); // dibuat langsung "done" tetap dapat XP sekali
    await page.waitForSelector(`.task-card:has-text("${title}")`);
  }
  // 20 + 3x30 = 110 XP -> level 2, sisa 10
  assert.match(await page.locator('.chip--level').innerText(), /LV\s*2/);
  assert.equal(await xpNow(page), 10);
});

await scenario('Tasks: pencarian, filter, pengurutan, centang selesai', async (page) => {
  await open(page, '#/tasks');
  await page.waitForSelector('.task-row');
  assert.equal(await page.locator('.task-row').count(), 8);

  await page.fill('[data-filter="query"]', 'backend'); // pencarian mencocokkan judul, deskripsi, dan kategori
  assert.equal(await page.locator('.task-row').count(), 3);
  await page.fill('[data-filter="query"]', 'database');
  assert.equal(await page.locator('.task-row').count(), 1);
  await page.locator('[data-action="clear-filters"]').first().click();
  assert.equal(await page.locator('.task-row').count(), 8);

  await page.selectOption('[data-filter="priority"]', 'high');
  assert.equal(await page.locator('.task-row').count(), 2);
  await page.selectOption('[data-filter="status"]', 'done');
  await page.waitForSelector('.empty-state');
  await page.locator('[data-action="clear-filters"]').first().click();

  await page.selectOption('[data-filter="sort"]', 'priority'); // tertinggi dulu
  assert.match(await page.locator('.task-row').first().innerText(), /High/);
  await page.locator('[data-action="toggle-sort-dir"]').click();
  assert.match(await page.locator('.task-row').first().innerText(), /Low/);

  const row = page.locator('.task-row:has-text("Tulis Laporan")');
  await row.locator('.px-check').check();
  await page.waitForSelector('.task-row.is-done:has-text("Tulis Laporan")');
  assert.equal((await storedState(page)).tasks.find((t) => t.title === 'Tulis Laporan').status, 'done');
});

await scenario('Calendar: Month/Week/Day, navigasi, CRUD event, sinkron dengan agenda dashboard', async (page) => {
  await open(page, '#/calendar');
  await page.waitForSelector('.cal-grid');
  const label = () => page.locator('.cal-toolbar__label').innerText();
  const monthNow = await label();
  await page.locator('[data-action="cal-next"]').click();
  assert.notEqual(await label(), monthNow);
  await page.locator('[data-action="cal-today"]').click();
  assert.equal(await label(), monthNow);

  await page.locator('[data-action="cal-view"][data-view="week"]').click();
  assert.equal(await page.locator('.week-day').count(), 7);
  await page.locator('[data-action="cal-view"][data-view="day"]').click();
  await page.waitForSelector('.day-view');
  await page.locator('[data-action="cal-view"][data-view="month"]').click();

  // tambah event (validasi jam dulu)
  await page.locator('.cal-toolbar__add').click();
  await page.fill('#event-title', 'Demo ke klien');
  await page.fill('#event-start', '17:00');
  await page.fill('#event-end', '16:00');
  await page.locator('.modal button[type="submit"]').click();
  await page.waitForSelector('#event-end-error:not([hidden]), #event-start-error:not([hidden])');
  await page.fill('#event-end', '18:00');
  await page.locator('.modal button[type="submit"]').click();
  await page.waitForSelector('.cal-detail__row:has-text("Demo ke klien")');

  // agenda di dashboard memakai data yang sama
  await page.locator('a[href="#/dashboard"]').first().click();
  await page.waitForSelector('.agenda__item:has-text("Demo ke klien")');

  // edit + hapus dari kalender
  await page.locator('a[href="#/calendar"]').first().click();
  await page.locator('.cal-detail__row:has-text("Demo ke klien") [data-action="edit-event"]').click();
  await page.fill('#event-title', 'Demo klien (revisi)');
  await page.locator('.modal button[type="submit"]').click();
  await page.waitForSelector('.cal-detail__row:has-text("Demo klien (revisi)")');
  await page.locator('.cal-detail__row:has-text("Demo klien (revisi)") [data-action="delete-event"]').click();
  await page.locator('[data-confirm-ok]').click();
  await page.waitForFunction(() => !document.body.innerText.includes('Demo klien (revisi)'));
});

await scenario('Stats: angka berasal dari data aplikasi dan ikut berubah', async (page) => {
  await open(page, '#/stats');
  await page.waitForSelector('.stat-tile');
  assert.match(await page.locator('.stat-tile:has-text("Task Completion")').innerText(), /25%/);
  assert.equal(await page.locator('.achievement.is-unlocked').count(), 2);
  await page.locator('a[href="#/tasks"]').first().click();
  await page.locator('.task-row:has-text("Tulis Laporan") .px-check').check();
  await page.locator('a[href="#/stats"]').first().click();
  assert.match(await page.locator('.stat-tile:has-text("Task Completion")').innerText(), /38%/); // 3 dari 8
  assert.match(await page.locator('.stat-tile:has-text("Total XP")').innerText(), /40/); // 20 + Medium 20
  await page.selectOption('[data-stats-range]', '30');
  assert.ok((await page.locator('.bars__col').count()) >= 30);
});

await scenario('Settings: halaman awal, konfirmasi hapus, reset demo, hapus semua', async (page) => {
  await open(page, '#/settings');
  await page.selectOption('[data-setting="defaultPage"]', 'tasks');
  await open(page, ''); // tanpa hash -> halaman awal pilihan pengguna
  await page.waitForSelector('.tasks-panel');

  await open(page, '#/settings');
  await page.locator('[data-setting="confirmDelete"]').uncheck();
  await open(page, '#/tasks');
  await page.locator('.task-row:has-text("Tulis Laporan") [data-action="delete-task"]').click();
  assert.equal(await page.locator('.modal').count(), 0, 'tanpa konfirmasi langsung terhapus');
  await page.waitForFunction(() => !document.body.innerText.includes('Tulis Laporan'));

  await open(page, '#/settings');
  await page.locator('[data-action="reset-demo"]').click();
  await page.locator('[data-confirm-ok]').click();
  await page.waitForSelector('.toast:has-text("Demo data restored")');
  assert.equal((await storedState(page)).tasks.length, 8);
  assert.equal((await storedState(page)).settings.defaultPage, 'tasks', 'pengaturan dipertahankan');

  await page.locator('[data-action="clear-data"]').click();
  await page.locator('[data-confirm-ok]').click();
  await page.waitForSelector('.toast:has-text("All data cleared")');
  assert.equal((await storedState(page)).tasks.length, 0);
  await page.locator('a[href="#/dashboard"]').first().click();
  await page.waitForSelector('.kanban-col__empty');
  assert.equal(await page.locator('.kanban-col__empty').count(), 4, 'empty state di tiap kolom');
});

await scenario('LocalStorage rusak: dicadangkan, aplikasi tetap hidup, data demo tidak menimpa', async (page, context) => {
  await context.addInitScript((key) => {
    if (!sessionStorage.getItem('seeded')) {
      localStorage.setItem(key, '{ini bukan json');
      sessionStorage.setItem('seeded', '1');
    }
  }, STORAGE_KEY);
  await open(page);
  await page.waitForSelector('.toast:has-text("corrupted")');
  const backup = await page.evaluate(() => localStorage.getItem('pixelschedule.v1.backup'));
  assert.equal(backup, '{ini bukan json');
  assert.equal(await page.locator('.task-card').count(), 0, 'mulai kosong, bukan demo');
  await addTask(page, { title: 'Setelah pemulihan' });
  await page.reload();
  assert.equal(await page.locator('.task-card:has-text("Setelah pemulihan")').count(), 1);
});

await scenario('aksesibilitas: fokus terkurung di modal, Esc menutup, fokus kembali, tombol bernama', async (page) => {
  await open(page);
  const opener = page.locator('[data-action="add-task"]').first();
  await opener.focus();
  await page.keyboard.press('Enter');
  await page.waitForSelector('.modal[aria-modal="true"]');
  for (let i = 0; i < 25; i += 1) {
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => Boolean(document.activeElement.closest('.modal'))), true, 'fokus keluar modal');
  }
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('.modal').count(), 0);
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('data-focus-id')), 'add-task-main');
  const unnamed = await page.$$eval('button, a[href], input, select', (nodes) =>
    nodes.filter((n) => !(n.getAttribute('aria-label') || n.textContent.trim() || n.labels?.length || n.title)).length);
  assert.equal(unnamed, 0, 'kontrol tanpa nama aksesibel');
});

await scenario('responsif mobile: bottom nav, tanpa scroll horizontal di semua halaman', async (page) => {
  await open(page);
  assert.equal(await page.locator('.bottom-nav').isVisible(), true);
  assert.equal(await page.locator('.sidebar').isVisible(), false);
  for (const hash of ['dashboard', 'calendar', 'tasks', 'stats', 'settings']) {
    await page.locator(`.bottom-nav a[href="#/${hash}"]`).click();
    await page.waitForTimeout(100);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert.ok(overflow <= 0, `scroll horizontal ${overflow}px di #/${hash}`);
  }
}, { viewport: { width: 390, height: 844 } });

await scenario('responsif tablet: sidebar ringkas (ikon saja), tanpa scroll horizontal', async (page) => {
  await open(page);
  assert.equal(await page.locator('.bottom-nav').isVisible(), false);
  const width = (await page.locator('.sidebar').boundingBox()).width;
  assert.ok(width < 100, `sidebar ${width}px seharusnya ringkas`);
  for (const hash of ['dashboard', 'calendar', 'tasks', 'stats', 'settings']) {
    await open(page, `#/${hash}`);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert.ok(overflow <= 0, `scroll horizontal ${overflow}px di #/${hash}`);
  }
}, { viewport: { width: 820, height: 1000 } });

await browser.close();

const failed = results.filter((result) => !result.ok);
console.log(`\n${results.length - failed.length}/${results.length} skenario lulus`);
process.exit(failed.length ? 1 : 0);
