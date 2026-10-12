import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
       '@': path.resolve(import.meta.dirname, '.'),
    },
  },
  server: {
    allowedHosts: ['anket.okay.com.tr'],
    host: '127.0.0.1',
    port: 3001,
    strictPort: true,
  },
})