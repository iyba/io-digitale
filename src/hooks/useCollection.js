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

export function useCollection(collectionName, userId) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
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
  }, [collectionName, userId])

  async function add(data) {
    await addDoc(collection(db, collectionName), {
      ...sanitizeData(data),
      userId,
      createdAt: serverTimestamp(),
    })
  }

  async function update(id, data) {
    await updateDoc(doc(db, collectionName, id), sanitizeData(data))
  }

  async function remove(id) {
    await deleteDoc(doc(db, collectionName, id))
  }

  return { items, loading, add, update, remove }
}
