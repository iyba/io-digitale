import { useState, useEffect } from 'react'
import { signOut } from 'firebase/auth'
import { auth } from '../firebase'
import { requestPushPermission } from '../hooks/usePushNotifications'
import { useWeather } from '../hooks/useWeather'
import { getTheme, setTheme as persistTheme } from '../theme'

export default function Settings({ user }) {
  const [perms, setPerms] = useState({ mic: 'unknown', geo: 'unknown', notif: 'unknown' })
  const [theme, setTheme] = useState(getTheme())
  const { requestWeather } = useWeather()

  function changeTheme(t) {
    setTheme(t)
    persistTheme(t)
  }

  useEffect(() => {
    async function checkPerms() {
      // Parti dai flag salvati (affidabili su iOS dove l'API permessi non funziona)
      const result = {
        mic: localStorage.getItem('perm_mic') || 'unknown',
        geo: localStorage.getItem('weather_coords') ? 'granted' : (localStorage.getItem('perm_geo') || 'unknown'),
        notif: 'unknown',
      }

      if ('Notification' in window) result.notif = Notification.permission

      // Se l'API permessi funziona, usala per confermare
      if (navigator.permissions) {
        try { const s = (await navigator.permissions.query({ name: 'microphone' })).state; if (s !== 'prompt') result.mic = s } catch {}
        try { const s = (await navigator.permissions.query({ name: 'geolocation' })).state; if (s !== 'prompt') result.geo = s } catch {}
      }

      setPerms(result)
    }
    checkPerms()
  }, [])

  async function enableNotifications() {
    const ok = await requestPushPermission(user.uid)
    setPerms(p => ({ ...p, notif: ok ? 'granted' : 'denied' }))
  }

  async function enableWeather() {
    await requestWeather()
    if (localStorage.getItem('weather_coords')) {
      localStorage.setItem('perm_geo', 'granted')
      setPerms(p => ({ ...p, geo: 'granted' }))
    }
  }

  async function enableMic() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach(t => t.stop())
      localStorage.setItem('perm_mic', 'granted')
      setPerms(p => ({ ...p, mic: 'granted' }))
    } catch {
      setPerms(p => ({ ...p, mic: 'denied' }))
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', paddingBottom: '1rem' }}>

      <div style={{ marginTop: '0.25rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }}>Impostazioni</h2>
      </div>

      {/* Aspetto */}
      <Section title="Aspetto">
        <div style={{ padding: '0.75rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem' }}>
          <ThemeOption
            active={theme === 'dark'}
            onClick={() => changeTheme('dark')}
            icon="🌙"
            label="Scuro"
            preview={{ bg: '#07070f', card: 'rgba(255,255,255,0.08)', text: '#f1f1f8' }}
          />
          <ThemeOption
            active={theme === 'light'}
            onClick={() => changeTheme('light')}
            icon="☀️"
            label="Chiaro"
            preview={{ bg: '#eef0f6', card: 'rgba(30,35,70,0.1)', text: '#16162b' }}
          />
        </div>
      </Section>

      {/* Account */}
      <Section title="Account">
        <div style={{ padding: '0.875rem 1rem', display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0 }}>
            {user.displayName?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || '?'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user.displayName || 'Utente'}
            </p>
            <p style={{ margin: '0.1rem 0 0', fontSize: '0.72rem', color: 'rgba(var(--text-rgb),0.4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user.email}
            </p>
          </div>
        </div>
        <Divider />
        <RowButton
          icon="🚪"
          label="Esci dall'account"
          color="#ef4444"
          onClick={() => signOut(auth)}
        />
      </Section>

      {/* Permessi */}
      <Section title="Permessi">
        <PermRow
          icon="🎤"
          label="Microfono"
          sub="Per il comando vocale"
          status={perms.mic}
          onEnable={enableMic}
        />
        <Divider />
        <PermRow
          icon="📍"
          label="Posizione"
          sub="Per il meteo in Home"
          status={perms.geo}
          onEnable={enableWeather}
        />
        <Divider />
        <PermRow
          icon="🔔"
          label="Notifiche"
          sub="Promemoria scadenze ogni mattina"
          status={perms.notif}
          onEnable={enableNotifications}
        />
      </Section>

      {/* Tasto Action iPhone */}
      <Section title="Tasto Action iPhone 16">
        <div style={{ padding: '0.875rem 1rem' }}>
          <p style={{ margin: '0 0 0.75rem', fontSize: '0.82rem', color: 'rgba(var(--text-rgb),0.5)', lineHeight: 1.5 }}>
            Bastano <strong style={{ color: '#c4b5fd' }}>un solo blocco</strong> e nient'altro!
          </p>
          <Step n="1" text='Apri "Comandi Rapidi" → tocca + → rinomina "Io Digitale"' />
          <Step n="2" text="Aggiungi una sola azione: «Apri URL»" />
          <Step n="3" text="Nel campo URL incolla esattamente l'indirizzo qui sotto:" />
          <div style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: '0.625rem', padding: '0.5rem 0.75rem', margin: '0.5rem 0' }}>
            <p style={{ margin: 0, fontSize: '0.78rem', color: '#c4b5fd', fontFamily: 'monospace', wordBreak: 'break-all' }}>
              https://io-digitale.vercel.app?listen=1
            </p>
          </div>
          <Step n="4" text='Impostazioni iPhone → Tasto Azione → Comandi → seleziona "Io Digitale"' />
          <p style={{ margin: '0.5rem 0 0', fontSize: '0.75rem', color: 'rgba(var(--text-rgb),0.4)', lineHeight: 1.4 }}>
            Premi il tasto → l'app apre il microfono a tutto schermo → parli → salva da sola.
          </p>
        </div>
      </Section>

      {/* Come funziona la voce */}
      <Section title="Input vocale — come funziona">
        <div style={{ padding: '0.875rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          <VoiceExample type="spesa" text='"ho speso 50 euro di benzina"' />
          <VoiceExample type="spesa" text='"pagato 87 euro al supermercato"' />
          <VoiceExample type="spesa" text='"bolletta gas 120 euro"' />
          <VoiceExample type="task"  text='"riunione con il cliente venerdì"' />
          <VoiceExample type="task"  text='"visita dentista domani alle 10"' />
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.72rem', color: 'rgba(var(--text-rgb),0.3)', lineHeight: 1.4 }}>
            Per salvare una spesa dì sempre l'importo (es. "50 euro") + una parola come "speso", "pagato", "euro".
          </p>
        </div>
      </Section>

      {/* Info */}
      <Section title="Informazioni">
        <InfoRow label="Versione" value="1.0.0" />
        <Divider />
        <InfoRow label="Database" value="Firebase Firestore" />
        <Divider />
        <InfoRow label="Hosting" value="Vercel" />
      </Section>

    </div>
  )
}

function ThemeOption({ active, onClick, icon, label, preview }) {
  return (
    <button onClick={onClick} style={{
      background: active ? 'rgba(124,58,237,0.12)' : 'transparent',
      border: `1.5px solid ${active ? 'rgba(124,58,237,0.5)' : 'var(--input-bg)'}`,
      borderRadius: '1rem', padding: '0.75rem', cursor: 'pointer',
      display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'stretch',
      transition: 'all 0.15s',
    }}>
      {/* mini preview */}
      <div style={{ background: preview.bg, borderRadius: '0.625rem', padding: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.3rem', border: '1px solid rgba(128,128,128,0.15)' }}>
        <div style={{ height: 6, width: '60%', borderRadius: 3, background: preview.text, opacity: 0.85 }} />
        <div style={{ height: 14, borderRadius: 4, background: preview.card }} />
        <div style={{ height: 14, borderRadius: 4, background: preview.card }} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
        <span style={{ fontSize: '0.95rem' }}>{icon}</span>
        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: active ? '#c4b5fd' : 'var(--text)' }}>{label}</span>
        {active && <span style={{ color: '#a78bfa', fontSize: '0.8rem' }}>✓</span>}
      </div>
    </button>
  )
}

function Section({ title, children }) {
  return (
    <div>
      <p style={{ margin: '0 0 0.4rem 0.25rem', fontSize: '0.68rem', color: 'rgba(var(--text-rgb),0.35)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        {title}
      </p>
      <div style={{ background: 'rgba(var(--surface-rgb),0.03)', border: '1px solid rgba(var(--surface-rgb),0.07)', borderRadius: '1.125rem', overflow: 'hidden' }}>
        {children}
      </div>
    </div>
  )
}

function Divider() {
  return <div style={{ height: 1, background: 'rgba(var(--surface-rgb),0.05)', margin: '0 1rem' }} />
}

function PermRow({ icon, label, sub, status, onEnable }) {
  const granted = status === 'granted'
  const denied  = status === 'denied'

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem' }}>
      <span style={{ fontSize: '1.2rem', width: 28, textAlign: 'center', flexShrink: 0 }}>{icon}</span>
      <div style={{ flex: 1 }}>
        <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 500, color: 'var(--text)' }}>{label}</p>
        <p style={{ margin: '0.1rem 0 0', fontSize: '0.7rem', color: 'rgba(var(--text-rgb),0.35)' }}>{sub}</p>
      </div>
      {granted ? (
        <span style={{ fontSize: '0.72rem', color: '#4ade80', fontWeight: 600, background: 'rgba(74,222,128,0.1)', padding: '0.2rem 0.5rem', borderRadius: '0.5rem' }}>
          Attivo ✓
        </span>
      ) : denied ? (
        <span style={{ fontSize: '0.72rem', color: '#fb923c', fontWeight: 500 }}>
          Bloccato
        </span>
      ) : (
        <button onClick={onEnable} style={{
          background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.35)',
          borderRadius: '0.625rem', padding: '0.3rem 0.75rem', color: '#a78bfa',
          cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600,
        }}>
          Abilita
        </button>
      )}
    </div>
  )
}

function RowButton({ icon, label, color, onClick }) {
  return (
    <button onClick={onClick} style={{
      width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem',
      padding: '0.75rem 1rem', background: 'none', border: 'none',
      cursor: 'pointer', textAlign: 'left',
    }}>
      <span style={{ fontSize: '1.1rem', width: 28, textAlign: 'center', flexShrink: 0 }}>{icon}</span>
      <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 500, color: color || 'var(--text)' }}>{label}</p>
    </button>
  )
}

function Step({ n, text }) {
  return (
    <div style={{ display: 'flex', gap: '0.625rem', alignItems: 'flex-start', marginBottom: '0.4rem' }}>
      <span style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(124,58,237,0.25)', color: '#a78bfa', fontSize: '0.65rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
        {n}
      </span>
      <p style={{ margin: 0, fontSize: '0.78rem', color: 'rgba(var(--text-rgb),0.6)', lineHeight: 1.4 }}>{text}</p>
    </div>
  )
}

function VoiceExample({ type, text }) {
  return (
    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
      <span style={{ fontSize: '0.75rem' }}>{type === 'spesa' ? '💸' : '📋'}</span>
      <p style={{ margin: 0, fontSize: '0.78rem', color: 'rgba(var(--text-rgb),0.6)', fontStyle: 'italic' }}>{text}</p>
    </div>
  )
}

function InfoRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem' }}>
      <p style={{ margin: 0, fontSize: '0.875rem', color: 'rgba(var(--text-rgb),0.5)' }}>{label}</p>
      <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text)', fontWeight: 500 }}>{value}</p>
    </div>
  )
}
