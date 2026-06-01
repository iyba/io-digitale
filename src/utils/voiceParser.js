// ─── Italian date/time NLP parser ────────────────────────────────────────────

const MONTHS_IT = {
  gennaio: 1, febbraio: 2, marzo: 3, aprile: 4, maggio: 5, giugno: 6,
  luglio: 7, agosto: 8, settembre: 9, ottobre: 10, novembre: 11, dicembre: 12,
  gen: 1, feb: 2, mar: 3, apr: 4, mag: 5, giu: 6,
  lug: 7, ago: 8, set: 9, ott: 10, nov: 11, dic: 12,
}

const WEEKDAYS_IT = {
  lunedì: 1, martedì: 2, mercoledì: 3, giovedì: 4,
  venerdì: 5, sabato: 6, domenica: 0,
  lune: 1, marti: 2, merco: 3, giove: 4, vener: 5, saba: 6, dome: 0,
}

const EXPENSE_SIGNALS = [
  'speso', 'pagato', 'costato', 'costa', 'ho speso', 'ho pagato',
  'acquistato', 'comprato', 'euro', '€', 'eur',
  'stipendio', 'guadagnato', 'guadagno', 'entrata', 'incassato',
  'ricevuto', 'rimborso', 'fattura', 'bolletta',
]

const TASK_CATEGORY_KEYWORDS = {
  Lavoro: ['lavoro', 'ufficio', 'riunione', 'meeting', 'cliente', 'progetto', 'scadenza', 'presentazione', 'call', 'collega', 'capo', 'azienda', 'email', 'report'],
  Salute: ['medico', 'dottore', 'dentista', 'farmacia', 'visita', 'analisi', 'ospedale', 'fisioterapia', 'palestra', 'sport', 'corsa', 'allenamento'],
  Casa: ['casa', 'pulizie', 'spesa', 'supermercato', 'riparare', 'comprare', 'affitto', 'bolletta', 'lavanderia', 'cucina'],
  Famiglia: ['mamma', 'papà', 'padre', 'madre', 'figli', 'figlio', 'figlia', 'fratello', 'sorella', 'nonno', 'nonna', 'famiglia', 'parenti', 'compleanno'],
  Personale: ['leggere', 'libro', 'studiare', 'corso', 'hobby', 'viaggi', 'vacanza', 'ristorante', 'cinema', 'amici', 'amico'],
}

const EXPENSE_CATEGORY_KEYWORDS = {
  Cibo: ['supermercato', 'coop', 'esselunga', 'lidl', 'conad', 'colazione', 'pranzo', 'cena', 'pizza', 'ristorante', 'bar', 'caffè', 'caffe', 'snack', 'cibo', 'mangiare', 'panino', 'sushi', 'gelato', 'spesa alimentare'],
  Casa: ['affitto', 'luce', 'gas', 'acqua', 'internet', 'wifi', 'telefono fisso', 'condominio', 'mutuo', 'bolletta', 'netflix', 'spotify', 'disney', 'prime', 'abbonamento', 'mobili', 'ikea', 'pulizie', 'detersivo'],
  Moto: ['moto', 'scooter', 'casco', 'motorino'],
  Macchina: ['benzina', 'carburante', 'diesel', 'gasolio', 'autostrada', 'parcheggio', 'auto', 'macchina', 'tagliando', 'gomme', 'pneumatici', 'bollo', 'assicurazione', 'revisione', 'meccanico', 'taxi', 'uber', 'bus', 'metro'],
  Viaggi: ['hotel', 'albergo', 'volo', 'aereo', 'treno', 'biglietto', 'vacanza', 'viaggio', 'airbnb', 'crociera', 'pernottamento'],
  Personale: ['vestiti', 'scarpe', 'camicia', 'pantaloni', 'giacca', 'jeans', 'maglietta', 'zara', 'h&m', 'farmacia', 'medicine', 'medico', 'dentista', 'occhiali', 'parrucchiere', 'barbiere', 'palestra', 'profumo'],
  Svago: ['cinema', 'teatro', 'concerto', 'concerti', 'gioco', 'giochi', 'videogioco', 'libro', 'museo', 'discoteca', 'aperitivo'],
  Stipendio: ['stipendio', 'salario', 'paga', 'cedolino'],
  Freelance: ['freelance', 'progetto', 'cliente', 'fattura', 'consulenza', 'lavoro extra'],
  Investimenti: ['investimento', 'azioni', 'etf', 'crypto', 'bitcoin', 'dividendo'],
  Regalo: ['regalo', 'regalato'],
  Rimborso: ['rimborso', 'rimborsato'],
}

// ─── Date parsing ─────────────────────────────────────────────────────────────

