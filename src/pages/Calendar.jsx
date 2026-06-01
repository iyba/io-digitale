import { useState, useMemo } from 'react'
import { useCollection } from '../hooks/useCollection'
import { format, parseISO, isToday, isSameDay, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths } from 'date-fns'
import { it } from 'date-fns/locale'

const CAT_COLORS = {
  Lavoro: '#818cf8', Casa: '#fb923c', Salute: '#4ade80',
  Famiglia: '#f472b6', Personale: '#c084fc', Altro: '#94a3b8',
}
const PRIORITY_COLORS = { alta: '#ef4444', media: '#f59e0b', bassa: '#4ade80' }
const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']

export default function Calendar({ user, onEdit, onNew }) {
  const { items: tasks, update } = useCollection('tasks', user.uid)
  const { items: expenses } = useCollection('expenses', user.uid)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState(new Date())

  // Build calendar grid: Mon-Sun rows
  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 })
    const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 })
    const days = []
    let d = start
    while (d <= end) {
      days.push(new Date(d))
      d = addDays(d, 1)
    }
    return days
  }, [currentMonth])

  // Index tasks by deadline date
  const tasksByDate = useMemo(() => {
    const map = {}
    tasks.forEach(t => {
      if (t.deadline) {
        const key = t.deadline
        if (!map[key]) map[key] = []
        map[key].push(t)
      }
    })
    return map
  }, [tasks])

  // Index expenses by date
  const expensesByDate = useMemo(() => {
    const map = {}
    expenses.forEach(e => {
      if (!map[e.date]) map[e.date] = []
      map[e.date].push(e)
    })
    return map
  }, [expenses])

  const selectedISO = toISO(selectedDay)
  const selectedTasks = tasksByDate[selectedISO] || []
  const selectedExpenses = expensesByDate[selectedISO] || []

  async function toggleComplete(task) {
    await update(task.id, { completed: !task.completed, completedAt: !task.completed ? new Date() : null })
  }

  const monthName = format(currentMonth, 'MMMM yyyy', { locale: it })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.5rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.03em', textTransform: 'capitalize' }}>
            {monthName}
          </h1>
          <p style={{ margin: '0.15rem 0 0', fontSize: '0.8rem', color: 'rgba(var(--text-rgb),0.4)' }}>
            {tasks.filter(t => !t.completed && t.deadline?.startsWith(format(currentMonth, 'yyyy-MM'))).length} impegni questo mese
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <NavBtn onClick={() => setCurrentMonth(m => subMonths(m, 1))}>‹</NavBtn>
          <button onClick={() => { setCurrentMonth(new Date()); setSelectedDay(new Date()) }}
            style={{ background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)', borderRadius: '0.625rem', padding: '0.4rem 0.75rem', color: '#c4b5fd', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600 }}>
            Oggi
          </button>
          <NavBtn onClick={() => setCurrentMonth(m => addMonths(m, 1))}>›</NavBtn>
        </div>
      </div>

      {/* Calendar grid */}
      <div style={{
        background: 'rgba(var(--surface-rgb),0.02)',
        border: '1px solid rgba(var(--surface-rgb),0.07)',
        borderRadius: '1.25rem',
        overflow: 'hidden',
      }}>
        {/* Weekday headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', borderBottom: '1px solid rgba(var(--surface-rgb),0.06)' }}>
          {WEEKDAYS.map(d => (
            <div key={d} style={{ textAlign: 'center', padding: '0.6rem 0', fontSize: '0.7rem', fontWeight: 700, color: 'rgba(var(--text-rgb),0.35)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)' }}>
          {calendarDays.map((day, i) => {
            const iso = toISO(day)
            const isCurrentMonth = day.getMonth() === currentMonth.getMonth()
            const isSelected = isSameDay(day, selectedDay)
            const isTodayDate = isToday(day)
            const dayTasks = tasksByDate[iso] || []
            const dayExpenses = expensesByDate[iso] || []
            const hasOverdue = dayTasks.some(t => !t.completed)
            const isWeekend = day.getDay() === 0 || day.getDay() === 6

            return (
              <div
                key={i}
                onClick={() => setSelectedDay(day)}
                style={{
                  minHeight: 52,
                  padding: '0.4rem',
                  cursor: 'pointer',
                  background: isSelected
                    ? 'rgba(124,58,237,0.18)'
                    : 'transparent',
                  borderBottom: '1px solid rgba(var(--surface-rgb),0.04)',
                  borderRight: i % 7 !== 6 ? '1px solid rgba(var(--surface-rgb),0.04)' : 'none',
                  transition: 'background 0.15s',
                  position: 'relative',
                }}
                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'rgba(var(--surface-rgb),0.03)' }}
                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}
              >
                {/* Day number */}
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <span style={{
                    width: 26, height: 26, borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.8rem', fontWeight: isTodayDate ? 800 : 400,
                    background: isTodayDate ? 'linear-gradient(135deg, #7c3aed, #4f46e5)' : 'transparent',
                    color: isTodayDate
                      ? 'white'
                      : isCurrentMonth
                        ? isWeekend ? 'rgba(var(--text-rgb),0.5)' : 'var(--text)'
                        : 'rgba(var(--text-rgb),0.2)',
                    boxShadow: isTodayDate ? '0 2px 8px rgba(124,58,237,0.5)' : 'none',
                  }}>
                    {day.getDate()}
                  </span>
                </div>

                {/* Dots */}
                {(dayTasks.length > 0 || dayExpenses.length > 0) && (
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 2, marginTop: 3, flexWrap: 'wrap' }}>
                    {dayTasks.slice(0, 3).map((t, j) => (
                      <span key={j} style={{
                        width: 5, height: 5, borderRadius: '50%',
                        background: t.completed ? 'rgba(var(--surface-rgb),0.2)' : (CAT_COLORS[t.category] || '#94a3b8'),
                        opacity: t.completed ? 0.5 : 1,
                      }} />
                    ))}
                    {dayExpenses.length > 0 && (
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'rgba(251,146,60,0.7)' }} />
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '0.875rem', flexWrap: 'wrap' }}>
        {Object.entries(CAT_COLORS).map(([cat, color]) => (
          <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem', color: 'rgba(var(--text-rgb),0.45)' }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, display: 'inline-block' }} />
            {cat}
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem', color: 'rgba(var(--text-rgb),0.45)' }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'rgba(251,146,60,0.7)', display: 'inline-block' }} />
          Spese
        </div>
      </div>

      {/* Selected day panel */}
      <div style={{
        background: 'rgba(var(--surface-rgb),0.02)',
        border: '1px solid rgba(var(--surface-rgb),0.07)',
        borderRadius: '1.25rem', overflow: 'hidden',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.875rem 1rem', borderBottom: '1px solid rgba(var(--surface-rgb),0.06)' }}>
          <p style={{ margin: 0, fontWeight: 700, fontSize: '0.875rem', color: 'var(--text)' }}>
            {format(selectedDay, 'EEEE d MMMM', { locale: it })}
            {isToday(selectedDay) && <span style={{ marginLeft: '0.5rem', background: 'rgba(124,58,237,0.2)', color: '#c4b5fd', borderRadius: '999px', padding: '0.1rem 0.5rem', fontSize: '0.7rem', fontWeight: 700 }}>Oggi</span>}
          </p>
          <button onClick={() => onNew(selectedISO)}
            style={{ background: 'none', border: 'none', color: '#a78bfa', cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem' }}>
            + Aggiungi
          </button>
        </div>

        {selectedTasks.length === 0 && selectedExpenses.length === 0 ? (
          <div style={{ padding: '1.5rem 1rem', textAlign: 'center', color: 'rgba(var(--text-rgb),0.25)', fontSize: '0.85rem' }}>
            Nessun impegno o spesa
          </div>
        ) : (
          <>
            {selectedTasks.map(t => (
              <DayTaskRow key={t.id} task={t} onEdit={() => onEdit(t)} onToggle={() => toggleComplete(t)} />
            ))}
            {selectedExpenses.map(e => (
              <DayExpenseRow key={e.id} expense={e} />
            ))}
          </>
        )}
      </div>
    </div>
  )
}

function DayTaskRow({ task, onEdit, onToggle }) {
  const cat = CAT_COLORS[task.category] || '#94a3b8'
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '0.75rem',
      padding: '0.75rem 1rem', borderBottom: '1px solid rgba(var(--surface-rgb),0.05)',
      opacity: task.completed ? 0.5 : 1,
      borderLeft: `3px solid ${task.completed ? 'rgba(var(--surface-rgb),0.1)' : cat}`,
    }}>
      <button onClick={e => { e.stopPropagation(); onToggle() }} style={{
        width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
        border: `2px solid ${task.completed ? '#4ade80' : 'rgba(var(--surface-rgb),0.2)'}`,
        background: task.completed ? '#4ade80' : 'transparent',
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {task.completed && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#052e16" strokeWidth="3.5"><polyline points="20 6 9 17 4 12"/></svg>}
      </button>
      <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={onEdit}>
        <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, color: 'var(--text)', textDecoration: task.completed ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {task.title}
        </p>
        <p style={{ margin: '0.1rem 0 0', fontSize: '0.72rem', color: 'rgba(var(--text-rgb),0.4)' }}>
          {task.category}
          {task.time ? ` · ${task.time}` : ''}
          {task.priority === 'alta' && <span style={{ color: '#f87171', marginLeft: '0.375rem' }}>· Alta</span>}
        </p>
      </div>
    </div>
  )
}

function DayExpenseRow({ expense }) {
  const icons = { Casa: '🏠', Cibo: '🍕', Moto: '🏍️', Macchina: '🚗', Personale: '🧴', Viaggi: '✈️', Svago: '🎭', Stipendio: '💼', Freelance: '💻', Investimenti: '📈', Regalo: '🎁', Rimborso: '↩️', Altro: '📦' }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', borderBottom: '1px solid rgba(var(--surface-rgb),0.05)', borderLeft: '3px solid rgba(251,146,60,0.5)' }}>
      <span style={{ fontSize: '1rem', flexShrink: 0 }}>{icons[expense.category] || '📦'}</span>
      <p style={{ flex: 1, margin: 0, fontSize: '0.875rem', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {expense.description || expense.category}
      </p>
      <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem', color: expense.type === 'entrata' ? '#4ade80' : '#fb923c', flexShrink: 0 }}>
        {expense.type === 'entrata' ? '+' : '-'}€{Number(expense.amount).toFixed(2)}
      </p>
    </div>
  )
}

function NavBtn({ onClick, children }) {
  return (
    <button onClick={onClick} style={{
      background: 'rgba(var(--surface-rgb),0.06)', border: '1px solid rgba(var(--surface-rgb),0.1)',
      borderRadius: '0.625rem', width: 34, height: 34,
      color: 'rgba(var(--text-rgb),0.7)', cursor: 'pointer', fontSize: '1.2rem',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {children}
    </button>
  )
}

function toISO(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
