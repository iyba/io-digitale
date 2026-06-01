import { useMemo } from 'react'
import { useCollection } from '../hooks/useCollection'
import { useWeather, WMO, outdoorAlert } from '../hooks/useWeather'
import { format, isToday, isPast, parseISO } from 'date-fns'
import { it } from 'date-fns/locale'

const CAT_COLORS = {
  Lavoro: '#818cf8', Casa: '#fb923c', Salute: '#4ade80',
  Famiglia: '#f472b6', Personale: '#c084fc', Altro: '#94a3b8',
}

const EXP_ICONS = {
  Casa: '🏠', Cibo: '🍕', Moto: '🏍️', Macchina: '🚗', Personale: '🧴',
  Viaggi: '✈️', Svago: '🎭', Stipendio: '💼', Freelance: '💻',
  Investimenti: '📈', Regalo: '🎁', Rimborso: '↩️', Altro: '📦',
}

export default function Dashboard({ user, onNewTask, onNewExpense, onEditTask, onEditExpense, onSignOut }) {
  const { items: tasks, update: updateTask } = useCollection('tasks', user.uid)
  const { items: expenses } = useCollection('expenses', user.uid)
  const { weather, status: weatherStatus, requestWeather } = useWeather()

  const now = new Date()
  const hour = now.getHours()
  const greeting = hour < 12 ? 'Buongiorno' : hour < 18 ? 'Buon pomeriggio' : 'Buonasera'
  const name = user.displayName?.split(' ')[0] || ''

  const overdueTasks = useMemo(() =>
    tasks.filter(t => !t.completed && t.deadline && isPast(parseISO(t.deadline)) && !isToday(parseISO(t.deadline)))
      .sort((a, b) => a.deadline.localeCompare(b.deadline)),
    [tasks])

  const todayTasks = useMemo(() =>
    tasks.filter(t => !t.completed && t.deadline && isToday(parseISO(t.deadline))),
    [tasks])

  const focusTasks = useMemo(() => [...overdueTasks, ...todayTasks], [overdueTasks, todayTasks])

  const upcomingTasks = useMemo(() => {
    const todayISO = now.toISOString().slice(0, 10)
    return tasks
      .filter(t => !t.completed && t.deadline && t.deadline > todayISO)
      .sort((a, b) => a.deadline.localeCompare(b.deadline))
      .slice(0, 5)
  }, [tasks])

  const recentExpenses = useMemo(() =>
    [...expenses].sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 4),
    [expenses])

  const pendingCount = tasks.filter(t => !t.completed).length
  const completedCount = tasks.filter(t => t.completed).length

  const monthExpenses = useMemo(() => {
    const m = now.getMonth(), y = now.getFullYear()
    return expenses.filter(e => { const d = new Date(e.date); return d.getMonth() === m && d.getFullYear() === y })
  }, [expenses])
  const monthSpend = monthExpenses.filter(e => e.type === 'spesa').reduce((s, e) => s + e.amount, 0)
  const monthIncome = monthExpenses.filter(e => e.type === 'entrata').reduce((s, e) => s + e.amount, 0)
  const saldo = monthIncome - monthSpend

  const wCurrent = weather ? (WMO[weather.current.code] ?? WMO[0]) : null
  const alert = weather ? outdoorAlert(weather.current.code, weather.today.rainProb) : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

      {/* Hero */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(79,46,220,0.22) 0%, rgba(124,58,237,0.12) 60%, transparent 100%)',
        borderRadius: '1.5rem', border: '1px solid rgba(124,58,237,0.2)',
        padding: '1.125rem', marginTop: '0.25rem', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -50, right: -30, width: 130, height: 130, borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.3), transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative' }}>
          <div>
            <p style={{ margin: 0, color: 'rgba(var(--text-rgb),0.45)', fontSize: '0.76rem', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 500 }}>
              {format(now, 'EEEE, d MMMM', { locale: it })}
            </p>
            <h1 style={{ margin: '0.2rem 0 0', fontSize: '1.5rem', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }}>
              {greeting}{name ? `, ${name}` : ''} 👋
            </h1>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
            <button onClick={onSignOut} style={{
              background: 'rgba(var(--surface-rgb),0.08)', border: '1px solid var(--border)',
              borderRadius: '0.75rem', padding: '0.35rem 0.7rem', color: 'rgba(var(--text-rgb),0.45)',
              cursor: 'pointer', fontSize: '0.72rem', fontWeight: 500,
            }}>Esci</button>

            {/* Mini meteo */}
            {weatherStatus === 'ok' && weather ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.82rem', color: 'rgba(var(--text-rgb),0.7)', fontWeight: 600 }}>
                <span style={{ fontSize: '1rem' }}>{wCurrent.icon}</span>
                {weather.current.temp}°
                {weather.today.rainProb >= 40 && <span style={{ color: '#fbbf24', fontSize: '0.72rem' }}>· 🌧️{weather.today.rainProb}%</span>}
              </div>
            ) : (weatherStatus === 'idle' || weatherStatus === 'denied') ? (
              <button onClick={requestWeather} style={{ background: 'none', border: 'none', color: 'rgba(var(--text-rgb),0.4)', fontSize: '0.72rem', cursor: 'pointer', padding: 0 }}>
                📍 Meteo
              </button>
            ) : null}
          </div>
        </div>

        {/* Mini stats */}
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', position: 'relative' }}>
          <MiniStat value={pendingCount} label="da fare" color="#a78bfa" />
          <Sep />
          <MiniStat value={completedCount} label="completati" color="#4ade80" />
          <Sep />
          <MiniStat value={`€${saldo.toFixed(0)}`} label="saldo mese" color={saldo >= 0 ? '#4ade80' : '#ef4444'} />
        </div>

        {/* Avviso meteo (solo se pioggia — utile per attività all'aperto) */}
        {alert && alert.level === 'bad' && (
          <div style={{ marginTop: '0.75rem', position: 'relative', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.22)', borderRadius: '0.75rem', padding: '0.5rem 0.75rem' }}>
            <p style={{ margin: 0, fontSize: '0.78rem', color: '#fca5a5', fontWeight: 500 }}>{alert.msg}</p>
          </div>
        )}
      </div>

      {/* OGGI */}
      <SectionCard
        icon="🎯" title="Oggi"
        badge={focusTasks.length || null}
        action="+ Impegno" onAction={onNewTask}
      >
        {focusTasks.length === 0 ? (
          <Empty icon="✅" text="Nessun impegno per oggi — ottimo!" />
        ) : (
          focusTasks.map(t => (
            <FocusRow key={t.id} task={t}
              onCheck={() => updateTask(t.id, { completed: true })}
              onEdit={() => onEditTask(t)} />
          ))
        )}
      </SectionCard>

      {/* PROSSIMI */}
      {upcomingTasks.length > 0 && (
        <SectionCard icon="📆" title="Prossimi impegni">
          {upcomingTasks.map(t => <UpcomingRow key={t.id} task={t} onClick={() => onEditTask(t)} />)}
        </SectionCard>
      )}

      {/* SPESE RECENTI */}
      <SectionCard icon="💸" title="Spese recenti" action="+ Spesa" onAction={onNewExpense}>
        {recentExpenses.length === 0 ? (
          <Empty icon="🧾" text="Nessuna spesa registrata" />
        ) : (
          recentExpenses.map(e => <ExpenseRow key={e.id} expense={e} onClick={() => onEditExpense(e)} />)
        )}
      </SectionCard>

      {/* QUICK ACTIONS */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
        <QuickBtn icon="📋" label="Impegno" sub="Aggiungi task" glow="rgba(124,58,237,0.3)" onClick={onNewTask} />
        <QuickBtn icon="💸" label="Spesa" sub="Registra spesa" glow="rgba(234,88,12,0.3)" onClick={onNewExpense} />
      </div>

    </div>
  )
}

