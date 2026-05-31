import { useMemo } from 'react'
import { useCollection } from '../hooks/useCollection'
import { format, isToday, isTomorrow, isPast, parseISO } from 'date-fns'
import { it } from 'date-fns/locale'

const CAT_COLORS = {
  Lavoro: { bg: 'rgba(129,140,248,0.15)', color: '#818cf8', dot: '#818cf8' },
  Casa: { bg: 'rgba(251,146,60,0.15)', color: '#fb923c', dot: '#fb923c' },
  Salute: { bg: 'rgba(74,222,128,0.15)', color: '#4ade80', dot: '#4ade80' },
  Famiglia: { bg: 'rgba(244,114,182,0.15)', color: '#f472b6', dot: '#f472b6' },
  Personale: { bg: 'rgba(192,132,252,0.15)', color: '#c084fc', dot: '#c084fc' },
  Altro: { bg: 'rgba(148,163,184,0.15)', color: '#94a3b8', dot: '#94a3b8' },
}

const CAT_ICONS = {
  Cibo: '🍕', Casa: '🏠', Trasporti: '🚗', Salute: '💊',
  Abbigliamento: '👕', Intrattenimento: '🎬', Tecnologia: '💻',
  Stipendio: '💼', Freelance: '🖥️', Regalo: '🎁', Rimborso: '↩️', Altro: '📦',
}

