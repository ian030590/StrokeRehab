import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalizedId = id.replaceAll('\\', '/');
          if (normalizedId.includes('/node_modules/three/')) {
            return 'three-runtime';
          }
          if (normalizedId.includes('/node_modules/pixi.js/') || normalizedId.includes('/node_modules/@pixi/')) {
            return 'pixi-runtime';
          }
          if (normalizedId.includes('/node_modules/jspsych/') || normalizedId.includes('/node_modules/@jspsych/')) {
            return 'experiment-runtime';
          }
          if (normalizedId.includes('/node_modules/recharts/')) {
            return 'charts-runtime';
          }
        },
      },
    },
  },
});
