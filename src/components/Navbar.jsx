const TABS = [
  {
    id: 'dashboard', label: 'Home',
    icon: (active) => (
      <svg width="21" height="21" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.2 : 1.6}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    id: 'tasks', label: 'Impegni',
    icon: (active) => (
      <svg width="21" height="21" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.2 : 1.6}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
  },
  {
    id: 'calendar', label: 'Calendario',
    icon: (active) => (
      <svg width="21" height="21" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.2 : 1.6}>
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" strokeLinecap="round" strokeLinejoin="round"/>
        <line x1="16" y1="2" x2="16" y2="6" strokeLinecap="round"/>
        <line x1="8" y1="2" x2="8" y2="6" strokeLinecap="round"/>
        <line x1="3" y1="10" x2="21" y2="10" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id: 'finance', label: 'Finanze',
    icon: (active) => (
      <svg width="21" height="21" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.2 : 1.6}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    id: 'settings', label: 'Impostaz.',
    icon: (active) => (
      <svg width="21" height="21" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.2 : 1.6}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
]

export default function Navbar({ tab, setTab }) {
  return (
    <nav style={{
      flexShrink: 0,
      width: '100%',
      background: 'rgba(var(--bg-rgb),0.95)',
      backdropFilter: 'blur(24px) saturate(180%)',
      WebkitBackdropFilter: 'blur(24px) saturate(180%)',
      borderTop: '1px solid rgba(var(--surface-rgb),0.07)',
      display: 'flex', alignItems: 'stretch',
      paddingTop: '0.25rem',
      paddingBottom: 'max(env(safe-area-inset-bottom), 0.5rem)',
      zIndex: 50,
    }}>
      {TABS.map(t => {
        const active = tab === t.id
        return (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', gap: 2, padding: '0.55rem 0.25rem',
            background: 'none', border: 'none', cursor: 'pointer',
            color: active ? '#a78bfa' : 'rgba(var(--text-rgb),0.3)',
            transition: 'color 0.2s', position: 'relative',
          }}>
            {active && (
              <span style={{
                position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
                width: 28, height: 2, borderRadius: '0 0 2px 2px',
                background: 'linear-gradient(90deg, #7c3aed, #a78bfa)',
              }} />
            )}
            {t.icon(active)}
            <span style={{ fontSize: '0.62rem', fontWeight: active ? 600 : 400, letterSpacing: '0.01em' }}>{t.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
