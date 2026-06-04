import { useState, useMemo } from 'react'
import { useCollection } from '../hooks/useCollection'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis } from 'recharts'

const CATS_SPESA = ['Casa', 'Cibo', 'Moto', 'Macchina', 'Personale', 'Viaggi', 'Svago', 'Altro']

const CAT_STYLES = {
  Casa:         { icon: '🏠', color: '#818cf8', bg: 'rgba(129,140,248,0.15)' },
  Cibo:         { icon: '🍕', color: '#fb923c', bg: 'rgba(251,146,60,0.15)' },
  Moto:         { icon: '🏍️', color: '#f87171', bg: 'rgba(248,113,113,0.15)' },
  Macchina:     { icon: '🚗', color: '#60a5fa', bg: 'rgba(96,165,250,0.15)' },
  Personale:    { icon: '🧴', color: '#f472b6', bg: 'rgba(244,114,182,0.15)' },
  Viaggi:       { icon: '✈️', color: '#34d399', bg: 'rgba(52,211,153,0.15)' },
  Svago:        { icon: '🎭', color: '#c084fc', bg: 'rgba(192,132,252,0.15)' },
  Stipendio:    { icon: '💼', color: '#4ade80', bg: 'rgba(74,222,128,0.15)' },
  Freelance:    { icon: '💻', color: '#34d399', bg: 'rgba(52,211,153,0.15)' },
  Investimenti: { icon: '📈', color: '#fbbf24', bg: 'rgba(251,191,36,0.15)' },
  Regalo:       { icon: '🎁', color: '#f472b6', bg: 'rgba(244,114,182,0.15)' },
  Rimborso:     { icon: '↩️', color: '#60a5fa', bg: 'rgba(96,165,250,0.15)' },
  Altro:        { icon: '📦', color: '#94a3b8', bg: 'rgba(148,163,184,0.15)' },
}

const MONTHS = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic']

