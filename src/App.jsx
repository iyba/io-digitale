import { useState, useEffect, useCallback, lazy, Suspense } from 'react'
import { auth, db } from './firebase'
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth'
import { collection, addDoc, serverTimestamp, deleteDoc, doc } from 'firebase/firestore'
import Dashboard from './pages/Dashboard'
import Impegni from './pages/Impegni'
import Settings from './pages/Settings'
import Navbar from './components/Navbar'
import VoiceButton from './components/VoiceButton'
import TaskReminders from './components/TaskReminders'
import VoiceConfirm from './components/VoiceConfirm'
import AddTaskModal from './components/AddTaskModal'
import AddExpenseModal from './components/AddExpenseModal'
import { parseVoiceAuto } from './utils/voiceParser'
import { generateRecurringInstances } from './utils/recurringManager'
import { savePushTokenIfGranted } from './hooks/usePushNotifications'
import { sanitizeData } from './utils/sanitize'

// Finanze usa Recharts (~360KB): caricata solo quando serve
const Finance = lazy(() => import('./pages/Finance'))

function PageSpinner() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
      <div style={{ width: 32, height: 32, border: '3px solid rgba(124,58,237,0.15)', borderTopColor: '#7c3aed', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  )
}

export default function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('dashboard')
  const [taskModal, setTaskModal] = useState(null)
  const [expenseModal, setExpenseModal] = useState(null)
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

    if (!user) return

    try {
      // Nota vocale ("nota ...") → salvata come nota
      if (parsed.kind === 'note') {
        const ref = await addDoc(collection(db, 'tasks'), {
          ...sanitizeData({ title: parsed.data.text }),
          isNote: true, category: 'Nota', priority: 'bassa', completed: false,
          userId: user.uid, createdAt: serverTimestamp(),
        })
        setLastSavedId(ref.id)
        setLastSavedCol('tasks')
        setVoiceParsed({ ...parsed, rawText })
        return
      }

      // Auto-save immediato (task o spesa)
      const colName = parsed.kind === 'task' ? 'tasks' : 'expenses'
      // I campi di ricorrenza non vanno nel documento spesa: vengono estratti
      const { recurring: isRec, dayOfMonth, ...docData } = parsed.data
      const ref = await addDoc(collection(db, colName), {
        ...sanitizeData(docData),
        userId: user.uid,
        createdAt: serverTimestamp(),
      })

      // Spesa ricorrente (es. "abbonamento Netflix 15 euro al mese") → crea il template mensile
      if (parsed.kind === 'expense' && isRec) {
        await addDoc(collection(db, 'recurring'), {
          kind: 'expense', frequency: 'monthly',
          dayOfMonth: dayOfMonth || 1,
          type: docData.type, amount: docData.amount,
          category: docData.category, description: docData.description || '',
          active: true, lastGenerated: (docData.date || '').slice(0, 7),
          userId: user.uid, createdAt: serverTimestamp(),
        })
      }

      setLastSavedId(ref.id)
      setLastSavedCol(colName)
      setVoiceParsed({ ...parsed, rawText })
    } catch (err) {
      // Se il salvataggio fallisce, apri il form manuale
      if (parsed.kind === 'expense') setExpenseModal({ voice: rawText })
      else setTaskModal({ voice: rawText })
    }
  }, [user])

  // Process ?voice= URL param once auth is ready (Action Button / iOS Shortcut flow)
  useEffect(() => {
    if (!loading && user && pendingVoice) {
      handleVoiceResult(pendingVoice)
      setPendingVoice(null)
    }
  }, [loading, user, pendingVoice, handleVoiceResult])

  async function handleVoiceUndo() {
    if (lastSavedId && lastSavedCol) {
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
      <main style={{ flex: 1, minHeight: 0, padding: '1rem', paddingTop: 'calc(1rem + env(safe-area-inset-top))', paddingBottom: '1.5rem', overflowY: 'auto' }}>
        <div className="page-enter" key={tab}>
          {tab === 'dashboard' && (
            <Dashboard user={user}
              onNewTask={() => setTaskModal('new')}
              onNewExpense={() => setExpenseModal('new')}
              onEditTask={t => setTaskModal(t)}
              onEditExpense={e => setExpenseModal(e)}
              onSignOut={() => signOut(auth)}
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
            <Suspense fallback={<PageSpinner />}>
              <Finance user={user}
                onNew={() => setExpenseModal('new')}
                onEdit={e => setExpenseModal(e)}
              />
            </Suspense>
          )}
          {tab === 'settings' && (
            <Settings user={user} />
          )}
        </div>
      </main>

      <Navbar tab={tab} setTab={setTab} />
      <TaskReminders user={user} />
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

      {taskModal !== null && (
        <AddTaskModal user={user} initial={taskModal} onClose={() => setTaskModal(null)} />
      )}
      {expenseModal !== null && (
        <AddExpenseModal user={user} initial={expenseModal} onClose={() => setExpenseModal(null)} />
      )}
    </div>
  )
}
