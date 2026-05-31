import { db } from '../firebase'
import {
  collection, query, where, getDocs,
  addDoc, updateDoc, doc, serverTimestamp
} from 'firebase/firestore'

export async function generateRecurringInstances(userId) {
  if (!userId || userId === 'demo') return

  const now = new Date()
  const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const snap = await getDocs(
    query(collection(db, 'recurring'), where('userId', '==', userId), where('active', '==', true))
  )

  for (const rdoc of snap.docs) {
    const r = { id: rdoc.id, ...rdoc.data() }
    if (r.lastGenerated === currentPeriod) continue

    const day = Math.min(r.dayOfMonth || 1, daysInMonth(now.getFullYear(), now.getMonth()))
    const date = `${currentPeriod}-${String(day).padStart(2, '0')}`

    if (r.kind === 'expense') {
      await addDoc(collection(db, 'expenses'), {
        type: r.type, amount: r.amount, category: r.category,
        description: r.description || '', date,
        userId, recurringId: r.id, createdAt: serverTimestamp(),
      })
    } else {
      await addDoc(collection(db, 'tasks'), {
        title: r.title, category: r.category, priority: r.priority,
        notes: r.notes || '', deadline: date, completed: false,
        userId, recurringId: r.id, createdAt: serverTimestamp(),
      })
    }

    await updateDoc(doc(db, 'recurring', r.id), { lastGenerated: currentPeriod })
  }
}

function daysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate()
}
