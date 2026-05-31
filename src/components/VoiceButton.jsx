import { useState, useRef, useCallback } from 'react'

export default function VoiceButton({ onResult }) {
  const [state, setState] = useState('idle')
  const [transcript, setTranscript] = useState('')
  const recogRef = useRef(null)

  const supported = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window

  const start = useCallback(() => {
    if (state === 'listening') {
      recogRef.current?.stop()
      return
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const recog = new SpeechRecognition()
    recog.lang = 'it-IT'
    recog.continuous = false
    recog.interimResults = true
    recogRef.current = recog

    recog.onstart = () => { setState('listening'); setTranscript('') }

    recog.onresult = (e) => {
      const t = Array.from(e.results).map(r => r[0].transcript).join(' ')
      setTranscript(t)
      if (e.results[e.results.length - 1].isFinal) {
        setState('processing')
        setTimeout(() => { onResult(t); setState('idle'); setTranscript('') }, 300)
      }
    }

    recog.onerror = () => { setState('error'); setTimeout(() => setState('idle'), 2000) }
    recog.onend = () => { if (state === 'listening') setState('idle') }
    recog.start()
  }, [state, onResult])

  if (!supported) return null

  const isListening = state === 'listening'

  return (
    <>
      {(isListening || transcript) && (
        <div style={{
          position: 'fixed',
          bottom: 'calc(5.5rem + env(safe-area-inset-bottom))',
          left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(15,15,25,0.95)',
          border: '1px solid rgba(167,139,250,0.3)',
          borderRadius: '1.25rem',
          padding: '0.875rem 1.25rem',
          maxWidth: 300, width: 'calc(100% - 4rem)',
          textAlign: 'center', zIndex: 60,
          fontSize: '0.875rem', color: 'rgba(241,241,248,0.8)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(167,139,250,0.1)',
          backdropFilter: 'blur(20px)',
        }}>
          {isListening ? (
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
          ) : transcript}
          <style>{`@keyframes waveBar { from{transform:scaleY(0.4)} to{transform:scaleY(1)} }`}</style>
        </div>
      )}
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
          border: 'none',
          cursor: 'pointer',
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
