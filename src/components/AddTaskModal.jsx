import { useState } from 'react'
import { useCollection } from '../hooks/useCollection'
import { parseVoiceToTask } from '../utils/voiceParser'

const CATEGORIES = ['Lavoro', 'Casa', 'Salute', 'Famiglia', 'Personale', 'Altro']
const PRIORITIES = ['alta', 'media', 'bassa']

const CAT_COLORS = {
  Lavoro: { bg: 'rgba(129,140,248,0.15)', color: '#818cf8' },
  Casa: { bg: 'rgba(251,146,60,0.15)', color: '#fb923c' },
  Salute: { bg: 'rgba(74,222,128,0.15)', color: '#4ade80' },
  Famiglia: { bg: 'rgba(244,114,182,0.15)', color: '#f472b6' },
  Personale: { bg: 'rgba(192,132,252,0.15)', color: '#c084fc' },
  Altro: { bg: 'rgba(148,163,184,0.15)', color: '#94a3b8' },
}

const PRI = {
  alta: { bg: 'rgba(239,68,68,0.12)', color: '#f87171', label: '🔴 Alta' },
  media: { bg: 'rgba(245,158,11,0.12)', color: '#fbbf24', label: '🟡 Media' },
  bassa: { bg: 'rgba(34,197,94,0.12)', color: '#4ade80', label: '🟢 Bassa' },
}

