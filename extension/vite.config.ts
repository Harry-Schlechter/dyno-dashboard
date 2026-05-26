import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { copyFileSync, mkdirSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

// Multi-entry build: sidepanel (React), options (HTML), background (service worker).
// Each entry lands as its own file under dist/ with predictable names referenced by manifest.json.
// `public/` is copied to dist/ by Vite automatically (manifest.json lives there).
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'dyno-copy-icons',
      closeBundle() {
        // If we add icons later, they go in public/icons and get copied automatically.
        // Placeholder: nothing to do for now.
      },
    },
  ],
  publicDir: 'public',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        sidepanel: resolve(__dirname, 'src/sidepanel/index.html'),
        options: resolve(__dirname, 'src/options/index.html'),
        background: resolve(__dirname, 'src/background/service-worker.ts'),
      },
      output: {
        entryFileNames: (chunk) => {
          if (chunk.name === 'background') return 'background.js';
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
