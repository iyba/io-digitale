import { useEffect, useRef } from 'react'
import { useCollection } from '../hooks/useCollection'

// Promemoria locali all'ora esatta dell'impegno.
// Funziona quando l'app è aperta o attiva (no server/Firebase necessari).
// Per le notifiche ad app completamente chiusa servirebbe il push (setup Firebase).
export default function TaskReminders({ user }) {
  const { items: tasks } = useCollection('tasks', user.uid)
  const tasksRef = useRef(tasks)
  tasksRef.current = tasks

  useEffect(() => {
    if (!('Notification' in window)) return

    const tick = () => {
      if (Notification.permission !== 'granted') return
      const now = new Date()
      const todayISO = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
      const hm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

      for (const t of tasksRef.current) {
        if (t.completed || !t.time || t.deadline !== todayISO) continue
        if (t.time !== hm) continue // scatta solo nel minuto esatto
        const key = `notified_${t.id}_${todayISO}`
        if (localStorage.getItem(key)) continue
        localStorage.setItem(key, '1')
        showNotif(t)
      }
    }

    tick()
    const id = setInterval(tick, 30000) // controlla ogni 30s
    return () => clearInterval(id)
  }, [])

  return null
}

async function showNotif(task) {
  const title = `🔔 ${task.title}`
  const body = `È ora${task.category ? ' · ' + task.category : ''}`
  try {
    const reg = await navigator.serviceWorker.ready
    await reg.showNotification(title, {
      body, icon: '/favicon.svg', badge: '/favicon.svg',
      tag: `task-${task.id}`, requireInteraction: true,
    })
  } catch {
    try { new Notification(title, { body, icon: '/favicon.svg' }) } catch { /* ignora */ }
  }
}
