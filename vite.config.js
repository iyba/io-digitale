import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

function buildFirebaseSW(env) {
  return `importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js')

firebase.initializeApp({
  apiKey: ${JSON.stringify(env.VITE_FIREBASE_API_KEY || '')},
  authDomain: ${JSON.stringify(env.VITE_FIREBASE_AUTH_DOMAIN || '')},
  projectId: ${JSON.stringify(env.VITE_FIREBASE_PROJECT_ID || '')},
  storageBucket: ${JSON.stringify(env.VITE_FIREBASE_STORAGE_BUCKET || '')},
  messagingSenderId: ${JSON.stringify(env.VITE_FIREBASE_MESSAGING_SENDER_ID || '')},
  appId: ${JSON.stringify(env.VITE_FIREBASE_APP_ID || '')},
})

const messaging = firebase.messaging()

messaging.onBackgroundMessage(function(payload) {
  const n = payload.notification || {}
  self.registration.showNotification(n.title || 'Il Mio Io Digitale', {
    body: n.body || '',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    tag: (payload.data || {}).tag || 'reminder',
    data: payload.data,
    renotify: true,
  })
})

self.addEventListener('notificationclick', function(event) {
  event.notification.close()
  event.waitUntil(clients.matchAll({ type: 'window' }).then(function(cs) {
    for (var c of cs) { if (c.url === '/' && 'focus' in c) return c.focus() }
    if (clients.openWindow) return clients.openWindow('/')
  }))
})
`
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'firebase-messaging-sw',
        configureServer(server) {
          server.middlewares.use('/firebase-messaging-sw.js', (_req, res) => {
            res.setHeader('Content-Type', 'application/javascript; charset=utf-8')
            res.end(buildFirebaseSW(env))
          })
        },
        generateBundle() {
          this.emitFile({
            type: 'asset',
            fileName: 'firebase-messaging-sw.js',
            source: buildFirebaseSW(env),
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
