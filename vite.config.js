// vite.config.js
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default ({ mode }) => {
  // Load only env vars prefixed with VITE_
  const env = loadEnv(mode, process.cwd(), 'VITE_');

  return defineConfig({
    plugins: [
      react(),
    ],

    // --- Import alias ---
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },

    // --- Dev-server tweaks ---
    server: {
      port: 5173,
      open: true,
    },

    // --- Build tweaks ---
    build: {
      sourcemap: mode === 'development',
      chunkSizeWarningLimit: 500,
    },

    // --- Global replacements ---
    define: {
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
    },
  });
};
