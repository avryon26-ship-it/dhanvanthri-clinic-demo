import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  base: './', // relative paths, so the build works on any static host or subfolder
  plugins: [react(), tailwindcss()],
  server: { port: 5173, open: true },
});
