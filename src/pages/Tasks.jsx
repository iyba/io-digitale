import { useState, useMemo } from 'react'
import { useCollection } from '../hooks/useCollection'
import { format, parseISO, isPast, isToday, isTomorrow, isThisWeek } from 'date-fns'
import { it } from 'date-fns/locale'

const CAT_COLORS = {
  Lavoro: { border: '#818cf8', bg: 'rgba(129,140,248,0.1)', color: '#818cf8' },
  Casa: { border: '#fb923c', bg: 'rgba(251,146,60,0.1)', color: '#fb923c' },
  Salute: { border: '#4ade80', bg: 'rgba(74,222,128,0.1)', color: '#4ade80' },
  Famiglia: { border: '#f472b6', bg: 'rgba(244,114,182,0.1)', color: '#f472b6' },
  Personale: { border: '#c084fc', bg: 'rgba(192,132,252,0.1)', color: '#c084fc' },
  Altro: { border: '#94a3b8', bg: 'rgba(148,163,184,0.1)', color: '#94a3b8' },
}

const PRIORITY_STYLE = {
  alta: { bg: 'rgba(239,68,68,0.12)', color: '#f87171', label: 'Alta' },
  media: { bg: 'rgba(245,158,11,0.12)', color: '#fbbf24', label: 'Media' },
  bassa: { bg: 'rgba(34,197,94,0.12)', color: '#4ade80', label: 'Bassa' },
}

const FILTERS = ['Tutti', 'Oggi', 'Settimana', 'Scaduti', 'Completati']

export default function Tasks({ user, onNew, onEdit }) {
  const { items: tasks, update } = useCollection('tasks', user.uid)
  const [filter, setFilter] = useState('Tutti')
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    let list = tasks
    if (search) list = list.filter(t => t.title.toLowerCase().includes(search.toLowerCase()))
    switch (filter) {
      case 'Oggi': return list.filter(t => !t.completed && t.deadline && isToday(parseISO(t.deadline)))
      case 'Settimana': return list.filter(t => !t.completed && t.deadline && isThisWeek(parseISO(t.deadline), { locale: it }))
      case 'Scaduti': return list.filter(t => !t.completed && t.deadline && isPast(parseISO(t.deadline)) && !isToday(parseISO(t.deadline)))
      case 'Completati': return list.filter(t => t.completed)
      default: return list.filter(t => !t.completed)
    }
  }, [tasks, filter, search])

  async function toggleComplete(task) {
    await update(task.id, { completed: !task.completed, completedAt: !task.completed ? new Date() : null })
  }

  const pendingCount = tasks.filter(t => !t.completed).length
  const overdueCount = tasks.filter(t => !t.completed && t.deadline && isPast(parseISO(t.deadline)) && !isToday(parseISO(t.deadline))).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', paddingTop: '0.5rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.03em' }}>Impegni</h1>
          <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: 'rgba(var(--text-rgb),0.4)' }}>
            {pendingCount} da completare
            {overdueCount > 0 && <span style={{ color: '#f87171', marginLeft: '0.5rem' }}>· {overdueCount} scaduti</span>}
          </p>
        </div>
        <button onClick={onNew} style={{
          background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
          border: 'none', borderRadius: '0.875rem', padding: '0.625rem 1rem',
          color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: '0.875rem',
          boxShadow: '0 4px 14px rgba(124,58,237,0.4)',
        }}>
          + Nuovo
        </button>
      </div>

      {/* Search */}
      <div style={{ position: 'relative' }}>
        <span style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(var(--text-rgb),0.3)', pointerEvents: 'none', fontSize: '0.9rem' }}>🔍</span>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Cerca impegni..."
          style={{ paddingLeft: '2.5rem' }}
        />
      </div>

      {/* Filter chips */}
      <div style={{ display: 'flex', gap: '0.375rem', overflowX: 'auto', paddingBottom: '0.125rem' }}>
        {FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '0.4rem 1rem', borderRadius: '999px', whiteSpace: 'nowrap',
            border: `1.5px solid ${filter === f ? '#7c3aed' : 'rgba(var(--surface-rgb),0.1)'}`,
            background: filter === f ? 'rgba(124,58,237,0.15)' : 'transparent',
            color: filter === f ? '#c4b5fd' : 'rgba(var(--text-rgb),0.4)',
            cursor: 'pointer', fontSize: '0.8rem', fontWeight: filter === f ? 600 : 400,
            transition: 'all 0.15s',
          }}>
            {f}
          </button>
        ))}
      </div>

      {/* Task list */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
          <p style={{ fontSize: '2.5rem', margin: '0 0 0.5rem' }}>
            {filter === 'Completati' ? '🏆' : filter === 'Scaduti' ? '🎉' : '✨'}
          </p>
          <p style={{ margin: 0, color: 'rgba(var(--text-rgb),0.3)', fontSize: '0.9rem' }}>
            {filter === 'Completati' ? 'Nessun task completato' : filter === 'Scaduti' ? 'Nessun task scaduto!' : 'Nessun impegno qui'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {filtered.map(t => (
            <TaskCard key={t.id} task={t} onEdit={() => onEdit(t)} onToggle={() => toggleComplete(t)} />
          ))}
        </div>
      )}
    </div>
  )
}

