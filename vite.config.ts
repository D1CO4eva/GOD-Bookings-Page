import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  root: path.resolve(__dirname, 'apps/web'),
  envDir: __dirname,
  base: '/homebookings/',
  server: {
    port: 5000,
    host: '0.0.0.0',
    proxy: {
      '/api': 'http://localhost:8081'
    }
  },
  plugins: [react()],
  build: {
    outDir: path.resolve(__dirname, 'dist'),
    emptyOutDir: true
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'apps/web/src'),
      '@shared': path.resolve(__dirname, 'packages/shared/src')
    }
  }
});
