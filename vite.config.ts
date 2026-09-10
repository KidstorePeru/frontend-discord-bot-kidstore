import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Producción sirve www.kidstoreperu.net con `serve -s dist -l 4173` (ver
// "start" en package.json), NO con `vite preview` — desde el commit 44eff2a.
// Por eso las cabeceras de seguridad reales de producción viven en
// public/serve.json (que Vite copia a dist/ y `serve` detecta solo).
// El bloque `preview.headers` de abajo es SOLO para revisar un build local
// con `npm run preview`; si cambias la CSP, actualiza también serve.json.
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