function parseDate(text) {
  const lower = text.toLowerCase()
  const today = new Date()

  // "oggi"
  if (/\boggi\b/.test(lower)) return toISO(today)

  // "domani"
  if (/\bdomani\b/.test(lower)) return toISO(addDays(today, 1))

  // "dopodomani"
  if (/\bdopodomani\b/.test(lower)) return toISO(addDays(today, 2))

  // "tra X giorni"
  const traDays = lower.match(/tra\s+(\d+)\s+giorn/)
  if (traDays) return toISO(addDays(today, parseInt(traDays[1])))

  // "tra X settimane"
  const traSett = lower.match(/tra\s+(\d+)\s+settiman/)
  if (traSett) return toISO(addDays(today, parseInt(traSett[1]) * 7))

  // "lunedì / martedì prossimo / questo ..."
  for (const [name, dayNum] of Object.entries(WEEKDAYS_IT)) {
    if (lower.includes(name)) {
      return toISO(nextWeekday(today, dayNum))
    }
  }

  // "7 giugno" / "il 7 giugno" / "7 di giugno"
  for (const [monthName, monthNum] of Object.entries(MONTHS_IT)) {
    const re = new RegExp(`(\\d{1,2})\\s+(?:di\\s+)?${monthName}`, 'i')
    const m = lower.match(re)
    if (m) {
      const day = parseInt(m[1])
      let year = today.getFullYear()
      const candidate = new Date(year, monthNum - 1, day)
      if (candidate < today) year++ // past date → assume next year
      return `${year}-${String(monthNum).padStart(2,'0')}-${String(day).padStart(2,'0')}`
    }
    // also "giugno 7"
    const re2 = new RegExp(`${monthName}\\s+(\\d{1,2})`, 'i')
    const m2 = lower.match(re2)
    if (m2) {
      const day = parseInt(m2[1])
      let year = today.getFullYear()
      const candidate = new Date(year, monthNum - 1, day)
      if (candidate < today) year++
      return `${year}-${String(monthNum).padStart(2,'0')}-${String(day).padStart(2,'0')}`
    }
  }

  // "il 7" / "il giorno 7" (assume current/next month)
  const ilGiorno = lower.match(/\bil\s+(?:giorno\s+)?(\d{1,2})\b/)
  if (ilGiorno) {
    const day = parseInt(ilGiorno[1])
    const d = new Date(today.getFullYear(), today.getMonth(), day)
    if (d <= today) d.setMonth(d.getMonth() + 1)
    return toISO(d)
  }

  return ''
}

function parseTime(text) {
  const lower = text.toLowerCase()

  // "alle 10:30" / "alle 10 e 30"
  const fullTime = lower.match(/alle?\s+(\d{1,2})[:\s](\d{2})/)
  if (fullTime) return `${String(parseInt(fullTime[1])).padStart(2,'0')}:${fullTime[2]}`

  // "alle 10 e mezza"
  const eMezza = lower.match(/alle?\s+(\d{1,2})\s+e\s+mez/)
  if (eMezza) return `${String(parseInt(eMezza[1])).padStart(2,'0')}:30`

  // "alle 10 e un quarto"
  const eQuarto = lower.match(/alle?\s+(\d{1,2})\s+e\s+(?:un\s+)?quarto/)
  if (eQuarto) return `${String(parseInt(eQuarto[1])).padStart(2,'0')}:15`

  // "alle 10" solo
  const semplice = lower.match(/alle?\s+(\d{1,2})\b/)
  if (semplice) {
    let h = parseInt(semplice[1])
    if (/di\s+pomeriggio|del\s+pomeriggio/.test(lower) && h < 12) h += 12
    if (/di\s+sera|stasera/.test(lower) && h < 12) h += 12
    return `${String(h).padStart(2,'0')}:00`
  }

  return ''
}

// ─── Expense parsing ──────────────────────────────────────────────────────────

function parseAmountAndType(text) {
  const lower = text.toLowerCase()

  // Detect income
  const isIncome = /stipendio|guadagnato|guadagno|entrata|incassato|ricevuto|rimborso|fattura|mi\s+hanno\s+pagato/.test(lower)

  // Extract amount
  // "10 euro" / "10€" / "10,50 euro" / "dieci euro"
  const amountMatch = lower.match(/(\d+(?:[.,]\d{1,2})?)\s*(?:euro|€|eur)?/)
  let amount = amountMatch ? parseFloat(amountMatch[1].replace(',', '.')) : null

  // Word numbers (basic)
  if (!amount) {
    const words = { 'uno': 1, 'due': 2, 'tre': 3, 'quattro': 4, 'cinque': 5, 'sei': 6, 'sette': 7, 'otto': 8, 'nove': 9, 'dieci': 10, 'venti': 20, 'trenta': 30, 'cento': 100 }
    for (const [word, val] of Object.entries(words)) {
      if (lower.includes(word)) { amount = val; break }
    }
  }

  return { amount, type: isIncome ? 'entrata' : 'spesa' }
}

