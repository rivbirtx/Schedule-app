/**
 * generate-pixel-assets.mjs
 *
 * Membuat ilustrasi pixel art (SVG) di public/assets/images/ dari "sprite" berupa
 * grid karakter. Setiap karakter = satu pixel berwarna (lihat PALETTE).
 *
 * Kenapa dibuat dengan skrip?  Sprite bisa dibaca & diubah langsung sebagai teks,
 * jadi pemula bisa bereksperimen: ubah satu huruf, jalankan `npm run assets`, lihat hasilnya.
 *
 * Semua gambar ORIGINAL (karakter "Cadet" dibuat khusus untuk proyek ini).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'assets', 'images');

const PALETTE = {
  K: '#0b1220', // outline gelap
  H: '#22d3ee', // helm cyan
  h: '#0e7490', // helm gelap
  S: '#f5c9a0', // kulit
  Y: '#facc15', // kuning
  B: '#2563eb', // biru
  b: '#1e3a8a', // biru gelap
  P: '#f472b6', // pink
  W: '#f1f5f9', // putih
  L: '#94a3b8', // abu terang
  D: '#475569', // abu gelap
  G: '#10b981', // hijau
  g: '#047857', // hijau gelap
  R: '#ef4444', // merah
  O: '#fb923c', // oranye
  N: '#7c3f12', // coklat
  n: '#4a2508', // coklat gelap
  V: '#8b5cf6', // ungu
  C: '#1e293b', // slate gelap
};

/** Ubah grid teks menjadi daftar <rect>. Satu baris = satu array rect lebar-berjalan (run-length). */
function spriteToRects(rows, offsetX = 0, offsetY = 0) {
  const rects = [];
  rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const char = row[x];
      if (char === '.' || char === ' ') {
        x += 1;
        continue;
      }
      let run = 1;
      while (x + run < row.length && row[x + run] === char) run += 1;
      rects.push(`<rect x="${x + offsetX}" y="${y + offsetY}" width="${run}" height="${1}" fill="${PALETTE[char]}"/>`);
      x += run;
    }
  });
  return rects;
}

