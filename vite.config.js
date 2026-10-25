import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

// Tailwind v4 dipasang sebagai plugin Vite (tanpa tailwind.config.js dan postcss.config.js).
// Konfigurasi tema ada di src/styles/tokens.css lewat direktif @theme.
export default defineConfig({
  // './' membuat hasil build bisa dibuka dari sub-folder mana pun (mis. GitHub Pages).
  base: './',
  plugins: [tailwindcss()],
  server: { port: 5173, open: false },
  build: { outDir: 'dist', sourcemap: false },
});
