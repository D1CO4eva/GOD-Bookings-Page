import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, '');
  const toProxyOrigin = (value: string) => {
    try {
      const parsed = new URL(value);
      return parsed.origin;
    } catch {
      return value;
    }
  };
  const apiProxyTarget =
    env.VITE_DEV_API_PROXY_TARGET ||
    env.VITE_API_BASE ||
    'http://localhost:8081';
  const aiBookingProxyTarget =
    env.VITE_DEV_AI_BOOKING_PROXY_TARGET ||
    (env.VITE_AI_BOOKING_PROXY_URL ? toProxyOrigin(env.VITE_AI_BOOKING_PROXY_URL) : '') ||
    'https://god-auth-service-693007788010.us-central1.run.app';

  return {
    root: path.resolve(__dirname, 'apps/web'),
    envDir: __dirname,
    base: '/homebookings/',
    server: {
      port: 5000,
      host: '0.0.0.0',
      proxy: {
        '/api': 'http://localhost:8081',
        '/__booking_api': {
          target: apiProxyTarget,
          changeOrigin: true,
          rewrite: (requestPath) => requestPath.replace(/^\/__booking_api/, '')
        },
        '/__ai_booking_proxy': {
          target: aiBookingProxyTarget,
          changeOrigin: true,
          rewrite: (requestPath) => requestPath.replace(/^\/__ai_booking_proxy/, '')
        }
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
  };
});