function svgDocument(widthUnits, heightUnits, scale, body, title) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${widthUnits} ${heightUnits}" width="${widthUnits * scale}" height="${heightUnits * scale}" shape-rendering="crispEdges" role="img" aria-label="${title}">
<title>${title}</title>
${body.join('\n')}
</svg>
`;
}

function save(name, widthUnits, heightUnits, scale, body, title) {
  writeFileSync(join(OUT_DIR, name), svgDocument(widthUnits, heightUnits, scale, body, title));
  console.log('wrote', name);
}

// ---------------------------------------------------------------------------
// Sprite
// ---------------------------------------------------------------------------

const SPRITES = {
  // Karakter "Cadet" 16x16
  hero: [
    '.....KKKKKK.....',
    '....KHHHHHHK....',
    '...KHHHHHHHHK...',
    '...KHHYYYYHHK...',
    '...KKSSSSSSKK...',
    '...KSKSSSSKSK...',
    '...KSSSSSSSSK...',
    '....KKSSSSKK....',
    '...PPPPPPPPPP...',
    '..KBBBBPPBBBBK..',
    '..KBBBBBPBBBBK..',
    '.SKBBBBBBBBBBKS.',
    '..KbbbYYYYbbbK..',
    '...KBBBBBBBBK...',
    '...KBBBKKBBBK...',
    '...NNNNKKNNNN...',
  ],
  // Logo gamepad 16x10
  gamepad: [
    '..KKKKKKKKKKKK..',
    '.KLLLLLLLLLLLLK.',
    'KLLLKLLLLLLYLLLK',
    'KLLKWKLLLLRLLPLK',
    'KLKWWWKLLLLLPLLK',
    'KLLKWKLLLLLLLLLK',
    'KLLLKLLLLHLLLLLK',
    'KLLLLLLLLLLLLLLK',
    '.KLLLLKKKKLLLLK.',
    '..KKKK....KKKK..',
  ],
  heart: [
    '.KKK.KKK.',
    'KRRRKRRRK',
    'KRWRRRRRK',
    'KRRRRRRRK',
    '.KRRRRRK.',
    '..KRRRK..',
    '...KRK...',
    '....K....',
  ],
  heartEmpty: [
    '.KKK.KKK.',
    'KCCCKCCCK',
    'KCCCCCCCK',
    'KCCCCCCCK',
    '.KCCCCCK.',
    '..KCCCK..',
    '...KCK...',
    '....K....',
  ],
  // Pohon 14x18
  tree: [
    '....KKKKKK....',
    '..KKGGGGGGKK..',
    '.KGGGGWGGGGGK.',
    '.KGGGGGGGGGGK.',
    'KGGGGGGGgGGGGK',
    'KGGgGGGGGGGGGK',
    'KGGGGGGGGGGgGK',
    'KGGGGGGgGGGGGK',
    '.KGGGGGGGGGGK.',
    '..KKgGGGGgKK..',
    '....KKGGKK....',
    '.....KNNK.....',
    '.....KNNK.....',
    '.....KNnK.....',
    '.....KNNK.....',
    '.....KNnK.....',
    '....KNNNNK....',
    '....KKKKKK....',
  ],
  // Awan 14x6
  cloud: [
    '....KKKK......',
    '..KKWWWWKK.KK.',
    '.KWWWWWWWWKWWK',
    'KWWWWWWWWWWWWK',
    'KLLLLLLLLLLLLK',
    '.KKKKKKKKKKKK.',
  ],
  // Gunung 24x10
  mountain: [
    '..........KK............',
    '.........KWWK...........',
    '........KWWWWK....KK....',
    '.......KLWWWWLK..KWWK...',
    '......KLLLWWLLLKKLWWLK..',
    '.....KLLLLLLLLLLLLLLLLK.',
    '....KDLLLLLLLLLLLLLLLDK.',
    '...KDDLLLLLLLDLLLLLLDDDK',
    '..KDDDDLLLLLDDDLLLLDDDDK',
    '.KKKKKKKKKKKKKKKKKKKKKKK',
  ],
};

// ---------------------------------------------------------------------------
// Penulisan berkas
// ---------------------------------------------------------------------------

mkdirSync(OUT_DIR, { recursive: true });

save('hero.svg', 16, 16, 8, spriteToRects(SPRITES.hero), 'Pixel Cadet character');
save('gamepad.svg', 16, 10, 8, spriteToRects(SPRITES.gamepad), 'Pixel gamepad');
save('heart.svg', 9, 8, 4, spriteToRects(SPRITES.heart), 'Full heart');
save('heart-empty.svg', 9, 8, 4, spriteToRects(SPRITES.heartEmpty), 'Empty heart');
save('tree.svg', 14, 18, 6, spriteToRects(SPRITES.tree), 'Pixel tree');

// Adegan sidebar: 40 x 30 unit (dikali 4 = 160 x 120 px)
{
  const W = 40;
  const H = 30;
  const body = [];
  // langit: dibiarkan transparan agar mengikuti warna panel
  body.push(...spriteToRects(SPRITES.cloud, 22, 2));
  body.push(...spriteToRects(SPRITES.cloud, 2, 7));
  // bintang kecil
  [[8, 3], [31, 9], [18, 10], [36, 4]].forEach(([x, y]) =>
    body.push(`<rect x="${x}" y="${y}" width="1" height="1" fill="${PALETTE.Y}"/>`),
  );
  // tanah: 2 baris rumput + 4 baris tanah
  const groundTop = H - 6;
  for (let x = 0; x < W; x += 1) {
    const grassShade = (x * 7) % 5 === 0 ? PALETTE.g : PALETTE.G;
    body.push(`<rect x="${x}" y="${groundTop}" width="1" height="1" fill="${PALETTE.G}"/>`);
    body.push(`<rect x="${x}" y="${groundTop + 1}" width="1" height="1" fill="${grassShade}"/>`);
    for (let y = groundTop + 2; y < H; y += 1) {
      const dirt = (x + y * 3) % 6 === 0 ? PALETTE.n : PALETTE.N;
      body.push(`<rect x="${x}" y="${y}" width="1" height="1" fill="${dirt}"/>`);
    }
  }
  body.push(...spriteToRects(SPRITES.tree, 3, groundTop - 17));
  body.push(...spriteToRects(SPRITES.hero, 21, groundTop - 15));
  // semak
  body.push(...spriteToRects(['.KGGGK.', 'KGGgGGK', 'KGGGGGK'], 33, groundTop - 3));
  save('scene.svg', W, H, 4, body, 'Pixel Cadet standing in a meadow');
}

// Strip awan untuk dekorasi atas halaman (ubin, bisa diulang horizontal): 64 x 8 unit
{
  const body = [];
  body.push(...spriteToRects(SPRITES.cloud, 4, 1));
  body.push(...spriteToRects(SPRITES.cloud, 36, 2));
  save('clouds.svg', 64, 8, 4, body, 'Pixel clouds');
}

// Gunung untuk dekorasi tepi bawah panel Today Schedule: 48 x 10 unit (2 gunung berdampingan)
{
  const body = [];
  body.push(...spriteToRects(SPRITES.mountain, 0, 0));
  body.push(...spriteToRects(SPRITES.mountain, 24, 0));
  save('mountains.svg', 48, 10, 4, body, 'Pixel mountains');
}