export default function AddTaskModal({ user, initial, onClose }) {
  const { add, update, remove } = useCollection('tasks', user.uid)
  const { add: addRecurring } = useCollection('recurring', user.uid)
  const isEdit = initial && typeof initial === 'object' && initial.id
  const parsed = initial?.voice ? parseVoiceToTask(initial.voice) : null
  const prefillDate = initial?.prefillDate || ''

  const [title, setTitle] = useState(isEdit ? initial.title : (parsed?.title || ''))
  const [deadline, setDeadline] = useState(isEdit ? (initial.deadline || '') : (parsed?.deadline || prefillDate))
  const [category, setCategory] = useState(isEdit ? initial.category : (parsed?.category || 'Personale'))
  const [priority, setPriority] = useState(isEdit ? initial.priority : (parsed?.priority || 'media'))
  const [notes, setNotes] = useState(isEdit ? (initial.notes || '') : '')
  const [saving, setSaving] = useState(false)
  const [recurring, setRecurring] = useState(false)
  const [recDay, setRecDay] = useState(new Date().getDate())

  async function handleSubmit(e) {
    e.preventDefault()
    if (!title.trim()) return
    setSaving(true)
    const data = { title: title.trim(), deadline, category, priority, notes, completed: isEdit ? initial.completed : false }
    if (isEdit) {
      await update(initial.id, data)
    } else {
      await add(data)
      if (recurring) {
        await addRecurring({
          kind: 'task', frequency: 'monthly', dayOfMonth: recDay,
          title: title.trim(), category, priority, notes,
          active: true, lastGenerated: deadline ? deadline.slice(0, 7) : new Date().toISOString().slice(0, 7),
        })
      }
    }
    onClose()
  }

  async function handleDelete() {
    if (!confirm('Eliminare questo impegno?')) return
    await remove(initial.id)
    onClose()
  }

  return (
    <Sheet onClose={onClose}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#f1f1f8', letterSpacing: '-0.02em' }}>
          {isEdit ? 'Modifica impegno' : 'Nuovo impegno'}
        </h2>
        <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.07)', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', color: 'rgba(241,241,248,0.5)', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
      </div>

      {parsed && (
        <div style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: '0.875rem', padding: '0.625rem 0.875rem', marginBottom: '1rem', fontSize: '0.8rem', color: '#a5b4fc' }}>
          🎤 <em>"{initial.voice}"</em>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <Field label="Titolo *">
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Es. Chiamare il medico" autoFocus />
        </Field>

        <Field label="Scadenza">
          <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} />
        </Field>

        <Field label="Categoria">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {CATEGORIES.map(c => {
              const s = CAT_COLORS[c]
              const active = category === c
              return (
                <button key={c} type="button" onClick={() => setCategory(c)} style={{
                  padding: '0.375rem 0.875rem', borderRadius: '999px',
                  border: `1.5px solid ${active ? s.color : 'rgba(255,255,255,0.1)'}`,
                  background: active ? s.bg : 'transparent',
                  color: active ? s.color : 'rgba(241,241,248,0.45)',
                  cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
                  transition: 'all 0.15s',
                }}>{c}</button>
              )
            })}
          </div>
        </Field>

        <Field label="Priorità">
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {PRIORITIES.map(p => {
              const s = PRI[p]
              const active = priority === p
              return (
                <button key={p} type="button" onClick={() => setPriority(p)} style={{
                  flex: 1, padding: '0.625rem', borderRadius: '0.875rem',
                  border: `1.5px solid ${active ? s.color : 'rgba(255,255,255,0.1)'}`,
                  background: active ? s.bg : 'transparent',
                  color: active ? s.color : 'rgba(241,241,248,0.45)',
                  cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
                  transition: 'all 0.15s',
                }}>{s.label}</button>
              )
            })}
          </div>
        </Field>

        {!isEdit && (
          <Field label="Ricorrente">
            <button type="button" onClick={() => setRecurring(r => !r)} style={{
              width: '100%', padding: '0.75rem 1rem', borderRadius: '1rem', textAlign: 'left',
              border: `1.5px solid ${recurring ? 'rgba(124,58,237,0.5)' : 'rgba(255,255,255,0.1)'}`,
              background: recurring ? 'rgba(124,58,237,0.1)' : 'transparent',
              color: recurring ? '#c4b5fd' : 'rgba(241,241,248,0.45)',
              cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              transition: 'all 0.15s',
            }}>
              <span>🔄 Si ripete ogni mese</span>
              <span style={{
                width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                background: recurring ? '#7c3aed' : 'rgba(255,255,255,0.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.7rem', color: 'white', transition: 'all 0.15s',
              }}>{recurring ? '✓' : ''}</span>
            </button>
            {recurring && (
              <div style={{ marginTop: '0.625rem', display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', background: 'rgba(124,58,237,0.07)', borderRadius: '0.875rem', border: '1px solid rgba(124,58,237,0.15)' }}>
                <span style={{ fontSize: '0.85rem', color: 'rgba(241,241,248,0.6)', flex: 1 }}>Ogni mese il giorno</span>
                <input
                  type="number" min="1" max="31" value={recDay}
                  onChange={e => setRecDay(Math.max(1, Math.min(31, parseInt(e.target.value) || 1)))}
                  style={{ width: 64, textAlign: 'center', padding: '0.35rem 0.5rem', fontSize: '0.9rem', fontWeight: 700 }}
                />
              </div>
            )}
          </Field>
        )}

        <Field label="Note">
          <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Note aggiuntive..." rows={2} style={{ resize: 'vertical' }} />
        </Field>

        <div style={{ display: 'flex', gap: '0.625rem', marginTop: '0.25rem' }}>
          {isEdit && (
            <button type="button" onClick={handleDelete} style={{
              padding: '0 0.875rem', borderRadius: '0.875rem',
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
              color: '#f87171', cursor: 'pointer', fontSize: '1rem',
            }}>🗑</button>
          )}
          <button type="button" onClick={onClose} style={{
            flex: 1, padding: '0.875rem', borderRadius: '0.875rem',
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
            color: 'rgba(241,241,248,0.5)', cursor: 'pointer', fontWeight: 600,
          }}>Annulla</button>
          <button type="submit" disabled={saving || !title.trim()} style={{
            flex: 2, padding: '0.875rem', borderRadius: '0.875rem',
            background: saving ? 'rgba(124,58,237,0.5)' : 'linear-gradient(135deg, #7c3aed, #4f46e5)',
            border: 'none', color: 'white', cursor: 'pointer', fontWeight: 700,
            boxShadow: saving ? 'none' : '0 4px 14px rgba(124,58,237,0.35)',
            transition: 'all 0.2s',
          }}>{saving ? 'Salvo...' : isEdit ? 'Aggiorna' : 'Aggiungi'}</button>
        </div>
      </form>
    </Sheet>
  )
}

function Sheet({ children, onClose }) {
  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose() }} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      backdropFilter: 'blur(8px)', zIndex: 100,
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }}>
      <div style={{
        background: '#0e0e1a',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '1.75rem 1.75rem 0 0',
        width: '100%', maxWidth: 600, padding: '1.5rem',
        paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))',
        maxHeight: '92svh', overflowY: 'auto',
        animation: 'sheetUp 0.25s cubic-bezier(0.34,1.2,0.64,1)',
      }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.15)', margin: '-0.25rem auto 1.25rem' }} />
        <style>{`@keyframes sheetUp { from { transform: translateY(100%) } to { transform: translateY(0) } }`}</style>
        {children}
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(241,241,248,0.45)', marginBottom: '0.4rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </label>
      {children}
    </div>
  )
}
