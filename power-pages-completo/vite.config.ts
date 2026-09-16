import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/',
  css: { postcss: { plugins: [] } },
  resolve: { alias: {
    'next/navigation': fileURLToPath(new URL('./src/compat/navigation.ts', import.meta.url)),
    'next/image': fileURLToPath(new URL('./src/compat/image.tsx', import.meta.url)),
  } },
});
