import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getMessaging } from 'firebase-admin/messaging'

function initAdmin() {
  if (getApps().length) return
  initializeApp({
    credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),
  })
}

export default async function handler(req, res) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    initAdmin()
  } catch (e) {
    return res.status(500).json({ error: 'Firebase Admin init failed', detail: e.message })
  }

  const db = getFirestore()
  const messaging = getMessaging()

  const today = new Date().toISOString().split('T')[0]
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]

  // Load all push token docs
  const tokensSnap = await db.collection('pushTokens').get()
  const results = []

  for (const tokenDoc of tokensSnap.docs) {
    const { userId, tokens } = tokenDoc.data()
    if (!tokens?.length) continue

    // Fetch incomplete tasks for this user
    const tasksSnap = await db.collection('tasks')
      .where('userId', '==', userId)
      .where('completed', '==', false)
      .get()

    const tasks = tasksSnap.docs.map(d => d.data())
    const overdue   = tasks.filter(t => t.deadline && t.deadline < today)
    const dueToday  = tasks.filter(t => t.deadline === today)
    const dueTomorrow = tasks.filter(t => t.deadline === tomorrow)

    const urgent = [...overdue, ...dueToday]
    if (urgent.length === 0 && dueTomorrow.length === 0) continue

    let title, body
    if (urgent.length > 0) {
      title = urgent.length === 1
        ? `📋 ${urgent[0].title}`
        : `📋 ${urgent.length} impegni urgenti`
      const parts = []
      if (overdue.length)   parts.push(`${overdue.length} scadut${overdue.length > 1 ? 'i' : 'o'}`)
      if (dueToday.length)  parts.push(`${dueToday.length} per oggi`)
      if (dueTomorrow.length) parts.push(`${dueTomorrow.length} per domani`)
      body = parts.join(' · ')
    } else {
      title = dueTomorrow.length === 1
        ? `📋 Domani: ${dueTomorrow[0].title}`
        : `📋 Domani hai ${dueTomorrow.length} impegni`
      body = ''
    }

    // Send to all tokens, collect invalid ones for cleanup
    const messages = tokens.map(token => ({
      token,
      notification: { title, body },
      data: { tag: 'task-reminder' },
      webpush: {
        notification: { icon: '/favicon.svg', badge: '/favicon.svg', renotify: 'true' },
        fcmOptions: { link: 'https://io-digitale.vercel.app/' },
      },
    }))

    try {
      const batchRes = await messaging.sendEach(messages)
      // Remove invalid/unregistered tokens
      const invalidTokens = batchRes.responses
        .map((r, i) => (!r.success && r.error?.code?.includes('registration-token') ? tokens[i] : null))
        .filter(Boolean)

      if (invalidTokens.length) {
        const { arrayRemove } = await import('firebase-admin/firestore')
        await tokenDoc.ref.update({ tokens: arrayRemove(...invalidTokens) })
      }

      results.push({ userId, sent: batchRes.successCount, failed: batchRes.failureCount })
    } catch (e) {
      results.push({ userId, error: e.message })
    }
  }

  res.json({ ok: true, processed: results.length, results })
}
