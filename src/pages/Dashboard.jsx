import { useMemo } from 'react'
import { useCollection } from '../hooks/useCollection'
import { useWeather, WMO, outdoorAlert } from '../hooks/useWeather'
import { format, isToday, isPast, parseISO, addDays, startOfDay, isSameDay } from 'date-fns'
import { it } from 'date-fns/locale'

const CAT_COLORS = {
  Lavoro:    '#818cf8',
  Casa:      '#fb923c',
  Salute:    '#4ade80',
  Famiglia:  '#f472b6',
  Personale: '#c084fc',
  Altro:     '#94a3b8',
}

export default function Dashboard({ user, onNewTask, onNewExpense, onEditTask, onSignOut }) {
  const { items: tasks, update: updateTask } = useCollection('tasks', user.uid)
  const { weather, status: weatherStatus, requestWeather } = useWeather()

  const now   = new Date()
  const hour  = now.getHours()
  const greeting = hour < 12 ? 'Buongiorno' : hour < 18 ? 'Buon pomeriggio' : 'Buonasera'
  const name  = user.displayName?.split(' ')[0] || ''

  const week = useMemo(() =>
    Array.from({ length: 7 }, (_, i) => addDays(startOfDay(now), i)), [])

  const overdueTasks = useMemo(() =>
    tasks.filter(t => !t.completed && t.deadline &&
      isPast(parseISO(t.deadline)) && !isToday(parseISO(t.deadline)))
      .sort((a, b) => a.deadline.localeCompare(b.deadline)),
    [tasks])

  const todayTasks = useMemo(() =>
    tasks.filter(t => !t.completed && t.deadline && isToday(parseISO(t.deadline))),
    [tasks])

  const focusTasks = useMemo(() =>
    [...overdueTasks, ...todayTasks].slice(0, 7), [overdueTasks, todayTasks])

  const pendingCount = tasks.filter(t => !t.completed).length

  const alert = weather
    ? outdoorAlert(weather.current.code, weather.today.rainProb)
    : null

  const wCurrent = weather ? (WMO[weather.current.code] ?? WMO[0]) : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

      {/* ── HERO: greeting + weather ──────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(79,46,220,0.22) 0%, rgba(124,58,237,0.12) 60%, transparent 100%)',
        borderRadius: '1.5rem',
        border: '1px solid rgba(124,58,237,0.2)',
        padding: '1.125rem',
        marginTop: '0.25rem',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -50, right: -30, width: 130, height: 130, borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.3), transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative' }}>
          <div>
            <p style={{ margin: 0, color: 'rgba(241,241,248,0.45)', fontSize: '0.78rem', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 500 }}>
              {format(now, 'EEEE, d MMMM', { locale: it })}
            </p>
            <h1 style={{ margin: '0.2rem 0 0', fontSize: '1.5rem', fontWeight: 800, color: '#f1f1f8', letterSpacing: '-0.02em' }}>
              {greeting}{name ? `, ${name}` : ''} 👋
            </h1>
          </div>
          <button onClick={onSignOut} style={{
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '0.875rem', padding: '0.4rem 0.75rem', color: 'rgba(241,241,248,0.4)',
            cursor: 'pointer', fontSize: '0.75rem', fontWeight: 500,
          }}>Esci</button>
        </div>

        {/* Weather row */}
        <div style={{ marginTop: '0.875rem', position: 'relative' }}>
          {weatherStatus === 'loading' && (
            <p style={{ margin: 0, color: 'rgba(241,241,248,0.3)', fontSize: '0.82rem' }}>Caricamento meteo…</p>
          )}
          {(weatherStatus === 'idle' || weatherStatus === 'denied' || weatherStatus === 'no-geo') && (
            <button onClick={requestWeather} style={{
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '0.75rem', padding: '0.4rem 0.75rem', color: 'rgba(241,241,248,0.5)',
              cursor: 'pointer', fontSize: '0.78rem', fontWeight: 500,
            }}>
              📍 Mostra meteo
            </button>
          )}
          {weatherStatus === 'ok' && weather && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
              {/* Big temp + icon */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                <span style={{ fontSize: '2.25rem', lineHeight: 1 }}>{wCurrent.icon}</span>
                <div>
                  <p style={{ margin: 0, fontSize: '1.8rem', fontWeight: 800, color: '#f1f1f8', letterSpacing: '-0.03em', lineHeight: 1 }}>
                    {weather.current.temp}°
                  </p>
                  <p style={{ margin: '0.1rem 0 0', fontSize: '0.72rem', color: 'rgba(241,241,248,0.45)', fontWeight: 500 }}>
                    {wCurrent.label}
                  </p>
                </div>
              </div>

              {/* Details */}
              <div style={{ textAlign: 'right' }}>
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'rgba(241,241,248,0.5)' }}>
                  {weather.today.min}° / {weather.today.max}°
                </p>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.75rem', color: 'rgba(241,241,248,0.5)' }}>
                  💨 {weather.current.wind} km/h
                </p>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.75rem', color: weather.today.rainProb >= 40 ? '#fbbf24' : 'rgba(241,241,248,0.5)' }}>
                  🌧️ {weather.today.rainProb}%
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Outdoor alert (calcetto) */}
        {alert && (
          <div style={{
            marginTop: '0.75rem', position: 'relative',
            background: alert.level === 'bad' ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
            border: `1px solid ${alert.level === 'bad' ? 'rgba(239,68,68,0.25)' : 'rgba(245,158,11,0.25)'}`,
            borderRadius: '0.75rem', padding: '0.5rem 0.75rem',
          }}>
            <p style={{ margin: 0, fontSize: '0.8rem', color: alert.level === 'bad' ? '#fca5a5' : '#fcd34d', fontWeight: 500 }}>
              {alert.msg}
            </p>
          </div>
        )}

        {/* Overdue alert */}
        {overdueTasks.length > 0 && (
          <div onClick={() => onEditTask(overdueTasks[0])} style={{
            marginTop: '0.625rem', position: 'relative',
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.22)',
            borderRadius: '0.75rem', padding: '0.5rem 0.75rem', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '0.5rem',
          }}>
            <span style={{ fontSize: '0.85rem' }}>⚠️</span>
            <p style={{ margin: 0, color: '#fca5a5', fontSize: '0.8rem', fontWeight: 600 }}>
              {overdueTasks.length} scadut{overdueTasks.length > 1 ? 'i' : 'o'}
              <span style={{ fontWeight: 400, opacity: 0.75 }}> — {overdueTasks[0].title}</span>
            </p>
          </div>
        )}
      </div>

      {/* ── SETTIMANA ────────────────────────────────────────────────────────── */}
      <div>
        <p style={{ margin: '0 0 0.5rem', fontSize: '0.68rem', color: 'rgba(241,241,248,0.4)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Questa settimana
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.3rem' }}>
          {week.map((day, i) => {
            const isT = isToday(day)
            const dayTasks = tasks.filter(t => t.deadline && isSameDay(parseISO(t.deadline), day))
            const pending  = dayTasks.filter(t => !t.completed)
            const done     = dayTasks.filter(t => t.completed)
            const wd = weather?.week[i]
            const wInfo = wd ? (WMO[wd.code] ?? WMO[0]) : null
            const hasRain = wd && wd.rainProb >= 40

            return (
              <div key={i} style={{
                background: isT ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.025)',
                border: isT ? '1px solid rgba(124,58,237,0.45)' : '1px solid rgba(255,255,255,0.06)',
                borderRadius: '0.875rem',
                padding: '0.5rem 0.2rem',
                textAlign: 'center',
              }}>
                <p style={{ margin: 0, fontSize: '0.56rem', color: isT ? '#a78bfa' : 'rgba(241,241,248,0.3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                  {format(day, 'EEE', { locale: it }).slice(0, 3)}
                </p>
                <p style={{ margin: '0.15rem 0', fontSize: isT ? '1rem' : '0.875rem', fontWeight: isT ? 800 : 600, color: isT ? '#f1f1f8' : 'rgba(241,241,248,0.55)', lineHeight: 1 }}>
                  {format(day, 'd')}
                </p>

                {/* Weather icon for this day */}
                {wInfo && (
                  <p style={{ margin: '0.1rem 0', fontSize: '0.85rem', lineHeight: 1 }}>{wInfo.icon}</p>
                )}
                {wd && (
                  <p style={{ margin: '0.1rem 0 0.2rem', fontSize: '0.58rem', color: hasRain ? '#fbbf24' : 'rgba(241,241,248,0.3)', fontWeight: 600 }}>
                    {wd.max}°{hasRain ? ` ${wd.rainProb}%` : ''}
                  </p>
                )}

                {/* Task dots */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: '2px', minHeight: 6, flexWrap: 'wrap' }}>
                  {pending.slice(0, 3).map((t, j) => (
                    <div key={j} style={{ width: 5, height: 5, borderRadius: '50%', background: CAT_COLORS[t.category] || '#94a3b8' }} />
                  ))}
                  {done.length > 0 && (
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'rgba(74,222,128,0.4)' }} />
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── OGGI ──────────────────────────────────────────────────────────────── */}
      <div style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: '1.25rem',
        overflow: 'hidden',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.875rem 1rem 0.75rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem' }}>📅</span>
            <p style={{ margin: 0, fontWeight: 700, fontSize: '0.875rem', color: '#f1f1f8' }}>Oggi</p>
            {focusTasks.length > 0 && (
              <span style={{ background: 'rgba(167,139,250,0.18)', color: '#a78bfa', borderRadius: '0.5rem', padding: '0.08rem 0.4rem', fontSize: '0.68rem', fontWeight: 700 }}>
                {focusTasks.length}
              </span>
            )}
            {pendingCount > focusTasks.length && (
              <span style={{ color: 'rgba(241,241,248,0.3)', fontSize: '0.7rem' }}>
                +{pendingCount - focusTasks.length} altri
              </span>
            )}
          </div>
          <button onClick={onNewTask} style={{ background: 'none', border: 'none', color: '#a78bfa', cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem' }}>
            + Nuovo
          </button>
        </div>

        {focusTasks.length === 0 ? (
          <div style={{ padding: '1.75rem 1rem', textAlign: 'center' }}>
            <p style={{ margin: '0 0 0.3rem', fontSize: '1.4rem' }}>✅</p>
            <p style={{ margin: 0, color: 'rgba(241,241,248,0.25)', fontSize: '0.83rem' }}>
              Nessun impegno per oggi — ottimo!
            </p>
          </div>
        ) : (
          focusTasks.map(t => (
            <FocusRow key={t.id} task={t}
              onCheck={() => updateTask(t.id, { completed: true })}
              onEdit={() => onEditTask(t)}
            />
          ))
        )}
      </div>

      {/* ── QUICK ACTIONS ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
        <QuickBtn icon="📋" label="Impegno" sub="Aggiungi task" color="#7c3aed" glow="rgba(124,58,237,0.3)" onClick={onNewTask} />
        <QuickBtn icon="💸" label="Spesa" sub="Registra spesa" color="#ea580c" glow="rgba(234,88,12,0.3)" onClick={onNewExpense} />
      </div>

    </div>
  )
}

function FocusRow({ task, onCheck, onEdit }) {
  const deadline = task.deadline ? parseISO(task.deadline) : null
  const isOver = deadline && isPast(deadline) && !isToday(deadline)
  const isTod  = deadline && isToday(deadline)
  const col    = CAT_COLORS[task.category] || CAT_COLORS.Altro

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '0.75rem',
      padding: '0.75rem 1rem',
      borderBottom: '1px solid rgba(255,255,255,0.05)',
    }}>
      <button onClick={e => { e.stopPropagation(); onCheck() }} style={{
        width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
        border: `2px solid ${isOver ? '#ef4444' : isTod ? '#fb923c' : col}`,
        background: 'transparent', cursor: 'pointer', padding: 0,
      }} />
      <div onClick={onEdit} style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}>
        <p style={{ margin: 0, fontSize: '0.875rem', color: '#f1f1f8', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {task.title}
        </p>
        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', marginTop: '0.12rem' }}>
          <span style={{ fontSize: '0.67rem', color: 'rgba(241,241,248,0.35)' }}>{task.category}</span>
          {isOver && <span style={{ fontSize: '0.65rem', color: '#ef4444', fontWeight: 700 }}>• Scaduto</span>}
          {isTod  && <span style={{ fontSize: '0.65rem', color: '#fb923c', fontWeight: 700 }}>• Oggi</span>}
        </div>
      </div>
    </div>
  )
}

function QuickBtn({ icon, label, sub, color, glow, onClick }) {
  return (
    <button onClick={onClick} style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: '1.125rem',
      padding: '1rem 0.875rem',
      cursor: 'pointer', textAlign: 'left',
      position: 'relative', overflow: 'hidden',
      transition: 'background 0.15s',
    }}
    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
    onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
    >
      <div style={{ position: 'absolute', bottom: -10, right: -10, width: 50, height: 50, borderRadius: '50%', background: glow, filter: 'blur(16px)', pointerEvents: 'none' }} />
      <p style={{ margin: '0 0 0.3rem', fontSize: '1.3rem' }}>{icon}</p>
      <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 700, color: '#f1f1f8' }}>{label}</p>
      <p style={{ margin: '0.1rem 0 0', fontSize: '0.7rem', color: 'rgba(241,241,248,0.35)' }}>{sub}</p>
    </button>
  )
}
