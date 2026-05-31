import { useState } from 'react'
import { useCollection } from '../hooks/useCollection'
import { parseVoiceToExpense } from '../utils/voiceParser'

const CATS_SPESA = ['Casa', 'Cibo', 'Moto', 'Macchina', 'Personale', 'Viaggi', 'Svago', 'Altro']
const CATS_ENTRATA = ['Stipendio', 'Freelance', 'Investimenti', 'Regalo', 'Rimborso', 'Altro']

const CAT_STYLES = {
  Casa:         { icon: '🏠', color: '#818cf8', bg: 'rgba(129,140,248,0.15)' },
  Cibo:         { icon: '🍕', color: '#fb923c', bg: 'rgba(251,146,60,0.15)' },
  Moto:         { icon: '🏍️', color: '#f87171', bg: 'rgba(248,113,113,0.15)' },
  Macchina:     { icon: '🚗', color: '#60a5fa', bg: 'rgba(96,165,250,0.15)' },
  Personale:    { icon: '🧴', color: '#f472b6', bg: 'rgba(244,114,182,0.15)' },
  Viaggi:       { icon: '✈️', color: '#34d399', bg: 'rgba(52,211,153,0.15)' },
  Svago:        { icon: '🎭', color: '#c084fc', bg: 'rgba(192,132,252,0.15)' },
  Stipendio:    { icon: '💼', color: '#4ade80', bg: 'rgba(74,222,128,0.15)' },
  Freelance:    { icon: '💻', color: '#34d399', bg: 'rgba(52,211,153,0.15)' },
  Investimenti: { icon: '📈', color: '#fbbf24', bg: 'rgba(251,191,36,0.15)' },
  Regalo:       { icon: '🎁', color: '#f472b6', bg: 'rgba(244,114,182,0.15)' },
  Rimborso:     { icon: '↩️', color: '#60a5fa', bg: 'rgba(96,165,250,0.15)' },
  Altro:        { icon: '📦', color: '#94a3b8', bg: 'rgba(148,163,184,0.15)' },
}

export default function AddExpenseModal({ user, initial, onClose }) {
  const { add, update, remove } = useCollection('expenses', user.uid)
  const { add: addRecurring } = useCollection('recurring', user.uid)
  const isEdit = initial && typeof initial === 'object' && initial.id
  const parsed = initial?.voice ? parseVoiceToExpense(initial.voice) : null

  const [type, setType] = useState(isEdit ? initial.type : (parsed?.type || 'spesa'))
  const [amount, setAmount] = useState(isEdit ? String(initial.amount) : (parsed?.amount ? String(parsed.amount) : ''))
  const [category, setCategory] = useState(isEdit ? initial.category : (parsed?.category || 'Casa'))
  const [description, setDescription] = useState(isEdit ? (initial.description || '') : (parsed ? initial.voice : ''))
  const [date, setDate] = useState(isEdit ? initial.date : new Date().toISOString().split('T')[0])
  const [saving, setSaving] = useState(false)
  const [recurring, setRecurring] = useState(false)
  const [recDay, setRecDay] = useState(new Date().getDate())

  const cats = type === 'entrata' ? CATS_ENTRATA : CATS_SPESA

  async function handleSubmit(e) {
    e.preventDefault()
    if (!amount || isNaN(parseFloat(amount))) return
    setSaving(true)
    const data = { type, amount: parseFloat(amount), category, description: description.trim(), date }
    if (isEdit) {
      await update(initial.id, data)
    } else {
      await add(data)
      if (recurring) {
        await addRecurring({
          kind: 'expense', frequency: 'monthly', dayOfMonth: recDay,
          type, amount: parseFloat(amount), category, description: description.trim(),
          active: true, lastGenerated: date.slice(0, 7),
        })
      }
    }
    onClose()
  }

  async function handleDelete() {
    if (!confirm('Eliminare questa voce?')) return
    await remove(initial.id)
    onClose()
  }

  return (
    <Sheet onClose={onClose}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#f1f1f8', letterSpacing: '-0.02em' }}>
          {isEdit ? 'Modifica voce' : 'Nuova voce'}
        </h2>
        <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.07)', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', color: 'rgba(241,241,248,0.5)', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
      </div>

      {parsed && (
        <div style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: '0.875rem', padding: '0.625rem 0.875rem', marginBottom: '1rem', fontSize: '0.8rem', color: '#a5b4fc' }}>
          🎤 <em>"{initial.voice}"</em>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Type toggle */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {['spesa', 'entrata'].map(t => (
            <button key={t} type="button"
              onClick={() => { setType(t); setCategory(t === 'entrata' ? 'Stipendio' : 'Casa') }}
              style={{
                flex: 1, padding: '0.75rem', borderRadius: '1rem',
                border: `1.5px solid ${type === t ? (t === 'spesa' ? '#fb923c' : '#4ade80') : 'rgba(255,255,255,0.1)'}`,
                background: type === t ? (t === 'spesa' ? 'rgba(251,146,60,0.1)' : 'rgba(74,222,128,0.1)') : 'transparent',
                color: type === t ? (t === 'spesa' ? '#fb923c' : '#4ade80') : 'rgba(241,241,248,0.4)',
                cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem',
                transition: 'all 0.15s',
              }}>
              {t === 'spesa' ? '💸 Spesa' : '💰 Entrata'}
            </button>
          ))}
        </div>

        {/* Amount */}
        <div style={{ textAlign: 'center' }}>
          <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(241,241,248,0.45)', marginBottom: '0.4rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Importo (€) *
          </label>
          <input
            type="number" step="0.01" min="0" value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="0.00" autoFocus
            style={{ fontSize: '2rem', fontWeight: 800, textAlign: 'center', letterSpacing: '-0.03em' }}
          />
        </div>

        {/* Category */}
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(241,241,248,0.45)', marginBottom: '0.5rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Categoria
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
            {cats.map(c => {
              const s = CAT_STYLES[c] || CAT_STYLES.Altro
              const active = category === c
              return (
                <button key={c} type="button" onClick={() => setCategory(c)} style={{
                  padding: '0.75rem 0.25rem',
                  borderRadius: '0.875rem',
                  border: `1.5px solid ${active ? s.color : 'rgba(255,255,255,0.07)'}`,
                  background: active ? s.bg : 'rgba(255,255,255,0.03)',
                  cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem',
                  transition: 'all 0.15s',
                }}>
                  <span style={{ fontSize: '1.4rem', lineHeight: 1 }}>{s.icon}</span>
                  <span style={{ fontSize: '0.64rem', fontWeight: active ? 700 : 500, color: active ? s.color : 'rgba(241,241,248,0.35)', textAlign: 'center', lineHeight: 1.2 }}>{c}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(241,241,248,0.45)', marginBottom: '0.4rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Descrizione
          </label>
          <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Es. Supermercato Coop" />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(241,241,248,0.45)', marginBottom: '0.4rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Data
          </label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} />
        </div>

        {!isEdit && (
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(241,241,248,0.45)', marginBottom: '0.4rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Ricorrente
            </label>
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
          </div>
        )}

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
          <button type="submit" disabled={saving || !amount} style={{
            flex: 2, padding: '0.875rem', borderRadius: '0.875rem',
            background: saving ? 'rgba(124,58,237,0.5)' : 'linear-gradient(135deg, #7c3aed, #4f46e5)',
            border: 'none', color: 'white', cursor: 'pointer', fontWeight: 700,
            boxShadow: saving ? 'none' : '0 4px 14px rgba(124,58,237,0.35)',
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
        background: '#0e0e1a', border: '1px solid rgba(255,255,255,0.08)',
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