export default function Dashboard({ user, onNewTask, onNewExpense, onEditTask, onEditExpense, onSignOut }) {
  const { items: tasks } = useCollection('tasks', user.uid)
  const { items: expenses } = useCollection('expenses', user.uid)

  const now = new Date()
  const hour = now.getHours()
  const greeting = hour < 12 ? 'Buongiorno' : hour < 18 ? 'Buon pomeriggio' : 'Buonasera'
  const name = user.displayName?.split(' ')[0] || ''

  const upcomingTasks = useMemo(() =>
    tasks.filter(t => !t.completed && t.deadline)
      .sort((a, b) => a.deadline.localeCompare(b.deadline))
      .slice(0, 5),
    [tasks]
  )

  const overdueTasks = useMemo(() =>
    tasks.filter(t => !t.completed && t.deadline && isPast(parseISO(t.deadline)) && !isToday(parseISO(t.deadline))),
    [tasks]
  )

  const monthExpenses = useMemo(() => {
    const m = now.getMonth(), y = now.getFullYear()
    return expenses.filter(e => { const d = new Date(e.date); return d.getMonth() === m && d.getFullYear() === y })
  }, [expenses])

  const monthSpend = monthExpenses.filter(e => e.type === 'spesa').reduce((s, e) => s + e.amount, 0)
  const monthIncome = monthExpenses.filter(e => e.type === 'entrata').reduce((s, e) => s + e.amount, 0)
  const pendingCount = tasks.filter(t => !t.completed).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* Header hero */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(124,58,237,0.2) 0%, rgba(79,70,229,0.1) 50%, transparent 100%)',
        borderRadius: '1.5rem',
        border: '1px solid rgba(124,58,237,0.2)',
        padding: '1.25rem',
        marginTop: '0.25rem',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -40, right: -40, width: 120, height: 120, borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.3), transparent)', pointerEvents: 'none' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <p style={{ margin: 0, color: 'rgba(241,241,248,0.5)', fontSize: '0.8rem', letterSpacing: '0.05em', textTransform: 'uppercase', fontWeight: 500 }}>
              {format(now, 'EEEE, d MMMM', { locale: it })}
            </p>
            <h1 style={{ margin: '0.3rem 0 0', fontSize: '1.6rem', fontWeight: 800, color: '#f1f1f8', letterSpacing: '-0.02em' }}>
              {greeting}{name ? `, ${name}` : ''} 👋
            </h1>
          </div>
          <button onClick={onSignOut} style={{
            background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '0.875rem', padding: '0.5rem 0.875rem', color: 'rgba(241,241,248,0.5)',
            cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500,
          }}>
            Esci
          </button>
        </div>

        {overdueTasks.length > 0 && (
          <div onClick={() => onEditTask(overdueTasks[0])} style={{
            marginTop: '1rem', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)',
            borderRadius: '0.875rem', padding: '0.75rem 1rem', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '0.625rem',
          }}>
            <span style={{ fontSize: '1rem' }}>⚠️</span>
            <p style={{ margin: 0, color: '#fca5a5', fontSize: '0.85rem', fontWeight: 600 }}>
              {overdueTasks.length} impegn{overdueTasks.length > 1 ? 'i scaduti' : 'o scaduto'}
              <span style={{ fontWeight: 400, opacity: 0.8 }}> — {overdueTasks[0].title}</span>
            </p>
          </div>
        )}
      </div>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
        <GradientCard
          value={pendingCount}
          label="Da fare"
          gradient="linear-gradient(135deg, #4f46e5, #7c3aed)"
          glow="rgba(124,58,237,0.3)"
          icon="📋"
        />
        <GradientCard
          value={`€${monthSpend.toFixed(0)}`}
          label="Spese"
          gradient="linear-gradient(135deg, #ea580c, #f97316)"
          glow="rgba(234,88,12,0.3)"
          icon="💸"
        />
        <GradientCard
          value={`€${monthIncome.toFixed(0)}`}
          label="Entrate"
          gradient="linear-gradient(135deg, #059669, #10b981)"
          glow="rgba(5,150,105,0.3)"
          icon="💰"
        />
      </div>

      {/* Upcoming tasks */}
      <SectionCard title="Prossimi impegni" action="+ Nuovo" onAction={onNewTask}>
        {upcomingTasks.length === 0 ? (
          <EmptyState icon="✅" text="Nessun impegno in programma" />
        ) : (
          upcomingTasks.map(t => <UpcomingTaskRow key={t.id} task={t} onClick={() => onEditTask(t)} />)
        )}
      </SectionCard>

      {/* Recent expenses */}
      <SectionCard title="Spese recenti" action="+ Nuova" onAction={onNewExpense}>
        {expenses.length === 0 ? (
          <EmptyState icon="💸" text="Nessuna spesa registrata" />
        ) : (
          expenses.slice(0, 4).map(e => <ExpenseRow key={e.id} expense={e} onClick={() => onEditExpense(e)} />)
        )}
      </SectionCard>

      {/* Monthly balance */}
      {(monthIncome > 0 || monthSpend > 0) && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(15,15,35,0.9), rgba(20,20,45,0.9))',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '1.25rem', padding: '1.125rem',
        }}>
          <p style={{ margin: '0 0 0.875rem', fontSize: '0.7rem', color: 'rgba(241,241,248,0.4)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Riepilogo {format(now, 'MMMM', { locale: it })}
          </p>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <BalanceItem value={`+€${monthIncome.toFixed(2)}`} label="Entrate" color="#4ade80" />
            <div style={{ width: 1, background: 'rgba(255,255,255,0.07)' }} />
            <BalanceItem value={`-€${monthSpend.toFixed(2)}`} label="Uscite" color="#fb923c" />
            <div style={{ width: 1, background: 'rgba(255,255,255,0.07)' }} />
            <BalanceItem
              value={`${monthIncome - monthSpend >= 0 ? '+' : ''}€${(monthIncome - monthSpend).toFixed(2)}`}
              label="Saldo"
              color={monthIncome - monthSpend >= 0 ? '#4ade80' : '#ef4444'}
            />
          </div>
        </div>
      )}
    </div>
  )
}

