import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// Multi-entry build:
//   sidepanel + options: React HTML entries (hashed bundles, fine).
//   background, content-selection, content-site-suggester: plain script files
//     that must be referenced from manifest.json by stable filenames, so we
//     pin their entryFileNames below.
export default defineConfig({
  plugins: [react()],
  publicDir: 'public',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        sidepanel: resolve(__dirname, 'src/sidepanel/index.html'),
        options: resolve(__dirname, 'src/options/index.html'),
        background: resolve(__dirname, 'src/background/service-worker.ts'),
        'content-selection': resolve(__dirname, 'src/content/selection-bar.ts'),
        'content-site-suggester': resolve(__dirname, 'src/content/site-suggester.ts'),
      },
      output: {
        entryFileNames: (chunk) => {
          if (chunk.name === 'background') return 'background.js';
          if (chunk.name === 'content-selection') return 'content-selection.js';
          if (chunk.name === 'content-site-suggester') return 'content-site-suggester.js';
          return 'assets/[name]-[hash].js';
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
    target: 'es2020',
    sourcemap: true,
  },
});
