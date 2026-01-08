
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    'process.env.API_KEY': JSON.stringify(
      process.env.SOVEREIGN_CORE_KEY || 
      process.env.VITE_GEMINI_API_KEY || 
      process.env.API_KEY || 
      ''
    ),
    'process.env.SUPABASE_URL': JSON.stringify(
      process.env.SUPABASE_URL || 
      'https://zoovefufpmmzrfjophlx.supabase.co'
    ),
    'process.env.SUPABASE_ANON_KEY': JSON.stringify(
      process.env.SUPABASE_ANON_KEY || 
      ''
    )
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
