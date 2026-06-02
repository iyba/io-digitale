import { useState, useEffect } from 'react'
import { db } from '../firebase'
import {
  collection, query, where, onSnapshot,
  addDoc, updateDoc, deleteDoc, doc, serverTimestamp
} from 'firebase/firestore'
import { sanitizeData } from '../utils/sanitize'

// Converte createdAt (Timestamp Firestore, numero, o null per scritture in
// sospeso) in millisecondi. I doc appena creati (null) vengono in cima.
function createdMs(ts) {
  if (!ts) return Date.now()
  if (typeof ts.toMillis === 'function') return ts.toMillis()
  if (typeof ts === 'number') return ts
  if (ts.seconds != null) return ts.seconds * 1000
  return 0
}

const today = new Date().toISOString().split('T')[0]
const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]
const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
const in3days = new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0]
const in7days = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
const thisMonth = today.slice(0, 7)
const lastWeek = new Date(Date.now() - 5 * 86400000).toISOString().split('T')[0]

const DEMO_TASKS = [
  { id: 'd1', title: 'Chiamare il commercialista', deadline: tomorrow, category: 'Lavoro', priority: 'alta', completed: false, notes: 'Riguardo dichiarazione dei redditi', userId: 'demo' },
  { id: 'd2', title: 'Riunione team marketing', deadline: today, category: 'Lavoro', priority: 'alta', completed: false, notes: '', userId: 'demo' },
  { id: 'd3', title: 'Visita dal dentista', deadline: in3days, category: 'Salute', priority: 'media', completed: false, notes: '', userId: 'demo' },
  { id: 'd4', title: 'Pagare bolletta luce', deadline: yesterday, category: 'Casa', priority: 'alta', completed: false, notes: '', userId: 'demo' },
  { id: 'd5', title: 'Comprare regalo compleanno mamma', deadline: in7days, category: 'Famiglia', priority: 'media', completed: false, notes: '', userId: 'demo' },
  { id: 'd6', title: 'Palestra — gamba', deadline: today, category: 'Salute', priority: 'bassa', completed: false, notes: '', userId: 'demo' },
  { id: 'd7', title: 'Finire presentazione Q2', deadline: in3days, category: 'Lavoro', priority: 'alta', completed: false, notes: '', userId: 'demo' },
  { id: 'd8', title: 'Pagare affitto maggio', deadline: '', category: 'Casa', priority: 'media', completed: true, notes: '', userId: 'demo' },
  { id: 'd9', title: 'Spesa settimanale', deadline: '', category: 'Casa', priority: 'bassa', completed: true, notes: '', userId: 'demo' },
]

const DEMO_RECURRING = [
  { id: 'r1', kind: 'expense', frequency: 'monthly', dayOfMonth: 1, type: 'spesa', amount: 18.99, category: 'Casa', description: 'Netflix', active: true, lastGenerated: thisMonth, userId: 'demo' },
  { id: 'r2', kind: 'expense', frequency: 'monthly', dayOfMonth: 1, type: 'spesa', amount: 9.99, category: 'Casa', description: 'Spotify', active: true, lastGenerated: thisMonth, userId: 'demo' },
  { id: 'r3', kind: 'expense', frequency: 'monthly', dayOfMonth: 10, type: 'spesa', amount: 14.99, category: 'Casa', description: 'Disney+', active: true, lastGenerated: thisMonth, userId: 'demo' },
  { id: 'r4', kind: 'expense', frequency: 'monthly', dayOfMonth: 27, type: 'spesa', amount: 850, category: 'Casa', description: 'Affitto', active: true, lastGenerated: thisMonth, userId: 'demo' },
]

const DEMO_EXPENSES = [
  { id: 'e1', type: 'entrata', amount: 2400, category: 'Stipendio', description: 'Stipendio maggio', date: `${thisMonth}-02`, userId: 'demo' },
  { id: 'e2', type: 'spesa', amount: 87.50, category: 'Cibo', description: 'Supermercato Coop', date: today, userId: 'demo' },
  { id: 'e3', type: 'spesa', amount: 45, category: 'Macchina', description: 'Benzina', date: yesterday, userId: 'demo' },
  { id: 'e4', type: 'spesa', amount: 120, category: 'Casa', description: 'Bolletta gas', date: lastWeek, userId: 'demo' },
  { id: 'e5', type: 'spesa', amount: 32, category: 'Svago', description: 'Cinema + cena', date: lastWeek, userId: 'demo' },
  { id: 'e6', type: 'spesa', amount: 18.99, category: 'Casa', description: 'Netflix', date: `${thisMonth}-01`, userId: 'demo' },
  { id: 'e7', type: 'spesa', amount: 65, category: 'Personale', description: 'T-shirt e jeans', date: `${thisMonth}-10`, userId: 'demo' },
  { id: 'e8', type: 'spesa', amount: 22, category: 'Personale', description: 'Farmacia', date: `${thisMonth}-08`, userId: 'demo' },
  { id: 'e9', type: 'entrata', amount: 350, category: 'Freelance', description: 'Progetto sito web', date: `${thisMonth}-15`, userId: 'demo' },
  { id: 'e10', type: 'spesa', amount: 9.99, category: 'Casa', description: 'Spotify', date: `${thisMonth}-01`, userId: 'demo' },
]

export function useCollection(collectionName, userId) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  const isDemo = userId === 'demo'

  useEffect(() => {
    if (isDemo) {
      const data = collectionName === 'tasks' ? DEMO_TASKS : collectionName === 'recurring' ? DEMO_RECURRING : DEMO_EXPENSES
      setItems(data)
      setLoading(false)
      return
    }
    if (!userId) return
    // Niente orderBy nella query: un campo serverTimestamp è null finché il
    // server non risponde, e Firestore escluderebbe i documenti appena creati
    // dalle query ordinate (apparivano solo cambiando pagina). Ordiniamo qui.
    const q = query(
      collection(db, collectionName),
      where('userId', '==', userId)
    )
    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      docs.sort((a, b) => createdMs(b.createdAt) - createdMs(a.createdAt))
      setItems(docs)
      setLoading(false)
    })
    return unsub
  }, [collectionName, userId, isDemo])

  async function add(data) {
    if (isDemo) return
    await addDoc(collection(db, collectionName), {
      ...sanitizeData(data),
      userId,
      createdAt: serverTimestamp(),
    })
  }

  async function update(id, data) {
    if (isDemo) {
      setItems(prev => prev.map(item => item.id === id ? { ...item, ...data } : item))
      return
    }
    await updateDoc(doc(db, collectionName, id), sanitizeData(data))
  }

  async function remove(id) {
    if (isDemo) {
      setItems(prev => prev.filter(item => item.id !== id))
      return
    }
    await deleteDoc(doc(db, collectionName, id))
  }

  return { items, loading, add, update, remove }
}