function MiniStat({ value, label, color }) {
  return (
    <div style={{ flex: 1, textAlign: 'center' }}>
      <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color, letterSpacing: '-0.02em' }}>{value}</p>
      <p style={{ margin: '0.1rem 0 0', fontSize: '0.64rem', color: 'rgba(var(--text-rgb),0.35)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500 }}>{label}</p>
    </div>
  )
}

function Sep() {
  return <div style={{ width: 1, background: 'var(--border)' }} />
}

function SectionCard({ icon, title, badge, action, onAction, children }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '1.25rem', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.875rem 1rem 0.75rem', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.9rem' }}>{icon}</span>
          <p style={{ margin: 0, fontWeight: 700, fontSize: '0.875rem', color: 'var(--text)' }}>{title}</p>
          {badge != null && (
            <span style={{ background: 'rgba(167,139,250,0.18)', color: '#a78bfa', borderRadius: '0.5rem', padding: '0.08rem 0.4rem', fontSize: '0.68rem', fontWeight: 700 }}>{badge}</span>
          )}
        </div>
        {action && (
          <button onClick={onAction} style={{ background: 'none', border: 'none', color: '#a78bfa', cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem' }}>{action}</button>
        )}
      </div>
      {children}
    </div>
  )
}

function FocusRow({ task, onCheck, onEdit }) {
  const deadline = task.deadline ? parseISO(task.deadline) : null
  const isOver = deadline && isPast(deadline) && !isToday(deadline)
  const isTod = deadline && isToday(deadline)
  const col = CAT_COLORS[task.category] || CAT_COLORS.Altro
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)' }}>
      <button onClick={e => { e.stopPropagation(); onCheck() }} style={{
        width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
        border: `2px solid ${isOver ? '#ef4444' : isTod ? '#fb923c' : col}`,
        background: 'transparent', cursor: 'pointer', padding: 0,
      }} />
      <div onClick={onEdit} style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}>
        <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</p>
        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', marginTop: '0.12rem' }}>
          <span style={{ fontSize: '0.67rem', color: 'rgba(var(--text-rgb),0.35)' }}>{task.category}</span>
          {isOver && <span style={{ fontSize: '0.65rem', color: '#ef4444', fontWeight: 700 }}>• Scaduto</span>}
          {isTod && <span style={{ fontSize: '0.65rem', color: '#fb923c', fontWeight: 700 }}>• Oggi</span>}
        </div>
      </div>
    </div>
  )
}

