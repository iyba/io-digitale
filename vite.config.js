import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Service worker unificato: precache app shell (offline) + Firebase messaging.
function buildSW(env, assets) {
  const fbConfig = JSON.stringify({
    apiKey: env.VITE_FIREBASE_API_KEY || '',
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || '',
    projectId: env.VITE_FIREBASE_PROJECT_ID || '',
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: env.VITE_FIREBASE_APP_ID || '',
  })
  const cache = 'iodigitale-' + Date.now()
  const assetList = JSON.stringify(['/', '/index.html', '/manifest.json', '/favicon.svg', ...assets.map(a => '/' + a)])

  return [
    'const CACHE = ' + JSON.stringify(cache) + ';',
    'const ASSETS = ' + assetList + ';',
    "self.addEventListener('install', function(e){",
    '  self.skipWaiting();',
    '  e.waitUntil(caches.open(CACHE).then(function(c){ return c.addAll(ASSETS).catch(function(){}); }));',
    '});',
    "self.addEventListener('activate', function(e){",
    '  e.waitUntil((async function(){',
    '    var keys = await caches.keys();',
    '    await Promise.all(keys.map(function(k){ return k === CACHE ? null : caches.delete(k); }));',
    '    await self.clients.claim();',
    '  })());',
    '});',
    "self.addEventListener('fetch', function(e){",
    '  var req = e.request;',
    "  if (req.method !== 'GET') return;",
    '  var url = new URL(req.url);',
    '  if (url.origin !== self.location.origin) return;',
    "  if (url.pathname.indexOf('/api/') === 0) return;",
    "  if (req.mode === 'navigate') {",
    '    e.respondWith(fetch(req).catch(function(){ return caches.match(\'/index.html\').then(function(r){ return r || caches.match(\'/\'); }); }));',
    '    return;',
    '  }',
    '  e.respondWith(caches.match(req).then(function(cached){',
    '    return cached || fetch(req).then(function(resp){',
    "      if (resp && resp.status === 200 && resp.type === 'basic') { var copy = resp.clone(); caches.open(CACHE).then(function(c){ c.put(req, copy); }); }",
    '      return resp;',
    '    });',
    '  }));',
    '});',
    "self.addEventListener('notificationclick', function(event){",
    '  event.notification.close();',
    "  event.waitUntil(clients.matchAll({ type: 'window' }).then(function(cs){",
    "    for (var i=0;i<cs.length;i++){ if ('focus' in cs[i]) return cs[i].focus(); }",
    "    if (clients.openWindow) return clients.openWindow('/');",
    '  }));',
    '});',
    'try {',
    "  importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');",
    "  importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');",
    '  firebase.initializeApp(' + fbConfig + ');',
    '  var messaging = firebase.messaging();',
    '  messaging.onBackgroundMessage(function(payload){',
    '    var n = payload.notification || {};',
    "    self.registration.showNotification(n.title || 'Il Mio Io Digitale', {",
    "      body: n.body || '', icon: '/favicon.svg', badge: '/favicon.svg',",
    "      tag: (payload.data || {}).tag || 'reminder', data: payload.data, renotify: true,",
    '    });',
    '  });',
    '} catch (err) { /* offline: messaging non disponibile, la cache funziona comunque */ }',
    '',
  ].join('\n')
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'unified-sw',
        generateBundle(_options, bundle) {
          const assets = Object.keys(bundle).filter(f => f !== 'sw.js' && !f.endsWith('.map'))
          this.emitFile({
            type: 'asset',
            fileName: 'sw.js',
            source: buildSW(env, assets),
          })
        },
      },
    ],
    build: {
      chunkSizeWarningLimit: 1200,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('firebase') || id.includes('@firebase')) return 'firebase'
              if (id.includes('recharts') || id.includes('d3-')) return 'charts'
              if (id.includes('date-fns')) return 'datefns'
              if (id.includes('react')) return 'react'
            }
          },
        },
      },
    },
  }
})
