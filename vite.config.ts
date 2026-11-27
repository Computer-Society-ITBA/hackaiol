/// <reference types="vitest/config" />
import fs from 'node:fs'
import path from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// TODO: swap for the real domain once it is decided (also in
// functions/src/lib/emailTemplates.ts).
const SITE_URL = 'https://csitba-hackaiol.web.app'

type RouteMeta = {
  path: string
  title: string
  description: string
  image: string
}

// Link previews (Open Graph and Twitter cards). Crawlers do not run the
// app, so every route that needs its own preview gets its own HTML file.
const HOME: RouteMeta = {
  path: '/',
  title: 'HackaIOL, hackathon de IA de ITBA e IOL Inversiones',
  description:
    'Una hackathon de un día para construir con IA sobre el MCP de IOL Inversiones. 12 de diciembre, de 11 a 19 h.',
  image: '/og/home.jpg',
}
const SIGNUP: RouteMeta = {
  path: '/signup',
  title: 'Inscripción a HackaIOL',
  description:
    'Armá tu equipo de 3 y anotate a la hackathon de IA de Computer Society ITBA e IOL Inversiones.',
  image: '/og/signup.jpg',
}

// schema.org data so search engines understand this is an event, when it
// is and who runs it. TODO: the venue is still TBA, so `location` only
// names the city. Add the venue name and streetAddress once confirmed.
const EVENT_JSON_LD = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'Event',
  name: 'HackaIOL',
  description: HOME.description,
  url: SITE_URL + '/',
  image: SITE_URL + HOME.image,
  startDate: '2026-12-12T11:00:00-03:00',
  endDate: '2026-12-12T19:00:00-03:00',
  eventStatus: 'https://schema.org/EventScheduled',
  eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
  isAccessibleForFree: true,
  inLanguage: 'es',
  location: {
    '@type': 'Place',
    name: 'Ciudad Autónoma de Buenos Aires',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Ciudad Autónoma de Buenos Aires',
      addressRegion: 'CABA',
      addressCountry: 'AR',
    },
  },
  offers: {
    '@type': 'Offer',
    url: SITE_URL + SIGNUP.path,
    price: 0,
    priceCurrency: 'ARS',
    availability: 'https://schema.org/InStock',
    validFrom: '2026-11-25T00:00:00-03:00',
  },
  organizer: {
    '@type': 'Organization',
    name: 'Computer Society ITBA',
    url: 'https://www.csitba.com.ar/',
  },
  sponsor: {
    '@type': 'Organization',
    name: 'IOL Inversiones',
    url: 'https://www.invertironline.com/',
  },
})

function renderMeta(meta: RouteMeta): string {
  const url = SITE_URL + meta.path
  const image = SITE_URL + meta.image
  return [
    `<title>${meta.title}</title>`,
    `<meta name="description" content="${meta.description}" />`,
    `<link rel="canonical" href="${url}" />`,
    '<meta property="og:type" content="website" />',
    '<meta property="og:site_name" content="HackaIOL" />',
    '<meta property="og:locale" content="es_AR" />',
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:title" content="${meta.title}" />`,
    `<meta property="og:description" content="${meta.description}" />`,
    `<meta property="og:image" content="${image}" />`,
    '<meta property="og:image:width" content="1200" />',
    '<meta property="og:image:height" content="630" />',
    `<meta property="og:image:alt" content="${meta.title}" />`,
    '<meta name="twitter:card" content="summary_large_image" />',
    `<meta name="twitter:title" content="${meta.title}" />`,
    `<meta name="twitter:description" content="${meta.description}" />`,
    `<meta name="twitter:image" content="${image}" />`,
    `<script type="application/ld+json">${EVENT_JSON_LD}</script>`,
  ].join('\n    ')
}

/**
 * Fills the <!-- route-meta --> marker in index.html with the home
 * preview tags, and on build emits signup.html with the sign up ones.
 * firebase.json serves it at /signup through cleanUrls.
 */
function routeMeta(): Plugin {
  const MARKER = '<!-- route-meta -->'
  return {
    name: 'route-meta',
    transformIndexHtml(html) {
      if (!html.includes(MARKER)) {
        throw new Error(`index.html is missing ${MARKER}`)
      }
      return html.replace(MARKER, renderMeta(HOME))
    },
    // The built index.html only exists once the bundle is written.
    writeBundle(options) {
      const dir = options.dir ?? 'dist'
      const home = fs.readFileSync(path.join(dir, 'index.html'), 'utf8')
      const signup = home.replace(renderMeta(HOME), renderMeta(SIGNUP))
      if (signup === home) {
        throw new Error('route-meta could not build signup.html')
      }
      fs.writeFileSync(path.join(dir, 'signup.html'), signup)
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), routeMeta()],
  // Hosting rewrites /api/admin/** to hackaiolAdminApi. In dev the same
  // path goes to that function on the local Functions emulator.
  server: {
    proxy: {
      '/api/admin': {
        target:
          'http://127.0.0.1:5001/webpage-36e40/us-central1/hackaiolAdminApi',
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    passWithNoTests: true,
  },
})
