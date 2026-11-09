import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    // three.js ocupa ~150 kB gzip; es esperado
    chunkSizeWarningLimit: 800,
  },
});
