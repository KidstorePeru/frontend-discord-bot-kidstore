import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Config separada de vite.config.ts a propósito — ese archivo trae cabeceras
// de seguridad y el proxy de /api pensados para dev/build real, nada de eso
// hace falta (ni conviene arrastrar) para correr pruebas unitarias con
// jsdom.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: false,
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