export default function Finance({ user, onNew, onEdit }) {
  const { items: expenses } = useCollection('expenses', user.uid)
  const { items: recurring, remove: removeRecurring } = useCollection('recurring', user.uid)
  const recurringExpenses = recurring.filter(r => r.kind === 'expense' && r.active !== false)
  const now = new Date()
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth())
  const [selectedYear] = useState(now.getFullYear())
  const [view, setView] = useState('lista')

  // Budget mensile (salvato sul dispositivo)
  const [budget, setBudget] = useState(() => Number(localStorage.getItem('budget')) || 0)
  const [editingBudget, setEditingBudget] = useState(false)
  const [budgetInput, setBudgetInput] = useState('')

  function saveBudget() {
    const n = Math.max(0, parseFloat(String(budgetInput).replace(',', '.')) || 0)
    setBudget(n)
    localStorage.setItem('budget', String(n))
    setEditingBudget(false)
  }

  function exportCSV() {
    const rows = [['Data', 'Tipo', 'Categoria', 'Descrizione', 'Importo']]
    monthExpenses.forEach(e => rows.push([e.date, e.type, e.category, e.description || '', String(e.amount)]))
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `spese-${MONTHS[selectedMonth]}-${selectedYear}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const monthExpenses = useMemo(() =>
    expenses.filter(e => {
      const d = new Date(e.date)
      return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear
    }).sort((a, b) => b.date.localeCompare(a.date)),
    [expenses, selectedMonth, selectedYear]
  )

  const spese = monthExpenses.filter(e => e.type === 'spesa')
  const totaleSpese = spese.reduce((s, e) => s + e.amount, 0)
  const totaleEntrate = monthExpenses.filter(e => e.type === 'entrata').reduce((s, e) => s + e.amount, 0)
  const saldo = totaleEntrate - totaleSpese

  const byCat = useMemo(() => {
    const map = {}
    spese.forEach(e => { map[e.category] = (map[e.category] || 0) + e.amount })
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
  }, [spese])

  const last6Months = useMemo(() => Array.from({ length: 6 }, (_, i) => {
    const d = new Date(selectedYear, selectedMonth - 5 + i, 1)
    const m = d.getMonth(), y = d.getFullYear()
    const data = expenses.filter(e => { const ed = new Date(e.date); return ed.getMonth() === m && ed.getFullYear() === y })
    return {
      name: MONTHS[m],
      spese: data.filter(e => e.type === 'spesa').reduce((s, e) => s + e.amount, 0),
      entrate: data.filter(e => e.type === 'entrata').reduce((s, e) => s + e.amount, 0),
    }
  }), [expenses, selectedMonth, selectedYear])

  const tooltipStyle = { background: 'var(--bg-elev)', border: '1px solid rgba(var(--surface-rgb),0.1)', borderRadius: '0.75rem', color: 'var(--text)', fontSize: '0.8rem' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', paddingTop: '0.5rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.03em' }}>Finanze</h1>
          <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: 'rgba(var(--text-rgb),0.4)' }}>
            {MONTHS[selectedMonth]} {selectedYear}
          </p>
        </div>
        <button onClick={onNew} style={{
          background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
          border: 'none', borderRadius: '0.875rem', padding: '0.625rem 1rem',
          color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: '0.875rem',
          boxShadow: '0 4px 14px rgba(124,58,237,0.4)',
        }}>
          + Aggiungi
        </button>
      </div>

      {/* Month selector */}
      <div style={{ display: 'flex', gap: '0.375rem', overflowX: 'auto', paddingBottom: '0.125rem' }}>
        {MONTHS.map((m, i) => (
          <button key={m} onClick={() => setSelectedMonth(i)} style={{
            padding: '0.4rem 0.875rem', borderRadius: '999px', whiteSpace: 'nowrap',
            border: `1.5px solid ${selectedMonth === i ? '#7c3aed' : 'rgba(var(--surface-rgb),0.1)'}`,
            background: selectedMonth === i ? 'rgba(124,58,237,0.15)' : 'transparent',
            color: selectedMonth === i ? '#c4b5fd' : 'rgba(var(--text-rgb),0.4)',
            cursor: 'pointer', fontSize: '0.8rem', fontWeight: selectedMonth === i ? 600 : 400,
            transition: 'all 0.15s',
          }}>{m}</button>
        ))}
      </div>

      {/* Balance hero */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(124,58,237,0.15) 0%, rgba(79,70,229,0.08) 100%)',
        border: '1px solid rgba(124,58,237,0.2)',
        borderRadius: '1.5rem', padding: '1.25rem',
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -30, right: -30, width: 100, height: 100, borderRadius: '50%', background: 'rgba(124,58,237,0.2)', filter: 'blur(20px)', pointerEvents: 'none' }} />
        <BalanceCard amount={totaleEntrate} label="Entrate" color="#4ade80" sign="+" />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', borderLeft: '1px solid rgba(var(--surface-rgb),0.08)', borderRight: '1px solid rgba(var(--surface-rgb),0.08)' }}>
          <BalanceCard amount={totaleSpese} label="Spese" color="#fb923c" sign="-" />
        </div>
        <BalanceCard amount={Math.abs(saldo)} label="Saldo" color={saldo >= 0 ? '#4ade80' : '#f87171'} sign={saldo >= 0 ? '+' : '-'} />
      </div>

      {/* Budget mensile */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '1.25rem', padding: '1rem 1.125rem' }}>
        {budget > 0 && !editingBudget ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.6rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ fontSize: '0.85rem' }}>🎯</span>
                <p style={{ margin: 0, fontWeight: 700, fontSize: '0.875rem', color: 'var(--text)' }}>Budget mensile</p>
                <button onClick={() => { setBudgetInput(String(budget)); setEditingBudget(true) }} style={{ background: 'none', border: 'none', color: '#a78bfa', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600 }}>modifica</button>
              </div>
              <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 700, color: totaleSpese > budget ? '#ef4444' : 'rgba(var(--text-rgb),0.6)' }}>
                €{totaleSpese.toFixed(0)} / €{budget.toFixed(0)}
              </p>
            </div>
            <div style={{ background: 'rgba(var(--surface-rgb),0.08)', borderRadius: '999px', height: 8, overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${Math.min(totaleSpese / budget * 100, 100)}%`,
                background: totaleSpese >= budget ? 'linear-gradient(90deg, #ef4444, #f97316)'
                  : totaleSpese >= budget * 0.8 ? 'linear-gradient(90deg, #f59e0b, #fb923c)'
                  : 'linear-gradient(90deg, #10b981, #34d399)',
                borderRadius: '999px', transition: 'width 0.4s ease',
              }} />
            </div>
            <p style={{ margin: '0.5rem 0 0', fontSize: '0.74rem', color: totaleSpese > budget ? '#fca5a5' : 'rgba(var(--text-rgb),0.45)' }}>
              {totaleSpese > budget
                ? `⚠️ Superato di €${(totaleSpese - budget).toFixed(0)}`
                : `Ti restano €${(budget - totaleSpese).toFixed(0)} questo mese`}
            </p>
          </>
        ) : editingBudget ? (
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem' }}>🎯</span>
            <input
              type="number" inputMode="decimal" value={budgetInput}
              onChange={e => setBudgetInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && saveBudget()}
              placeholder="Limite €" autoFocus style={{ flex: 1 }}
            />
            <button onClick={saveBudget} style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', border: 'none', borderRadius: '0.75rem', padding: '0.5rem 1rem', color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: '0.82rem' }}>OK</button>
          </div>
        ) : (
          <button onClick={() => { setBudgetInput(''); setEditingBudget(true) }} style={{
            width: '100%', background: 'none', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
            color: 'rgba(var(--text-rgb),0.5)', fontSize: '0.85rem', fontWeight: 500,
          }}>
            🎯 Imposta un budget mensile
          </button>
        )}
      </div>

      {/* View toggle — 3 views */}
      <div style={{ display: 'flex', background: 'rgba(var(--surface-rgb),0.04)', border: '1px solid rgba(var(--surface-rgb),0.07)', borderRadius: '0.875rem', padding: '0.25rem', gap: '0.25rem' }}>
        {[
          { id: 'lista', label: '📋 Lista' },
          { id: 'categorie', label: '🏷️ Categorie' },
          { id: 'grafici', label: '📊 Grafici' },
        ].map(v => (
          <button key={v.id} onClick={() => setView(v.id)} style={{
            flex: 1, padding: '0.5rem 0.25rem', borderRadius: '0.65rem',
            background: view === v.id ? 'rgba(var(--surface-rgb),0.08)' : 'transparent',
            border: 'none', color: view === v.id ? 'var(--text)' : 'rgba(var(--text-rgb),0.35)',
            cursor: 'pointer', fontWeight: view === v.id ? 600 : 400, fontSize: '0.78rem',
            transition: 'all 0.15s', whiteSpace: 'nowrap',
          }}>
            {v.label}
          </button>
        ))}
      </div>

      {/* LISTA VIEW */}
      {view === 'lista' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {totaleSpese > 0 && byCat[0] && (() => {
            const prevSpese = last6Months[4]?.spese || 0
            const trend = prevSpese > 0 ? Math.round((totaleSpese - prevSpese) / prevSpese * 100) : null
            const top = byCat[0]
            return (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '1rem', padding: '0.7rem 1rem', fontSize: '0.8rem', color: 'rgba(var(--text-rgb),0.6)' }}>
                💡 Più speso in <strong style={{ color: 'var(--text)' }}>{top.name}</strong> (€{top.value.toFixed(0)})
                {trend != null && (
                  <span style={{ color: trend > 0 ? '#fca5a5' : '#86efac', fontWeight: 600 }}>
                    {' · '}{trend >= 0 ? '+' : ''}{trend}% vs mese scorso
                  </span>
                )}
              </div>
            )
          })()}
          {recurringExpenses.length > 0 && (
            <div style={{ background: 'rgba(var(--surface-rgb),0.02)', border: '1px solid rgba(124,58,237,0.15)', borderRadius: '1.25rem', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.875rem 1rem', borderBottom: '1px solid rgba(var(--surface-rgb),0.06)' }}>
                <p style={{ margin: 0, fontWeight: 700, fontSize: '0.875rem', color: 'var(--text)' }}>🔄 Abbonamenti</p>
                <span style={{ fontSize: '0.72rem', color: 'rgba(var(--text-rgb),0.4)', fontWeight: 600 }}>
                  {recurringExpenses.length} attivi · -€{recurringExpenses.reduce((s, r) => s + r.amount, 0).toFixed(2)}/mese
                </span>
              </div>
              {recurringExpenses.map(r => (
                <RecurringRow key={r.id} item={r} onDelete={() => { if (confirm(`Eliminare l'abbonamento "${r.description || r.category}"?`)) removeRecurring(r.id) }} />
              ))}
            </div>
          )}

          {monthExpenses.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
              <p style={{ fontSize: '2.5rem', margin: '0 0 0.5rem' }}>💸</p>
              <p style={{ margin: 0, color: 'rgba(var(--text-rgb),0.3)', fontSize: '0.9rem' }}>Nessuna voce per {MONTHS[selectedMonth]}</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.1rem' }}>
                <p style={{ margin: 0, fontSize: '0.72rem', color: 'rgba(var(--text-rgb),0.4)', fontWeight: 600 }}>
                  {monthExpenses.length} voci
                </p>
                <button onClick={exportCSV} style={{
                  background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.625rem',
                  padding: '0.3rem 0.7rem', color: 'rgba(var(--text-rgb),0.6)', cursor: 'pointer',
                  fontSize: '0.74rem', fontWeight: 600,
                }}>⬇ Esporta CSV</button>
              </div>
              {monthExpenses.map(e => <ExpenseCard key={e.id} expense={e} onClick={() => onEdit(e)} />)}
            </div>
          )}
        </div>
      )}

      {/* CATEGORIE VIEW */}
      {view === 'categorie' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.625rem' }}>
            {CATS_SPESA.map(cat => {
              const spent = spese.filter(e => e.category === cat).reduce((s, e) => s + e.amount, 0)
              const s = CAT_STYLES[cat] || CAT_STYLES.Altro
              const pct = totaleSpese > 0 ? (spent / totaleSpese * 100) : 0
              const hasSpending = spent > 0
              return (
                <div key={cat} style={{
                  background: hasSpending ? s.bg : 'rgba(var(--surface-rgb),0.015)',
                  border: `1px solid ${hasSpending ? s.color + '50' : 'rgba(var(--surface-rgb),0.05)'}`,
                  borderRadius: '1.25rem', padding: '1rem',
                  opacity: hasSpending ? 1 : 0.45,
                  transition: 'all 0.2s',
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '1.6rem', lineHeight: 1 }}>{s.icon}</span>
                    {hasSpending && (
                      <span style={{ fontSize: '0.68rem', fontWeight: 700, color: s.color, background: s.bg, padding: '0.15rem 0.5rem', borderRadius: '999px' }}>
                        {pct.toFixed(0)}%
                      </span>
                    )}
                  </div>
                  <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: hasSpending ? 'var(--text)' : 'rgba(var(--text-rgb),0.25)', letterSpacing: '-0.02em' }}>
                    {hasSpending ? `€${spent.toFixed(0)}` : '—'}
                  </p>
                  <p style={{ margin: '0.15rem 0 0.625rem', fontSize: '0.75rem', color: hasSpending ? 'rgba(var(--text-rgb),0.5)' : 'rgba(var(--text-rgb),0.2)' }}>
                    {cat}
                  </p>
                  <div style={{ background: 'rgba(var(--surface-rgb),0.07)', borderRadius: '999px', height: 3 }}>
                    <div style={{ width: `${pct}%`, background: s.color, height: '100%', borderRadius: '999px', transition: 'width 0.6s ease' }} />
                  </div>
                </div>
              )
            })}
          </div>

          {/* Income breakdown */}
          {totaleEntrate > 0 && (
            <div style={{ background: 'rgba(74,222,128,0.04)', border: '1px solid rgba(74,222,128,0.15)', borderRadius: '1.25rem', overflow: 'hidden' }}>
              <p style={{ margin: 0, padding: '0.875rem 1rem', fontWeight: 700, fontSize: '0.875rem', color: '#4ade80', borderBottom: '1px solid rgba(74,222,128,0.1)' }}>
                💰 Entrate del mese
              </p>
              {monthExpenses.filter(e => e.type === 'entrata').map(e => {
                const s = CAT_STYLES[e.category] || CAT_STYLES.Altro
                return (
                  <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', borderBottom: '1px solid rgba(var(--surface-rgb),0.04)' }}>
                    <span style={{ fontSize: '1.1rem' }}>{s.icon}</span>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600, color: 'var(--text)' }}>{e.description || e.category}</p>
                      <p style={{ margin: 0, fontSize: '0.7rem', color: 'rgba(var(--text-rgb),0.35)' }}>{e.category}</p>
                    </div>
                    <p style={{ margin: 0, fontWeight: 800, color: '#4ade80', fontSize: '0.9rem' }}>+€{e.amount.toFixed(2)}</p>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* GRAFICI VIEW */}
      {view === 'grafici' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {byCat.length > 0 ? (
            <>
              {/* Donut chart */}
              <div style={{ background: 'rgba(var(--surface-rgb),0.03)', border: '1px solid rgba(var(--surface-rgb),0.07)', borderRadius: '1.25rem', padding: '1.125rem' }}>
                <p style={{ margin: '0 0 0.875rem', fontWeight: 700, fontSize: '0.875rem', color: 'var(--text)' }}>Spese per categoria</p>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={byCat} cx="50%" cy="50%" innerRadius={45} outerRadius={75} dataKey="value" paddingAngle={3} strokeWidth={0}>
                      {byCat.map((entry) => (
                        <Cell key={entry.name} fill={(CAT_STYLES[entry.name] || CAT_STYLES.Altro).color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => `€${v.toFixed(2)}`} contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.625rem', marginTop: '0.75rem', justifyContent: 'center' }}>
                  {byCat.map(c => {
                    const s = CAT_STYLES[c.name] || CAT_STYLES.Altro
                    return (
                      <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem' }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.color }} />
                        <span style={{ color: 'rgba(var(--text-rgb),0.6)' }}>{s.icon} {c.name}</span>
                        <span style={{ color: 'var(--text)', fontWeight: 700 }}>€{c.value.toFixed(0)}</span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Distribution bars */}
              <div style={{ background: 'rgba(var(--surface-rgb),0.03)', border: '1px solid rgba(var(--surface-rgb),0.07)', borderRadius: '1.25rem', overflow: 'hidden' }}>
                <p style={{ margin: 0, padding: '0.875rem 1rem', fontWeight: 700, fontSize: '0.875rem', color: 'var(--text)', borderBottom: '1px solid rgba(var(--surface-rgb),0.06)' }}>
                  Distribuzione
                </p>
                {byCat.map(c => {
                  const s = CAT_STYLES[c.name] || CAT_STYLES.Altro
                  return (
                    <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', padding: '0.75rem 1rem', borderBottom: '1px solid rgba(var(--surface-rgb),0.05)' }}>
                      <span style={{ fontSize: '1.1rem', width: 24, textAlign: 'center', flexShrink: 0 }}>{s.icon}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                          <span style={{ fontSize: '0.85rem', color: 'var(--text)', fontWeight: 500 }}>{c.name}</span>
                          <span style={{ fontSize: '0.85rem', color: s.color, fontWeight: 700 }}>€{c.value.toFixed(2)}</span>
                        </div>
                        <div style={{ background: 'rgba(var(--surface-rgb),0.06)', borderRadius: '999px', height: 3, overflow: 'hidden' }}>
                          <div style={{
                            width: `${(c.value / totaleSpese * 100).toFixed(0)}%`,
                            background: s.color,
                            height: '100%', borderRadius: '999px',
                            transition: 'width 0.6s ease',
                          }} />
                        </div>
                      </div>
                      <span style={{ fontSize: '0.72rem', color: 'rgba(var(--text-rgb),0.3)', width: 30, textAlign: 'right', fontWeight: 600, flexShrink: 0 }}>
                        {(c.value / totaleSpese * 100).toFixed(0)}%
                      </span>
                    </div>
                  )
                })}
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
              <p style={{ fontSize: '2rem', margin: '0 0 0.5rem' }}>📊</p>
              <p style={{ margin: 0, color: 'rgba(var(--text-rgb),0.3)', fontSize: '0.9rem' }}>Nessuna spesa per {MONTHS[selectedMonth]}</p>
            </div>
          )}

          {/* Bar chart last 6 months */}
          <div style={{ background: 'rgba(var(--surface-rgb),0.03)', border: '1px solid rgba(var(--surface-rgb),0.07)', borderRadius: '1.25rem', padding: '1.125rem' }}>
            <p style={{ margin: '0 0 0.875rem', fontWeight: 700, fontSize: '0.875rem', color: 'var(--text)' }}>Ultimi 6 mesi</p>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={last6Months} barSize={12} barGap={2}>
                <XAxis dataKey="name" tick={{ fill: 'rgba(var(--text-rgb),0.35)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip formatter={(v) => `€${v.toFixed(2)}`} contentStyle={tooltipStyle} />
                <Bar dataKey="entrate" fill="#4ade80" radius={[4, 4, 0, 0]} />
                <Bar dataKey="spese" fill="#fb923c" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', gap: '1.25rem', justifyContent: 'center', marginTop: '0.5rem' }}>
              <Legend color="#4ade80" label="Entrate" />
              <Legend color="#fb923c" label="Spese" />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function BalanceCard({ amount, label, color, sign }) {
  return (
    <div style={{ textAlign: 'center', padding: '0 0.5rem' }}>
      <p style={{ margin: 0, color, fontWeight: 800, fontSize: '1.1rem', letterSpacing: '-0.02em' }}>
        {sign}€{amount.toFixed(0)}
      </p>
      <p style={{ margin: '0.2rem 0 0', fontSize: '0.68rem', color: 'rgba(var(--text-rgb),0.4)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
    </div>
  )
}

function ExpenseCard({ expense, onClick }) {
  const s = CAT_STYLES[expense.category] || CAT_STYLES.Altro
  return (
    <div onClick={onClick} style={{
      background: 'rgba(var(--surface-rgb),0.03)', border: '1px solid rgba(var(--surface-rgb),0.07)',
      borderRadius: '1rem', padding: '0.875rem 1rem',
      display: 'flex', alignItems: 'center', gap: '0.875rem', cursor: 'pointer',
      transition: 'background 0.15s',
    }}
    onMouseEnter={e => e.currentTarget.style.background = 'rgba(var(--surface-rgb),0.05)'}
    onMouseLeave={e => e.currentTarget.style.background = 'rgba(var(--surface-rgb),0.03)'}
    >
      <div style={{
        width: 42, height: 42, borderRadius: '0.875rem', flexShrink: 0,
        background: expense.type === 'entrata' ? 'rgba(74,222,128,0.1)' : s.bg,
        border: `1px solid ${expense.type === 'entrata' ? 'rgba(74,222,128,0.2)' : s.color + '40'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '1.1rem',
      }}>
        {s.icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontWeight: 600, color: 'var(--text)', fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '-0.01em' }}>
          {expense.description || expense.category}
        </p>
        <p style={{ margin: '0.15rem 0 0', fontSize: '0.72rem', color: 'rgba(var(--text-rgb),0.35)' }}>
          {expense.category} · {expense.date}
        </p>
      </div>
      <p style={{ margin: 0, fontWeight: 800, fontSize: '0.95rem', color: expense.type === 'entrata' ? '#4ade80' : '#fb923c', flexShrink: 0, letterSpacing: '-0.02em' }}>
        {expense.type === 'entrata' ? '+' : '-'}€{Number(expense.amount).toFixed(2)}
      </p>
    </div>
  )
}

function RecurringRow({ item, onDelete }) {
  const s = CAT_STYLES[item.category] || CAT_STYLES.Altro
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', padding: '0.75rem 1rem', borderBottom: '1px solid rgba(var(--surface-rgb),0.05)' }}>
      <div style={{
        width: 40, height: 40, borderRadius: '0.875rem', flexShrink: 0,
        background: s.bg, border: `1px solid ${s.color}40`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem',
      }}>
        {s.icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontWeight: 600, color: 'var(--text)', fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.description || item.category}
        </p>
        <p style={{ margin: '0.15rem 0 0', fontSize: '0.72rem', color: 'rgba(var(--text-rgb),0.4)' }}>
          Ogni mese il {item.dayOfMonth}° · {item.category}
        </p>
      </div>
      <p style={{ margin: 0, fontWeight: 800, fontSize: '0.9rem', color: item.type === 'entrata' ? '#4ade80' : '#f87171', flexShrink: 0, marginRight: '0.25rem' }}>
        {item.type === 'entrata' ? '+' : '-'}€{Number(item.amount).toFixed(2)}
      </p>
      <button onClick={onDelete} style={{
        background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)',
        borderRadius: '0.5rem', color: 'rgba(248,113,113,0.6)', cursor: 'pointer',
        fontSize: '0.85rem', padding: '0.35rem 0.5rem', flexShrink: 0,
      }}>🗑</button>
    </div>
  )
}

function Legend({ color, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', color: 'rgba(var(--text-rgb),0.5)' }}>
      <div style={{ width: 8, height: 8, borderRadius: 2, background: color }} />
      {label}
    </div>
  )
}
