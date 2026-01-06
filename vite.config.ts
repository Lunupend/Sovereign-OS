import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    // We prioritize the new variable name to ensure a clean break from cached variables
    'process.env.API_KEY': JSON.stringify(
      process.env.SOVEREIGN_CORE_KEY || 
      process.env.VITE_GEMINI_API_KEY || 
      process.env.API_KEY || 
      ''
    ),
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