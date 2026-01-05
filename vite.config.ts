import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    // We map the new variable name into the application's expected API_KEY slot
    'process.env.API_KEY': JSON.stringify(process.env.SOVEREIGN_CORE_KEY || process.env.API_KEY || ''),
    'process.env.SOVEREIGN_CORE_KEY': JSON.stringify(process.env.SOVEREIGN_CORE_KEY || '')
  },
  server: {
    port: 3000
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false
  }
});