# Pixel Schedule

Website produktivitas bertema **Retro Arcade 8-bit** (dark mode): Kanban, kalender, agenda, XP, level, streak, dan
achievement. Dibangun dengan HTML5, **Tailwind CSS v4**, **Vanilla JavaScript (ES Modules)**, dan **Vite** — tanpa
framework. Data disimpan di LocalStorage.

## Menjalankan

Butuh Node.js ≥ 20.19.

```bash
npm install          # pasang dependency
npm run dev          # server pengembangan  → http://localhost:5173
npm run build        # build produksi       → dist/
npm run preview      # lihat hasil build    → http://localhost:4173
npm test             # tes unit (node --test, tanpa dependency tambahan)
npm run test:e2e     # tes browser (butuh app berjalan, lihat di bawah)
npm run assets       # buat ulang ilustrasi pixel art di public/assets/images/
```

Tes e2e memakai Playwright:

```bash
npx playwright install chromium     # sekali saja
npm run build && npm run preview &  # jalankan app
npm run test:e2e                    # BASE_URL=http://localhost:4173/ (bawaan)
```

## Fitur

- **Dashboard**: 4 kartu statistik, Kanban (To Do / In Progress / Review / Done) dan Today Schedule berdampingan.
- **Tugas**: tambah, edit, hapus (dengan konfirmasi), subtask, kategori, prioritas, deadline; drag-and-drop **dan**
  menu "Move to" (untuk keyboard/sentuh); halaman Tasks dengan pencarian, filter status/prioritas/kategori, dan
  pengurutan deadline/prioritas/tanggal dibuat.
- **Kalender**: tampilan Month / Week / Day, navigasi, tambah/edit/hapus event, deadline tugas (kotak merah/kuning/
  hijau) berbeda dari event (batang berwarna), detail hari terpilih, navigasi panah di grid.
- **Gamification**: XP (Low 10 · Medium 20 · High 30), 100 XP = 1 level, streak harian, 8 achievement. XP hanya
  diberikan sekali per tugas.
- **Stats**: completion %, streak, XP, level, donut distribusi status, grafik batang 7/30 hari, achievement — semua
  dihitung dari data aplikasi.
- **Settings**: halaman awal, konfirmasi hapus, ekspor/impor JSON, reset data demo, hapus semua data, info versi.
- **Penyimpanan**: LocalStorage (`pixelschedule.v1`) dengan versi schema, validasi saat dimuat, dan cadangan otomatis
  jika JSON rusak. Data demo hanya dimuat saat belum ada data.
- **Responsif**: desktop (sidebar penuh), tablet (sidebar ikon), mobile (bottom navigation); keyboard, fokus
  terlihat, dan `prefers-reduced-motion` dihormati.

## Struktur

```
pixel-schedule/
├── index.html              kerangka halaman (sidebar, header, #page, bottom nav, wadah modal/toast)
├── vite.config.js          Vite + plugin Tailwind v4
├── docs/                   WBS · ARCHITECTURE · UI-GUIDE · LEARNING-GUIDE
├── public/assets/images/   ilustrasi pixel art (SVG)
├── scripts/                generate-pixel-assets.mjs
├── src/
│   ├── main.js             titik masuk: inisialisasi + render
│   ├── styles/             input · tokens · base · layout · components · utilities
│   ├── data/               constants, demo-data, empty-state
│   ├── utils/              date-utils, dom-utils (html aman), validation, id-generator
│   ├── services/           task · event · gamification · storage (aturan bisnis, murni)
│   ├── state/              app-state (state aktif + action)
│   ├── components/         sidebar, header, kartu, kanban, agenda, kalender, modal, toast, ikon
│   ├── pages/              dashboard, calendar, tasks, stats, settings
│   └── features/           kanban (drag-drop), calendar, tasks, settings, navigation, gamification
└── tests/
    ├── unit/               84 tes (node --test)
    └── e2e/smoke.mjs       12 skenario browser (Playwright)
```

## Dependency

| Paket | Untuk apa |
|-------|-----------|
| `vite` | dev server dan build |
| `tailwindcss`, `@tailwindcss/vite` | Tailwind v4 (plugin Vite; tanpa `tailwind.config.js`/PostCSS) |
| `playwright` | hanya untuk tes e2e |

Tidak ada dependency runtime: seluruh kode aplikasi adalah JavaScript native. Font **Press Start 2P** dimuat dari
Google Fonts (lihat `docs/UI-GUIDE.md` untuk self-host).

## Dokumentasi

- [`docs/WBS.md`](docs/WBS.md) — rencana kerja dan status tiap butir
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — alur data dan tanggung jawab modul
- [`docs/UI-GUIDE.md`](docs/UI-GUIDE.md) — token desain dan aturan visual
- [`docs/LEARNING-GUIDE.md`](docs/LEARNING-GUIDE.md) — urutan belajar kode dan cara menambah fitur