function TaskCard({ task, onEdit, onToggle }) {
  const deadline = task.deadline ? parseISO(task.deadline) : null
  const isOver = deadline && isPast(deadline) && !isToday(deadline) && !task.completed
  const isTod = deadline && isToday(deadline)
  const isTom = deadline && isTomorrow(deadline)
  const cat = CAT_COLORS[task.category] || CAT_COLORS.Altro
  const pri = PRIORITY_STYLE[task.priority] || PRIORITY_STYLE.media

  let dateText = deadline ? format(deadline, 'd MMM', { locale: it }) : ''
  let dateColor = 'rgba(var(--text-rgb),0.3)'
  if (isTod) { dateText = 'Oggi'; dateColor = '#fb923c' }
  else if (isTom) { dateText = 'Domani'; dateColor = '#fbbf24' }
  else if (isOver) { dateColor = '#f87171' }

  return (
    <div style={{
      background: 'rgba(var(--surface-rgb),0.03)',
      border: `1px solid ${isOver ? 'rgba(248,113,113,0.25)' : 'rgba(var(--surface-rgb),0.07)'}`,
      borderLeft: `3px solid ${isOver ? '#ef4444' : task.completed ? 'rgba(var(--surface-rgb),0.1)' : cat.border}`,
      borderRadius: '1rem',
      padding: '0.875rem 1rem',
      display: 'flex', gap: '0.875rem', alignItems: 'flex-start',
      opacity: task.completed ? 0.45 : 1,
      transition: 'all 0.2s',
    }}>
      {/* Checkbox */}
      <button
        onClick={(e) => { e.stopPropagation(); onToggle() }}
        style={{
          width: 22, height: 22, borderRadius: '50%', flexShrink: 0, marginTop: 1,
          border: `2px solid ${task.completed ? '#4ade80' : 'rgba(var(--surface-rgb),0.2)'}`,
          background: task.completed ? '#4ade80' : 'transparent',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.2s',
        }}
      >
        {task.completed && (
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#052e16" strokeWidth="3.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </button>

      {/* Content */}
      <div style={{ flex: 1, cursor: 'pointer', minWidth: 0 }} onClick={onEdit}>
        <p style={{
          margin: 0, fontWeight: 600, fontSize: '0.9rem',
          color: task.completed ? 'rgba(var(--text-rgb),0.4)' : 'var(--text)',
          textDecoration: task.completed ? 'line-through' : 'none',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          letterSpacing: '-0.01em',
        }}>
          {task.title}
        </p>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.375rem', flexWrap: 'wrap' }}>
          <span style={{
            fontSize: '0.7rem', fontWeight: 600, color: cat.color,
            background: cat.bg, padding: '0.15rem 0.5rem', borderRadius: '999px',
          }}>
            {task.category}
          </span>
          {task.priority !== 'media' && (
            <span style={{
              fontSize: '0.7rem', fontWeight: 600, color: pri.color,
              background: pri.bg, padding: '0.15rem 0.5rem', borderRadius: '999px',
            }}>
              {pri.label}
            </span>
          )}
          {deadline && (
            <span style={{ fontSize: '0.73rem', color: dateColor, fontWeight: isOver ? 700 : 400, marginLeft: 'auto' }}>
              {isOver && '⚠ '}{dateText}{task.time ? ` · ${task.time}` : ''}
            </span>
          )}
        </div>

        {task.notes && (
          <p style={{ margin: '0.375rem 0 0', fontSize: '0.78rem', color: 'rgba(var(--text-rgb),0.35)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {task.notes}
          </p>
        )}
      </div>
    </div>
  )
}
