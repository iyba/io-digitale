import { useMemo } from 'react'
import { useCollection } from '../hooks/useCollection'
import { useWeather, WMO, outdoorAlert } from '../hooks/useWeather'
import { format, isToday, isPast, parseISO, differenceInCalendarDays } from 'date-fns'
import { it } from 'date-fns/locale'

const CAT_COLORS = {
  Lavoro: '#818cf8', Casa: '#fb923c', Salute: '#4ade80',
  Famiglia: '#f472b6', Personale: '#c084fc', Altro: '#94a3b8',
}

function relLabel(deadline) {
  const d = parseISO(deadline)
  const diff = differenceInCalendarDays(d, new Date())
  if (diff <= 0) return { text: 'Oggi', color: '#fb923c' }
  if (diff === 1) return { text: 'Domani', color: '#fbbf24' }
  if (diff <= 7) return { text: `Tra ${diff} giorni`, color: '#a78bfa' }
  return { text: format(d, 'd MMM', { locale: it }), color: 'rgba(var(--text-rgb),0.45)' }
}

export default function Dashboard({ user, onNewTask, onEditTask, onSignOut }) {
  const { items: tasks, update: updateTask } = useCollection('tasks', user.uid)
  const { weather, status: weatherStatus, requestWeather } = useWeather()

  const now = new Date()

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
      .slice(0, 6)
  }, [tasks])

  const pendingCount = tasks.filter(t => !t.completed && !t.isNote).length

  const wCurrent = weather ? (WMO[weather.current.code] ?? WMO[0]) : null
  const alert = weather ? outdoorAlert(weather.current.code, weather.today.rainProb) : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

      {/* Hero */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(99,72,230,0.28) 0%, rgba(124,58,237,0.16) 60%, transparent 100%)',
        borderRadius: '1.5rem', border: '1px solid rgba(124,58,237,0.25)',
        padding: '1.125rem', marginTop: '0.25rem', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -50, right: -30, width: 130, height: 130, borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.35), transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative' }}>
          <p style={{ margin: 0, color: 'rgba(var(--text-rgb),0.6)', fontSize: '0.95rem', fontWeight: 700, textTransform: 'capitalize', letterSpacing: '-0.01em' }}>
            {format(now, 'EEEE d MMMM', { locale: it })}
          </p>

          {weatherStatus === 'ok' && weather ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.85rem', color: 'rgba(var(--text-rgb),0.7)', fontWeight: 600 }}>
              <span style={{ fontSize: '1.05rem' }}>{wCurrent.icon}</span>
              {weather.current.temp}°
              {weather.today.rainProb >= 40 && <span style={{ color: '#fbbf24', fontSize: '0.72rem' }}>· 🌧️{weather.today.rainProb}%</span>}
            </div>
          ) : (weatherStatus === 'idle' || weatherStatus === 'denied') ? (
            <button onClick={requestWeather} style={{ background: 'none', border: 'none', color: 'rgba(var(--text-rgb),0.4)', fontSize: '0.75rem', cursor: 'pointer', padding: 0 }}>
              📍 Meteo
            </button>
          ) : null}
        </div>

        {/* Mini stats — solo impegni */}
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', position: 'relative' }}>
          <MiniStat value={pendingCount} label="da fare" color="#a78bfa" />
          <Sep />
          <MiniStat value={todayTasks.length} label="oggi" color="#4ade80" />
          <Sep />
          <MiniStat value={overdueTasks.length} label="scaduti" color={overdueTasks.length ? '#ef4444' : 'rgba(var(--text-rgb),0.5)'} />
        </div>

        {alert && alert.level === 'bad' && (
          <div style={{ marginTop: '0.75rem', position: 'relative', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.22)', borderRadius: '0.75rem', padding: '0.5rem 0.75rem' }}>
            <p style={{ margin: 0, fontSize: '0.78rem', color: '#fca5a5', fontWeight: 500 }}>{alert.msg}</p>
          </div>
        )}
      </div>

      {/* OGGI — impegni giornalieri */}
      <SectionCard icon="🎯" title="Oggi" badge={focusTasks.length || null} action="+ Impegno" onAction={onNewTask}>
        {focusTasks.length === 0 ? (
          <Empty icon="✅" text="Nessun impegno per oggi" />
        ) : (
          focusTasks.map(t => (
            <FocusRow key={t.id} task={t}
              onCheck={() => updateTask(t.id, { completed: true })}
              onEdit={() => onEditTask(t)} />
          ))
        )}
      </SectionCard>

      {/* SCADENZE RAVVICINATE */}
      <SectionCard icon="⏰" title="Prossime scadenze">
        {upcomingTasks.length === 0 ? (
          <Empty icon="🗓️" text="Nessuna scadenza in arrivo" />
        ) : (
          upcomingTasks.map(t => <UpcomingRow key={t.id} task={t} onClick={() => onEditTask(t)} />)
        )}
      </SectionCard>

    </div>
  )
}

function MiniStat({ value, label, color }) {
  return (
    <div style={{ flex: 1, textAlign: 'center' }}>
      <p style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color, letterSpacing: '-0.02em' }}>{value}</p>
      <p style={{ margin: '0.1rem 0 0', fontSize: '0.64rem', color: 'rgba(var(--text-rgb),0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500 }}>{label}</p>
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
          <span style={{ fontSize: '0.67rem', color: 'rgba(var(--text-rgb),0.4)' }}>{task.category}</span>
          {task.time && <span style={{ fontSize: '0.65rem', color: '#a78bfa', fontWeight: 700 }}>🕐 {task.time}</span>}
          {isOver && <span style={{ fontSize: '0.65rem', color: '#ef4444', fontWeight: 700 }}>• Scaduto</span>}
          {isTod && <span style={{ fontSize: '0.65rem', color: '#fb923c', fontWeight: 700 }}>• Oggi</span>}
        </div>
      </div>
    </div>
  )
}

function UpcomingRow({ task, onClick }) {
  const col = CAT_COLORS[task.category] || CAT_COLORS.Altro
  const rl = relLabel(task.deadline)
  return (
    <div onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: col, flexShrink: 0 }} />
      <span style={{ flex: 1, fontSize: '0.875rem', color: 'var(--text)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</span>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: '0.74rem', fontWeight: 700, color: rl.color }}>{rl.text}</div>
        {task.time && <div style={{ fontSize: '0.66rem', color: 'rgba(var(--text-rgb),0.45)', marginTop: '0.1rem' }}>🕐 {task.time}</div>}
      </div>
    </div>
  )
}

function Empty({ icon, text }) {
  return (
    <div style={{ padding: '1.6rem 1rem', textAlign: 'center' }}>
      <p style={{ margin: '0 0 0.375rem', fontSize: '1.4rem' }}>{icon}</p>
      <p style={{ margin: 0, color: 'rgba(var(--text-rgb),0.35)', fontSize: '0.85rem' }}>{text}</p>
    </div>
  )
}
