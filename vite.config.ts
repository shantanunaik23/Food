import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Relative base plus a single classic (non-module) bundle.
 *
 * The brief requires the build to run from a folder with no server. Browsers
 * refuse to load `<script type="module">` over file:// because module fetches
 * are subject to CORS, so an ordinary Vite build shows a blank page when opened
 * from disk. Emitting one IIFE bundle and inlining it (scripts/inline.mjs)
 * makes dist/index.html genuinely self-contained.
 */
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    cssCodeSplit: false,
    assetsInlineLimit: 0,
    rollupOptions: {
      output: {
        format: 'iife',
        inlineDynamicImports: true,
        entryFileNames: 'assets/app.js',
        assetFileNames: 'assets/[name][extname]',
      },
    },
  },
});
