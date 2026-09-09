import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// `vite preview` es lo que realmente sirve www.kidstoreperu.net en
// producción (ver "start" en package.json) — por eso los headers de
// seguridad van aquí y no solo en el backend Go, que no toca este dominio.
const BACKEND_ORIGIN = 'https://backend-discord-bot-kidstore-production.up.railway.app';

const csp = [
  "default-src 'self'",
  "script-src 'self'",
  // 'unsafe-inline' en style-src es necesario: la app usa style={{...}} en
  // JSX de forma extensiva. No hay <script> inline en ningún lado, así que
  // script-src se queda estricto.
  "style-src 'self' 'unsafe-inline'",
  // Las imágenes de ítems vienen de la API de Fortnite (dominio variable de
  // Epic/CDN), por eso se permite https: en general en vez de listar hosts.
  "img-src 'self' https: data:",
  "font-src 'self'",
  `connect-src 'self' ${BACKEND_ORIGIN} https://ipapi.co`,
  // El Landing embebe reseñas reales de Facebook (Page Plugin oficial) en
  // un <iframe> — es el único iframe de la app.
  "frame-src https://www.facebook.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join('; ');

const securityHeaders = {
  'Content-Security-Policy': csp,
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
  },
  preview: {
    host: true,
    port: 4173,
    allowedHosts: ['www.kidstoreperu.net'],
    headers: securityHeaders,
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8081',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
