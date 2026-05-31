import { doc, setDoc, arrayUnion, arrayRemove } from 'firebase/firestore'
import { app, db } from '../firebase'

export async function requestPushPermission(userId) {
  if (!('Notification' in window) || !('serviceWorker' in navigator)) return false

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return false

  return savePushToken(userId)
}

export async function savePushTokenIfGranted(userId) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  savePushToken(userId)
}

async function savePushToken(userId) {
  try {
    const swReg = await navigator.serviceWorker.ready
    const { getMessaging, getToken } = await import('firebase/messaging')
    const messaging = getMessaging(app)
    const token = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: swReg,
    })
    if (token) {
      await setDoc(doc(db, 'pushTokens', userId), {
        userId,
        tokens: arrayUnion(token),
      }, { merge: true })
      return true
    }
  } catch (e) {
    console.warn('Push registration failed:', e.message)
  }
  return false
}