function detectExpenseCategory(text) {
  const lower = text.toLowerCase()
  for (const [cat, keywords] of Object.entries(EXPENSE_CATEGORY_KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw))) return cat
  }
  return 'Altro'
}

// ─── Task parsing ─────────────────────────────────────────────────────────────

function detectTaskCategory(text) {
  const lower = text.toLowerCase()
  for (const [cat, keywords] of Object.entries(TASK_CATEGORY_KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw))) return cat
  }
  return 'Personale'
}

function detectPriority(text) {
  const lower = text.toLowerCase()
  if (/urgent|importantissim|assolutamente|subito|entro oggi/.test(lower)) return 'alta'
  if (/quando puoi|non urgente|bassa priorità|senza fretta/.test(lower)) return 'bassa'
  return 'media'
}

function cleanTitle(text) {
  return text
    // Remove date/time phrases
    .replace(/\b(domani|dopodomani|oggi|l'altro ieri|ieri)\b/gi, '')
    .replace(/\b(lunedì|martedì|mercoledì|giovedì|venerdì|sabato|domenica)\b/gi, '')
    .replace(/tra\s+\d+\s+(giorn|settiman)\w+/gi, '')
    .replace(/\d{1,2}\s+(gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre)/gi, '')
    .replace(/alle?\s+\d{1,2}(?:[:\s]\d{2})?\s*(?:di\s+(?:pomeriggio|mattina|sera))?/gi, '')
    .replace(/il\s+\d{1,2}(?:\s+del\s+mese)?/gi, '')
    // Remove filler words
    .replace(/\b(devo|ho|voglio|ricordami\s+di|non\s+dimenticare(?:re)?|mi\s+ricord[oi]\s+di|promemoria|memo)\b/gi, '')
    // Capitalize first letter
    .replace(/\s+/g, ' ').trim()
    .replace(/^[a-z]/, c => c.toUpperCase())
    // Remove leading/trailing punctuation
    .replace(/^[\s,.:]+|[\s,.:]+$/g, '')
}

// ─── Main auto-parse function ─────────────────────────────────────────────────

export function parseVoiceAuto(rawText) {
  const lower = rawText.toLowerCase()

  // Detect if expense
  const isExpense = EXPENSE_SIGNALS.some(s => lower.includes(s)) && /\d/.test(lower)

  if (isExpense) {
    const { amount, type } = parseAmountAndType(rawText)
    const category = detectExpenseCategory(rawText)
    const date = parseDate(rawText) || new Date().toISOString().split('T')[0]
    const description = cleanTitle(rawText
      .replace(/(\d+(?:[.,]\d{1,2})?)\s*(?:euro|€|eur)?/gi, '')
      .replace(/\b(ho speso|ho pagato|pagato|speso|costato|costa|acquistato|comprato)\b/gi, '')
    ) || category

    return {
      kind: 'expense',
      data: { type, amount, category, description, date },
      summary: `${type === 'entrata' ? '💰 Entrata' : '💸 Spesa'} €${amount?.toFixed(2)} — ${category}`,
    }
  } else {
    const deadline = parseDate(rawText)
    const time = parseTime(rawText)
    const category = detectTaskCategory(rawText)
    const priority = detectPriority(rawText)
    const title = cleanTitle(rawText) || rawText.trim()

    return {
      kind: 'task',
      data: {
        title,
        deadline,
        time: time || '',
        category,
        priority,
        notes: '',
        completed: false,
      },
      summary: `📋 ${title}${deadline ? ` — ${formatDateIT(deadline)}` : ''}${time ? ` alle ${time}` : ''}`,
    }
  }
}

// ─── Legacy exports (used by modals) ─────────────────────────────────────────

export function parseVoiceToTask(text) {
  const result = parseVoiceAuto(text)
  return result.kind === 'task' ? result.data : { title: text, deadline: '', priority: 'media', category: 'Personale' }
}

export function parseVoiceToExpense(text) {
  const result = parseVoiceAuto(text)
  return result.kind === 'expense' ? result.data : { description: text, amount: '', category: 'Altro', type: 'spesa', date: new Date().toISOString().split('T')[0] }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toISO(date) {
  return date.toISOString().split('T')[0]
}

function addDays(date, n) {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

function nextWeekday(from, targetDay) {
  const d = new Date(from)
  const current = d.getDay()
  let diff = targetDay - current
  if (diff <= 0) diff += 7
  d.setDate(d.getDate() + diff)
  return d
}

function formatDateIT(isoDate) {
  if (!isoDate) return ''
  const d = new Date(isoDate + 'T00:00:00')
  const months = ['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic']
  return `${d.getDate()} ${months[d.getMonth()]}`
}
