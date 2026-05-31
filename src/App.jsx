import { useState, useEffect, useCallback } from 'react'
import { auth, db } from './firebase'
import { GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from 'firebase/auth'
import { collection, addDoc, serverTimestamp, deleteDoc, doc } from 'firebase/firestore'
import Dashboard from './pages/Dashboard'
import Tasks from './pages/Tasks'
import Finance from './pages/Finance'
import Calendar from './pages/Calendar'
import Navbar from './components/Navbar'
import VoiceButton from './components/VoiceButton'
import VoiceConfirm from './components/VoiceConfirm'
import AddTaskModal from './components/AddTaskModal'
import AddExpenseModal from './components/AddExpenseModal'
import { parseVoiceAuto } from './utils/voiceParser'
import { generateRecurringInstances } from './utils/recurringManager'

const DEMO_USER = { uid: 'demo', displayName: 'Andriy', photoURL: null }

export default function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('dashboard')
  const [taskModal, setTaskModal] = useState(null)
  const [expenseModal, setExpenseModal] = useState(null)
  const [isDemo, setIsDemo] = useState(false)

  // Voice auto-save state
  const [voiceParsed, setVoiceParsed] = useState(null)   // parsed result shown in VoiceConfirm
  const [lastSavedId, setLastSavedId] = useState(null)   // id for undo
  const [lastSavedCol, setLastSavedCol] = useState(null)  // collection for undo

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u)
      setLoading(false)
      if (u) generateRecurringInstances(u.uid).catch(console.error)
    })
    return unsub
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
        ...parsed.data,
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
    const provider = new GoogleAuthProvider()
    await signInWithPopup(auth, provider)
  }

  function enterDemo() { setIsDemo(true); setUser(DEMO_USER) }
  function exitDemo()  { setIsDemo(false); setUser(null) }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100svh', background: '#07070f' }}>
        <div style={{ width: 40, height: 40, border: '3px solid rgba(255,255,255,0.08)', borderTopColor: '#7c3aed', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  if (!user) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100svh', background: '#07070f', padding: '2rem', textAlign: 'center', gap: '1.5rem' }}>
        <div style={{ fontSize: '4rem' }}>🧠</div>
        <div>
          <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 800, color: '#f1f1f8', letterSpacing: '-0.03em' }}>Il Mio Io Digitale</h1>
          <p style={{ color: 'rgba(241,241,248,0.45)', margin: '0.5rem 0 0', maxWidth: 300, lineHeight: 1.5 }}>
            Impegni, scadenze e finanze — con input vocale, ovunque tu sia.
          </p>
        </div>
        <button onClick={login} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'white', color: '#111827', border: 'none', padding: '0.875rem 1.5rem', borderRadius: '0.875rem', fontSize: '1rem', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }}>
          <GoogleIcon />
          Accedi con Google
        </button>
        <button onClick={enterDemo} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.875rem', padding: '0.625rem 1.25rem', color: 'rgba(241,241,248,0.5)', cursor: 'pointer', fontSize: '0.9rem' }}>
          👁 Vedi demo senza account
        </button>
        <p style={{ color: 'rgba(241,241,248,0.2)', fontSize: '0.78rem', margin: 0 }}>Dati privati e sincronizzati su tutti i tuoi dispositivi</p>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', minHeight: '100svh', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {isDemo && (
        <div style={{ background: 'rgba(99,102,241,0.12)', borderBottom: '1px solid rgba(99,102,241,0.25)', padding: '0.5rem 1rem', textAlign: 'center', fontSize: '0.78rem', color: '#a5b4fc' }}>
          🎭 Modalità demo — la voce apre i form, i dati non vengono salvati
          <button onClick={exitDemo} style={{ marginLeft: '0.75rem', background: 'none', border: 'none', color: '#818cf8', cursor: 'pointer', fontWeight: 600 }}>Esci</button>
        </div>
      )}

      <main style={{ flex: 1, padding: '1rem', paddingBottom: '6rem', overflowY: 'auto' }}>
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
          <Tasks user={user} isDemo={isDemo}
            onNew={() => setTaskModal('new')}
            onEdit={t => setTaskModal(t)}
          />
        )}
        {tab === 'calendar' && (
          <Calendar user={user}
            onEdit={t => setTaskModal(t)}
            onNew={(date) => setTaskModal(date ? { prefillDate: date } : 'new')}
          />
        )}
        {tab === 'finance' && (
          <Finance user={user} isDemo={isDemo}
            onNew={() => setExpenseModal('new')}
            onEdit={e => setExpenseModal(e)}
          />
        )}
      </main>

      <Navbar tab={tab} setTab={setTab} />
      <VoiceButton onResult={handleVoiceResult} />

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

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  )
}