function UpcomingRow({ task, onClick }) {
  const deadline = task.deadline ? parseISO(task.deadline) : null
  const col = CAT_COLORS[task.category] || CAT_COLORS.Altro
  return (
    <div onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.7rem 1rem', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: col, flexShrink: 0 }} />
      <span style={{ flex: 1, fontSize: '0.875rem', color: 'var(--text)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</span>
      <span style={{ fontSize: '0.73rem', fontWeight: 600, color: 'rgba(var(--text-rgb),0.45)', flexShrink: 0 }}>
        {deadline ? format(deadline, 'd MMM', { locale: it }) : ''}
      </span>
    </div>
  )
}

function ExpenseRow({ expense, onClick }) {
  return (
    <div onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', padding: '0.7rem 1rem', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}>
      <div style={{
        width: 34, height: 34, borderRadius: '0.625rem', flexShrink: 0,
        background: expense.type === 'entrata' ? 'rgba(16,185,129,0.12)' : 'rgba(251,146,60,0.12)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem',
      }}>
        {EXP_ICONS[expense.category] || '📦'}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {expense.description || expense.category}
        </p>
        <p style={{ margin: '0.1rem 0 0', fontSize: '0.7rem', color: 'rgba(var(--text-rgb),0.35)' }}>{expense.category} · {expense.date}</p>
      </div>
      <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem', color: expense.type === 'entrata' ? '#4ade80' : '#fb923c', flexShrink: 0 }}>
        {expense.type === 'entrata' ? '+' : '-'}€{Number(expense.amount).toFixed(2)}
      </p>
    </div>
  )
}

function Empty({ icon, text }) {
  return (
    <div style={{ padding: '1.75rem 1rem', textAlign: 'center' }}>
      <p style={{ margin: '0 0 0.375rem', fontSize: '1.4rem' }}>{icon}</p>
      <p style={{ margin: 0, color: 'rgba(var(--text-rgb),0.3)', fontSize: '0.85rem' }}>{text}</p>
    </div>
  )
}

function QuickBtn({ icon, label, sub, glow, onClick }) {
  return (
    <button onClick={onClick} style={{
      background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '1.125rem',
      padding: '1rem 0.875rem', cursor: 'pointer', textAlign: 'left', position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', bottom: -10, right: -10, width: 50, height: 50, borderRadius: '50%', background: glow, filter: 'blur(16px)', pointerEvents: 'none' }} />
      <p style={{ margin: '0 0 0.3rem', fontSize: '1.3rem' }}>{icon}</p>
      <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 700, color: 'var(--text)' }}>{label}</p>
      <p style={{ margin: '0.1rem 0 0', fontSize: '0.7rem', color: 'rgba(var(--text-rgb),0.35)' }}>{sub}</p>
    </button>
  )
}
