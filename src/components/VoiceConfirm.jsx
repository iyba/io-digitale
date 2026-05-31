import { useEffect, useState, useRef } from 'react'

// Shows a 4-second auto-dismissing card confirming what was saved via voice.
// User can tap "Modifica" to open the full form, or "Annulla" to undo.
export default function VoiceConfirm({ parsed, onEdit, onUndo, onDone }) {
  const [progress, setProgress] = useState(100)
  const [dismissed, setDismissed] = useState(false)
  const intervalRef = useRef(null)
  const DURATION = 4000

  useEffect(() => {
    const start = Date.now()
    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - start
      const pct = Math.max(0, 100 - (elapsed / DURATION) * 100)
      setProgress(pct)
      if (pct === 0) {
        clearInterval(intervalRef.current)
        if (!dismissed) onDone()
      }
    }, 50)
    return () => clearInterval(intervalRef.current)
  }, [])

  function handleUndo() {
    clearInterval(intervalRef.current)
    setDismissed(true)
    onUndo()
  }

  function handleEdit() {
    clearInterval(intervalRef.current)
    setDismissed(true)
    onEdit()
  }

  const isExpense = parsed.kind === 'expense'
  const d = parsed.data

  return (
    <div style={{
      position: 'fixed',
      bottom: 'calc(5.5rem + env(safe-area-inset-bottom))',
      left: '50%', transform: 'translateX(-50%)',
      width: 'calc(100% - 2rem)', maxWidth: 380,
      background: '#0e0e1a',
      border: '1px solid rgba(124,58,237,0.35)',
      borderRadius: '1.25rem',
      boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(124,58,237,0.1)',
      zIndex: 70,
      overflow: 'hidden',
      animation: 'slideUp 0.3s cubic-bezier(0.34,1.2,0.64,1)',
    }}>
      <style>{`@keyframes slideUp { from{transform:translateX(-50%) translateY(20px);opacity:0} to{transform:translateX(-50%) translateY(0);opacity:1} }`}</style>

      {/* Progress bar */}
      <div style={{ height: 3, background: 'rgba(255,255,255,0.06)' }}>
        <div style={{
          height: '100%',
          width: `${progress}%`,
          background: 'linear-gradient(90deg, #7c3aed, #a78bfa)',
          transition: 'width 0.05s linear',
          borderRadius: '0 2px 2px 0',
        }} />
      </div>

      <div style={{ padding: '0.875rem 1rem' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.625rem' }}>
          <span style={{
            background: isExpense ? 'rgba(251,146,60,0.15)' : 'rgba(124,58,237,0.15)',
            border: `1px solid ${isExpense ? 'rgba(251,146,60,0.3)' : 'rgba(124,58,237,0.3)'}`,
            color: isExpense ? '#fb923c' : '#a78bfa',
            borderRadius: '999px', padding: '0.2rem 0.625rem',
            fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
          }}>
            {isExpense ? (d.type === 'entrata' ? '💰 Entrata' : '💸 Spesa') : '📋 Impegno'}
          </span>
          <span style={{ fontSize: '0.72rem', color: 'rgba(241,241,248,0.4)', marginLeft: 'auto' }}>
            ✅ Salvato
          </span>
        </div>

        {/* Content */}
        {isExpense ? (
          <div>
            <p style={{ margin: 0, fontWeight: 800, fontSize: '1.4rem', letterSpacing: '-0.03em', color: d.type === 'entrata' ? '#4ade80' : '#fb923c' }}>
              {d.type === 'entrata' ? '+' : '-'}€{d.amount?.toFixed(2)}
            </p>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: 'rgba(241,241,248,0.7)' }}>
              {d.description || d.category} · {d.date}
            </p>
          </div>
        ) : (
          <div>
            <p style={{ margin: 0, fontWeight: 700, fontSize: '1rem', color: '#f1f1f8', letterSpacing: '-0.01em' }}>
              {d.title}
            </p>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.82rem', color: 'rgba(241,241,248,0.5)' }}>
              {d.category}
              {d.deadline ? ` · ${formatDateIT(d.deadline)}` : ''}
              {d.time ? ` alle ${d.time}` : ''}
            </p>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
          <button onClick={handleUndo} style={{
            flex: 1, padding: '0.5rem', borderRadius: '0.75rem',
            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
            color: '#f87171', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
          }}>
            Annulla
          </button>
          <button onClick={handleEdit} style={{
            flex: 2, padding: '0.5rem', borderRadius: '0.75rem',
            background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.25)',
            color: '#c4b5fd', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
          }}>
            ✏️ Modifica
          </button>
        </div>
      </div>
    </div>
  )
}

function formatDateIT(isoDate) {
  if (!isoDate) return ''
  const d = new Date(isoDate + 'T00:00:00')
  const months = ['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic']
  const days = ['dom','lun','mar','mer','gio','ven','sab']
  return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`
}
