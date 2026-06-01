import { useState, useEffect, useCallback } from 'react'
import { auth, db } from './firebase'
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth'
import { collection, addDoc, serverTimestamp, deleteDoc, doc } from 'firebase/firestore'
import Dashboard from './pages/Dashboard'
import Impegni from './pages/Impegni'
import Finance from './pages/Finance'
import Settings from './pages/Settings'
import Navbar from './components/Navbar'
import VoiceButton from './components/VoiceButton'
import VoiceConfirm from './components/VoiceConfirm'
import AddTaskModal from './components/AddTaskModal'
import AddExpenseModal from './components/AddExpenseModal'
import { parseVoiceAuto } from './utils/voiceParser'
import { generateRecurringInstances } from './utils/recurringManager'
import { savePushTokenIfGranted } from './hooks/usePushNotifications'
import { sanitizeData } from './utils/sanitize'

const DEMO_USER = { uid: 'demo', displayName: 'Andriy', photoURL: null }

export default function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('dashboard')
  const [taskModal, setTaskModal] = useState(null)
  const [expenseModal, setExpenseModal] = useState(null)
  const [isDemo] = useState(false)
  const [authError, setAuthError] = useState(null)
  const [email, setEmail] = useState('andriy99.an@gmail.com')
  const [password, setPassword] = useState('')

  // Voice auto-save state
  const [voiceParsed, setVoiceParsed] = useState(null)   // parsed result shown in VoiceConfirm
  const [lastSavedId, setLastSavedId] = useState(null)   // id for undo
  const [lastSavedCol, setLastSavedCol] = useState(null)  // collection for undo

  // Action Button / Shortcut: voice text passed via ?voice= URL parameter
  const [pendingVoice, setPendingVoice] = useState(null)

  // Action Button: ?listen=1 → apri direttamente la modalità ascolto in-app
  const [autoListen, setAutoListen] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const v = params.get('voice')
    if (v && v.trim()) {
      window.history.replaceState({}, '', '/')
      setPendingVoice(v.trim())
    }
    if (params.get('listen') === '1') {
      window.history.replaceState({}, '', '/')
      setAutoListen(true)
    }
  }, [])

  useEffect(() => {
    const failsafe = setTimeout(() => setLoading(false), 5000)

    const unsub = onAuthStateChanged(auth, (u) => {
      clearTimeout(failsafe)
      setUser(u)
      setLoading(false)
      if (u) {
        generateRecurringInstances(u.uid).catch(console.error)
        savePushTokenIfGranted(u.uid)
      }
    })

    return () => { clearTimeout(failsafe); unsub() }
  }, [])

  // ── Voice auto-save ──────────────────────────────────────────────────────────
  const handleVoiceResult = useCallback(async (rawText) => {
    const parsed = parseVoiceAuto(rawText)

    if (isDemo) {
      // In demo mode just open the form
      if (parsed.kind === 'task') setTaskModal({ voice: rawText })
      else setExpenseModal({ voice: rawText })
      return
    }

    if (!user) return

    // Auto-save immediately
    const colName = parsed.kind === 'task' ? 'tasks' : 'expenses'
    try {
      const ref = await addDoc(collection(db, colName), {
        ...sanitizeData(parsed.data),
        userId: user.uid,
        createdAt: serverTimestamp(),
      })
      setLastSavedId(ref.id)
      setLastSavedCol(colName)
      setVoiceParsed({ ...parsed, rawText })
    } catch (err) {
      // If save fails, fall back to manual form
      if (parsed.kind === 'task') setTaskModal({ voice: rawText })
      else setExpenseModal({ voice: rawText })
    }
  }, [user, isDemo])

  // Process ?voice= URL param once auth is ready (Action Button / iOS Shortcut flow)
  useEffect(() => {
    if (!loading && user && !isDemo && pendingVoice) {
      handleVoiceResult(pendingVoice)
      setPendingVoice(null)
    }
  }, [loading, user, isDemo, pendingVoice, handleVoiceResult])

  async function handleVoiceUndo() {
    if (lastSavedId && lastSavedCol && !isDemo) {
      await deleteDoc(doc(db, lastSavedCol, lastSavedId))
    }
    setVoiceParsed(null)
    setLastSavedId(null)
  }

  function handleVoiceEdit() {
    const parsed = voiceParsed
    setVoiceParsed(null)
    // Open the pre-filled form (already saved, but user wants to edit)
    if (parsed.kind === 'task') setTaskModal({ voice: parsed.rawText })
    else setExpenseModal({ voice: parsed.rawText })
  }

  // ── Auth ──────────────────────────────────────────────────────────────────────
  async function login() {
    try {
      setAuthError(null)
      await signInWithEmailAndPassword(auth, email, password)
    } catch (e) {
      if (['auth/wrong-password', 'auth/invalid-credential', 'auth/invalid-login-credentials'].includes(e.code)) {
        setAuthError('Codice errato')
      } else if (['auth/user-not-found', 'auth/invalid-email'].includes(e.code)) {
        setAuthError('Email non trovata')
      } else {
        setAuthError('Errore: ' + e.code)
      }
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100svh', background: 'var(--bg)' }}>
        <div style={{ width: 40, height: 40, border: '3px solid rgba(var(--surface-rgb),0.08)', borderTopColor: '#7c3aed', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  if (!user) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100svh', background: 'var(--bg)', padding: '2rem', gap: '1.75rem' }}>
        <div style={{ fontSize: '3.5rem' }}>🧠</div>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ margin: 0, fontSize: '1.9rem', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.03em' }}>Il Mio Io Digitale</h1>
          <p style={{ color: 'rgba(var(--text-rgb),0.35)', margin: '0.4rem 0 0', fontSize: '0.875rem' }}>Accesso privato</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%', maxWidth: 300 }}>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Email"
            style={{
              background: 'rgba(var(--surface-rgb),0.06)', border: '1px solid rgba(var(--surface-rgb),0.12)',
              borderRadius: '0.875rem', padding: '0.875rem 1rem', color: 'var(--text)',
              fontSize: '0.95rem', outline: 'none', width: '100%', boxSizing: 'border-box',
            }}
          />
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Codice di accesso"
            onKeyDown={e => e.key === 'Enter' && login()}
            style={{
              background: 'rgba(var(--surface-rgb),0.06)', border: '1px solid rgba(var(--surface-rgb),0.12)',
              borderRadius: '0.875rem', padding: '0.875rem 1rem', color: 'var(--text)',
              fontSize: '0.95rem', outline: 'none', width: '100%', boxSizing: 'border-box',
            }}
          />
          <button onClick={login} style={{
            background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', border: 'none',
            borderRadius: '0.875rem', padding: '0.875rem', color: 'white',
            fontSize: '1rem', fontWeight: 700, cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(124,58,237,0.4)',
          }}>
            Accedi
          </button>
        </div>

        {authError && (
          <p style={{ color: '#fca5a5', fontSize: '0.8rem', margin: 0, textAlign: 'center' }}>
            ⚠️ {authError}
          </p>
        )}
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', height: '100dvh', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
      {isDemo && (
        <div style={{ background: 'rgba(99,102,241,0.12)', borderBottom: '1px solid rgba(99,102,241,0.25)', padding: '0.5rem 1rem', textAlign: 'center', fontSize: '0.78rem', color: '#a5b4fc' }}>
          🎭 Modalità demo — la voce apre i form, i dati non vengono salvati
          <button onClick={exitDemo} style={{ marginLeft: '0.75rem', background: 'none', border: 'none', color: '#818cf8', cursor: 'pointer', fontWeight: 600 }}>Esci</button>
        </div>
      )}


      <main style={{ flex: 1, minHeight: 0, padding: '1rem', paddingTop: 'calc(1rem + env(safe-area-inset-top))', paddingBottom: '1.5rem', overflowY: 'auto' }}>
        {tab === 'dashboard' && (
          <Dashboard user={user} isDemo={isDemo}
            onNewTask={() => setTaskModal('new')}
            onNewExpense={() => setExpenseModal('new')}
            onEditTask={t => setTaskModal(t)}
            onEditExpense={e => setExpenseModal(e)}
            onSignOut={() => isDemo ? exitDemo() : signOut(auth)}
          />
        )}
        {tab === 'tasks' && (
          <Impegni user={user}
            onNew={() => setTaskModal('new')}
            onEdit={t => setTaskModal(t)}
            onNewOnDate={(date) => setTaskModal(date ? { prefillDate: date } : 'new')}
          />
        )}
        {tab === 'finance' && (
          <Finance user={user} isDemo={isDemo}
            onNew={() => setExpenseModal('new')}
            onEdit={e => setExpenseModal(e)}
          />
        )}
        {tab === 'settings' && (
          <Settings user={user} />
        )}
      </main>

      <Navbar tab={tab} setTab={setTab} />
      <VoiceButton onResult={handleVoiceResult} autoListen={autoListen} onAutoListenDone={() => setAutoListen(false)} />

      {/* Auto-save confirmation toast */}
      {voiceParsed && (
        <VoiceConfirm
          parsed={voiceParsed}
          onEdit={handleVoiceEdit}
          onUndo={handleVoiceUndo}
          onDone={() => setVoiceParsed(null)}
        />
      )}

      {taskModal !== null && !isDemo && (
        <AddTaskModal user={user} initial={taskModal} onClose={() => setTaskModal(null)} />
      )}
      {taskModal !== null && isDemo && (
        <AddTaskModal user={user} initial={taskModal} onClose={() => setTaskModal(null)} />
      )}
      {expenseModal !== null && (
        <AddExpenseModal user={user} initial={expenseModal} onClose={() => setExpenseModal(null)} />
      )}
    </div>
  )
}
