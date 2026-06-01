import { useState } from 'react'
import Tasks from './Tasks'
import Calendar from './Calendar'

export default function Impegni({ user, onNew, onEdit, onNewOnDate }) {
  const [view, setView] = useState('lista')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Toggle Lista / Calendario */}
      <div style={{
        display: 'flex', gap: '0.25rem', padding: '0.25rem',
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: '0.875rem', marginTop: '0.25rem',
      }}>
        {[
          { id: 'lista', label: '📋 Lista' },
          { id: 'calendario', label: '📅 Calendario' },
        ].map(v => {
          const active = view === v.id
          return (
            <button key={v.id} onClick={() => setView(v.id)} style={{
              flex: 1, padding: '0.55rem', borderRadius: '0.625rem', border: 'none',
              background: active ? 'linear-gradient(135deg, #7c3aed, #4f46e5)' : 'transparent',
              color: active ? 'white' : 'rgba(var(--text-rgb),0.5)',
              fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
              transition: 'all 0.15s',
            }}>
              {v.label}
            </button>
          )
        })}
      </div>

      {view === 'lista'
        ? <Tasks user={user} onNew={onNew} onEdit={onEdit} />
        : <Calendar user={user} onNew={onNewOnDate} onEdit={onEdit} />}
    </div>
  )
}
