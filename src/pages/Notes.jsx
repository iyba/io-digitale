import { useState, useMemo } from 'react'
import { useCollection } from '../hooks/useCollection'

export default function Notes({ user }) {
  const { items, add, update, remove } = useCollection('tasks', user.uid)
  const notes = useMemo(() => items.filter(t => t.isNote), [items])
  const [text, setText] = useState('')
  const [editId, setEditId] = useState(null)
  const [editText, setEditText] = useState('')

  function addNote() {
    const t = text.trim()
    if (!t) return
    add({ title: t, isNote: true, category: 'Nota', priority: 'bassa', completed: false })
    setText('')
  }

  function startEdit(n) { setEditId(n.id); setEditText(n.title) }

  function saveEdit() {
    const t = editText.trim()
    if (t && t !== '') update(editId, { title: t })
    setEditId(null)
    setEditText('')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div>
        <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.03em' }}>Note</h1>
        <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: 'rgba(var(--text-rgb),0.4)' }}>
          {notes.length === 0 ? 'Nessuna nota' : `${notes.length} not${notes.length === 1 ? 'a' : 'e'}`}
          <span style={{ color: 'rgba(var(--text-rgb),0.3)' }}> · prova a dire "nota ..." 🎤</span>
        </p>
      </div>

      {/* Aggiunta rapida */}
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addNote()}
          placeholder="Scrivi una nota..."
          style={{ flex: 1 }}
        />
        <button onClick={addNote} disabled={!text.trim()} style={{
          background: text.trim() ? 'linear-gradient(135deg, #7c3aed, #4f46e5)' : 'var(--surface)',
          border: 'none', borderRadius: '0.875rem', padding: '0 1.1rem', color: 'white',
          fontWeight: 800, fontSize: '1.2rem', cursor: text.trim() ? 'pointer' : 'default', flexShrink: 0,
        }}>+</button>
      </div>

      {/* Lista note */}
      {notes.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
          <p style={{ fontSize: '2.5rem', margin: '0 0 0.5rem' }}>📝</p>
          <p style={{ margin: 0, color: 'rgba(var(--text-rgb),0.3)', fontSize: '0.9rem' }}>
            Nessuna nota — scrivila sopra o dì "nota ..."
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {notes.map(n => (
            <div key={n.id} style={{
              display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderLeft: '3px solid #fbbf24', borderRadius: '1rem', padding: '0.875rem 1rem',
            }}>
              <span style={{ fontSize: '0.95rem', marginTop: 1 }}>📝</span>
              {editId === n.id ? (
                <input
                  value={editText}
                  onChange={e => setEditText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && saveEdit()}
                  onBlur={saveEdit}
                  autoFocus
                  style={{ flex: 1, fontSize: '0.9rem' }}
                />
              ) : (
                <p onClick={() => startEdit(n)} style={{ flex: 1, margin: 0, fontSize: '0.9rem', color: 'var(--text)', lineHeight: 1.4, wordBreak: 'break-word', cursor: 'pointer' }}>
                  {n.title}
                </p>
              )}
              <button onClick={() => remove(n.id)} style={{
                background: 'none', border: 'none', color: 'rgba(var(--text-rgb),0.3)',
                cursor: 'pointer', fontSize: '1rem', flexShrink: 0, padding: '0 0.2rem',
              }}>✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