function GradientCard({ value, label, gradient, glow, icon }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '1.125rem',
      padding: '0.875rem 0.75rem',
      textAlign: 'center',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', inset: 0, background: gradient, opacity: 0.08, borderRadius: 'inherit' }} />
      <div style={{ position: 'absolute', bottom: -8, right: -8, width: 40, height: 40, borderRadius: '50%', background: glow, filter: 'blur(12px)' }} />
      <p style={{ margin: 0, fontSize: '0.85rem', position: 'relative' }}>{icon}</p>
      <p style={{ margin: '0.2rem 0 0', fontSize: '1.25rem', fontWeight: 800, color: '#f1f1f8', position: 'relative', letterSpacing: '-0.02em' }}>{value}</p>
      <p style={{ margin: '0.1rem 0 0', fontSize: '0.68rem', color: 'rgba(241,241,248,0.4)', fontWeight: 500, position: 'relative', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
    </div>
  )
}

function SectionCard({ title, action, onAction, children }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: '1.25rem',
      overflow: 'hidden',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.875rem 1rem 0.75rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <p style={{ margin: 0, fontWeight: 700, fontSize: '0.875rem', color: '#f1f1f8', letterSpacing: '-0.01em' }}>{title}</p>
        <button onClick={onAction} style={{ background: 'none', border: 'none', color: '#a78bfa', cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem' }}>
          {action}
        </button>
      </div>
      {children}
    </div>
  )
}

function UpcomingTaskRow({ task, onClick }) {
  const deadline = task.deadline ? parseISO(task.deadline) : null
  const isOver = deadline && isPast(deadline) && !isToday(deadline)
  const isTod = deadline && isToday(deadline)
  const isTom = deadline && isTomorrow(deadline)
  const cat = CAT_COLORS[task.category] || CAT_COLORS.Altro

  let dateLabel = deadline ? format(deadline, 'd MMM', { locale: it }) : ''
  let dateColor = 'rgba(241,241,248,0.35)'
  if (isTod) { dateLabel = 'Oggi'; dateColor = '#fb923c' }
  else if (isTom) { dateLabel = 'Domani'; dateColor = '#f59e0b' }
  else if (isOver) { dateColor = '#ef4444' }

  return (
    <div onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: '0.75rem',
      padding: '0.75rem 1rem',
      borderBottom: '1px solid rgba(255,255,255,0.05)',
      cursor: 'pointer',
      transition: 'background 0.15s',
    }}
    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <div style={{
        width: 34, height: 34, borderRadius: '0.625rem', flexShrink: 0,
        background: cat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: cat.dot }} />
      </div>
      <span style={{ flex: 1, fontSize: '0.875rem', color: '#f1f1f8', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {task.title}
      </span>
      {deadline && (
        <span style={{ fontSize: '0.73rem', fontWeight: 600, color: dateColor, flexShrink: 0 }}>
          {isOver && '⚠ '}{dateLabel}
        </span>
      )}
    </div>
  )
}

function ExpenseRow({ expense, onClick }) {
  return (
    <div onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: '0.875rem',
      padding: '0.75rem 1rem',
      borderBottom: '1px solid rgba(255,255,255,0.05)',
      cursor: 'pointer',
      transition: 'background 0.15s',
    }}
    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <div style={{
        width: 36, height: 36, borderRadius: '0.75rem', flexShrink: 0,
        background: expense.type === 'entrata' ? 'rgba(16,185,129,0.12)' : 'rgba(251,146,60,0.12)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '1rem',
      }}>
        {CAT_ICONS[expense.category] || '📦'}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: '0.875rem', color: '#f1f1f8', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {expense.description || expense.category}
        </p>
        <p style={{ margin: '0.1rem 0 0', fontSize: '0.72rem', color: 'rgba(241,241,248,0.35)' }}>
          {expense.category} · {expense.date}
        </p>
      </div>
      <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem', color: expense.type === 'entrata' ? '#4ade80' : '#fb923c', flexShrink: 0 }}>
        {expense.type === 'entrata' ? '+' : '-'}€{Number(expense.amount).toFixed(2)}
      </p>
    </div>
  )
}

function EmptyState({ icon, text }) {
  return (
    <div style={{ padding: '1.75rem 1rem', textAlign: 'center' }}>
      <p style={{ margin: '0 0 0.375rem', fontSize: '1.5rem' }}>{icon}</p>
      <p style={{ margin: 0, color: 'rgba(241,241,248,0.25)', fontSize: '0.85rem' }}>{text}</p>
    </div>
  )
}

function BalanceItem({ value, label, color }) {
  return (
    <div style={{ flex: 1, textAlign: 'center' }}>
      <p style={{ margin: 0, color, fontWeight: 700, fontSize: '1rem', letterSpacing: '-0.02em' }}>{value}</p>
      <p style={{ margin: '0.2rem 0 0', fontSize: '0.7rem', color: 'rgba(241,241,248,0.35)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
    </div>
  )
}
