import { initializeApp } from 'firebase/app'
import { initializeFirestore, getFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export const app = initializeApp(firebaseConfig)

// App Check: verifica che le richieste vengano dalla tua app (non da script/bot).
// Per attivarlo: Firebase Console → App Check → Registra l'app con reCAPTCHA v3,
// poi aggiungi VITE_RECAPTCHA_SITE_KEY al .env e a Vercel (Environment Variables).
if (import.meta.env.VITE_RECAPTCHA_SITE_KEY) {
  initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(import.meta.env.VITE_RECAPTCHA_SITE_KEY),
    isTokenAutoRefreshEnabled: true,
  })
}

// Firestore con cache offline (IndexedDB): i dati restano disponibili senza rete
let firestore
try {
  firestore = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  })
} catch {
  // Fallback (es. navigazione privata che blocca IndexedDB)
  firestore = getFirestore(app)
}

export const db = firestore
export const auth = getAuth(app)
