import { useState, useRef, useCallback, useEffect } from 'react'

const ERRORS = {
  'not-allowed':     'Microfono bloccato — abilitalo nelle impostazioni',
  'no-speech':       'Non ho sentito nulla — riprova',
  'audio-capture':   'Microfono non trovato',
  'network':         'Errore di rete — riprova',
  'aborted':         '',
  'service-not-allowed': 'Microfono bloccato — abilitalo nelle impostazioni',
}

export default function VoiceButton({ onResult, autoListen, onAutoListenDone }) {
  const [state, setState] = useState('idle')
  const [transcript, setTranscript] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [bigPrompt, setBigPrompt] = useState(false)
  const stateRef = useRef('idle')
  const recogRef = useRef(null)

  const setS = (s) => { stateRef.current = s; setState(s) }

  const supported = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window

  const start = useCallback(() => {
    if (stateRef.current === 'listening') {
      recogRef.current?.stop()
      return
    }
    setErrorMsg('')
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const recog = new SpeechRecognition()
    recog.lang = 'it-IT'
    recog.continuous = false
    recog.interimResults = true
    recogRef.current = recog

    recog.onstart = () => { setS('listening'); setTranscript('') }

    recog.onresult = (e) => {
      const t = Array.from(e.results).map(r => r[0].transcript).join(' ')
      setTranscript(t)
      if (e.results[e.results.length - 1].isFinal) {
        setS('processing')
        setTimeout(() => { onResult(t); setS('idle'); setTranscript(''); setBigPrompt(false) }, 300)
      }
    }

    recog.onerror = (e) => {
      const msg = ERRORS[e.error] ?? ''
      if (msg) setErrorMsg(msg)
      setS('idle')
      setTranscript('')
      setTimeout(() => setErrorMsg(''), 3000)
    }

    recog.onend = () => {
      if (stateRef.current === 'listening') setS('idle')
    }

    try {
      recog.start()
    } catch {
      setErrorMsg('Microfono non disponibile')
      setS('idle')
    }
  }, [onResult])

  // Quando arriva ?listen=1 → mostra il grande prompt "tocca e parla"
  useEffect(() => {
    if (autoListen && supported) {
      setBigPrompt(true)
    }
  }, [autoListen, supported])

  if (!supported) return null

  const isListening = state === 'listening'

  return (
    <>
      {/* GRANDE PROMPT a tutto schermo (Action Button) */}
      {bigPrompt && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(7,7,15,0.96)', backdropFilter: 'blur(8px)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: '2rem', padding: '2rem',
        }}>
          <button
            onClick={() => { if (!isListening) start() }}
            style={{
              width: 140, height: 140, borderRadius: '50%', border: 'none', cursor: 'pointer',
              background: isListening
                ? 'radial-gradient(circle, #ef4444, #dc2626)'
                : 'linear-gradient(135deg, #7c3aed, #4f46e5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: isListening
                ? '0 0 0 16px rgba(239,68,68,0.12), 0 0 60px rgba(239,68,68,0.5)'
                : '0 0 60px rgba(124,58,237,0.5)',
              transition: 'all 0.3s cubic-bezier(0.34,1.56,0.64,1)',
              transform: isListening ? 'scale(1.05)' : 'scale(1)',
            }}
          >
            {isListening ? (
              <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                {[0,1,2,3].map(i => (
                  <span key={i} style={{
                    width: 5, height: 24 + (i % 2) * 16, borderRadius: 3, background: 'white',
                    animation: `waveBar 0.7s ease-in-out ${i * 0.12}s infinite alternate`,
                  }} />
                ))}
              </div>
            ) : (
              <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/>
                <path d="M19 10v2a7 7 0 01-14 0v-2"/>
                <line x1="12" y1="19" x2="12" y2="23"/>
                <line x1="8" y1="23" x2="16" y2="23"/>
              </svg>
            )}
          </button>

          <div style={{ textAlign: 'center', minHeight: 60 }}>
            {errorMsg ? (
              <p style={{ margin: 0, color: '#fca5a5', fontSize: '1rem', fontWeight: 500 }}>⚠️ {errorMsg}</p>
            ) : isListening ? (
              <p style={{ margin: 0, color: '#c4b5fd', fontSize: '1.1rem', fontWeight: 600 }}>
                {transcript || 'Sto ascoltando…'}
              </p>
            ) : (
              <p style={{ margin: 0, color: '#f1f1f8', fontSize: '1.2rem', fontWeight: 700 }}>
                Tocca e parla 🎤
              </p>
            )}
            <p style={{ margin: '0.5rem 0 0', color: 'rgba(241,241,248,0.4)', fontSize: '0.82rem' }}>
              Es: "ho speso 50 euro di benzina"
            </p>
          </div>

          <button
            onClick={() => { recogRef.current?.stop(); setBigPrompt(false); setS('idle'); setTranscript(''); onAutoListenDone?.() }}
            style={{
              background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '0.875rem', padding: '0.625rem 1.5rem', color: 'rgba(241,241,248,0.6)',
              cursor: 'pointer', fontSize: '0.9rem', fontWeight: 500,
            }}
          >
            Chiudi
          </button>

          <style>{`@keyframes waveBar { from{transform:scaleY(0.4)} to{transform:scaleY(1)} }`}</style>
        </div>
      )}

      {/* Toast piccolo (uso normale dal pulsante flottante) */}
      {!bigPrompt && (isListening || transcript || errorMsg) && (
        <div style={{
          position: 'fixed',
          bottom: 'calc(5.5rem + env(safe-area-inset-bottom))',
          left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(15,15,25,0.95)',
          border: `1px solid ${errorMsg ? 'rgba(239,68,68,0.3)' : 'rgba(167,139,250,0.3)'}`,
          borderRadius: '1.25rem',
          padding: '0.875rem 1.25rem',
          maxWidth: 300, width: 'calc(100% - 4rem)',
          textAlign: 'center', zIndex: 60,
          fontSize: '0.875rem',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          backdropFilter: 'blur(20px)',
        }}>
          {errorMsg ? (
            <span style={{ color: '#fca5a5' }}>⚠️ {errorMsg}</span>
          ) : isListening ? (
            <span style={{ color: '#c4b5fd' }}>
              <span style={{ display: 'inline-flex', gap: 3, alignItems: 'center', marginRight: 8 }}>
                {[0,1,2].map(i => (
                  <span key={i} style={{
                    width: 3, height: 12 + i * 4, borderRadius: 2, background: '#a78bfa',
                    animation: `waveBar 0.8s ease-in-out ${i * 0.15}s infinite alternate`,
                    display: 'inline-block',
                  }} />
                ))}
              </span>
              {transcript || 'Sto ascoltando...'}
            </span>
          ) : (
            <span style={{ color: 'rgba(241,241,248,0.8)' }}>{transcript}</span>
          )}
          <style>{`@keyframes waveBar { from{transform:scaleY(0.4)} to{transform:scaleY(1)} }`}</style>
        </div>
      )}

      {/* Pulsante flottante (uso normale) */}
      <button
        onClick={start}
        title={isListening ? 'Ferma' : 'Parla'}
        style={{
          position: 'fixed',
          bottom: 'calc(4.75rem + env(safe-area-inset-bottom))',
          right: '1.25rem',
          width: 52, height: 52,
          borderRadius: '50%',
          background: isListening
            ? 'radial-gradient(circle, #ef4444, #dc2626)'
            : 'linear-gradient(135deg, #7c3aed, #4f46e5)',
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: isListening
            ? '0 0 0 8px rgba(239,68,68,0.15), 0 4px 20px rgba(239,68,68,0.4)'
            : '0 4px 20px rgba(124,58,237,0.5)',
          transition: 'all 0.25s cubic-bezier(0.34,1.56,0.64,1)',
          zIndex: 60,
          transform: isListening ? 'scale(1.1)' : 'scale(1)',
        }}
      >
        {isListening ? (
          <svg width="18" height="18" fill="white" viewBox="0 0 24 24">
            <rect x="6" y="6" width="12" height="12" rx="2" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/>
            <path d="M19 10v2a7 7 0 01-14 0v-2"/>
            <line x1="12" y1="19" x2="12" y2="23"/>
            <line x1="8" y1="23" x2="16" y2="23"/>
          </svg>
        )}
      </button>
    </>
  )
}
