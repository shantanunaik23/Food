import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Relative base so the built output runs from a file:// path or any subdirectory,
// not just the root of a domain.
export default defineConfig({
  plugins: [react()],
  base: './',
});
