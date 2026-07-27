import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@shared': fileURLToPath(new URL('../shared', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    // Let Vite read the sibling shared/ folder during dev.
    fs: { allow: ['..'] },
    // Socket.IO talks to the Node server; in production they share an origin.
    proxy: {
      '/socket.io': { target: 'http://localhost:3001', ws: true },
      '/healthz': { target: 'http://localhost:3001' },
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
