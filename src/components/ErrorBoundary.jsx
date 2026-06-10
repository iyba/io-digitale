import { Component } from 'react'

// Evita la pagina bianca: se un componente va in errore, mostra un messaggio
// con un pulsante per ricaricare, invece di rompere tutta l'app.
export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('App error:', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          height: '100svh', background: 'var(--bg)', color: 'var(--text)', padding: '2rem', textAlign: 'center', gap: '1rem',
        }}>
          <div style={{ fontSize: '3rem' }}>😕</div>
          <p style={{ margin: 0, fontWeight: 700, fontSize: '1.1rem' }}>Qualcosa è andato storto</p>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'rgba(var(--text-rgb),0.5)', maxWidth: 280 }}>
            Riprova ricaricando l'app. I tuoi dati sono al sicuro.
          </p>
          <button onClick={() => window.location.reload()} style={{
            background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', border: 'none',
            borderRadius: '0.875rem', padding: '0.75rem 1.5rem', color: 'white',
            fontSize: '0.95rem', fontWeight: 700, cursor: 'pointer',
          }}>
            Ricarica
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
