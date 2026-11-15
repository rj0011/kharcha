// ---------- Local data store (localStorage) + helpers ----------
const KEY = 'kharcha_data_v1'

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
export const now = () => Date.now()

export const METHODS = [
  { id: 'Paytm', icon: '💙' },
  { id: 'UPI', icon: '📲' },
  { id: 'Cash', icon: '💵' },
  { id: 'Card', icon: '💳' },
  { id: 'Bank', icon: '🏦' },
]

export const COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#ef4444', '#8b5cf6', '#84cc16', '#f97316', '#14b8a6', '#3b82f6', '#a855f7', '#64748b']

const defCats = [
  ['food', 'Food & Dining', '🍔', 'expense'],
  ['grocery', 'Groceries', '🛒', 'expense'],
  ['travel', 'Travel', '🚕', 'expense'],
  ['fuel', 'Fuel', '⛽', 'expense'],
  ['bills', 'Bills & Recharge', '⚡', 'expense'],
  ['rent', 'Rent', '🏠', 'expense'],
  ['shopping', 'Shopping', '🛍️', 'expense'],
  ['health', 'Health', '💊', 'expense'],
  ['education', 'Education', '📚', 'expense'],
  ['fun', 'Entertainment', '🎬', 'expense'],
  ['emi', 'EMI / Loan', '🏦', 'expense'],
  ['family', 'Family', '👨‍👩‍👧', 'expense'],
  ['other', 'Other', '📦', 'expense'],
  ['salary', 'Salary', '💼', 'income'],
  ['cashback', 'Cashback / Refund', '🎁', 'income'],
  ['otherin', 'Other Income', '💰', 'income'],
]

export function defaultData() {
  const t = now()
  return {
    settings: {
      name: '',
      salary: 0,
      salaryDay: 1,
      openingBalance: 0,
      monthlyBudget: 0,
      defaultMethod: 'Paytm',
      theme: 'system',
      autoSync: true,
      updatedAt: 0,
    },
    categories: defCats.map(([id, name, icon, kind], i) => ({ id, name, icon, kind, color: COLORS[i % COLORS.length], budget: 0, updatedAt: 0 })),
    txns: [],
    _t: t,
  }
}

export function loadData() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return defaultData()
    const d = JSON.parse(raw)
    const def = defaultData()
    return { ...def, ...d, settings: { ...def.settings, ...d.settings } }
  } catch {
    return defaultData()
  }
}

export function saveData(d) {
  try { localStorage.setItem(KEY, JSON.stringify(d)) } catch { /* storage full */ }
}

// Merge local + remote (Drive) — newest updatedAt wins per item; deletes are kept as tombstones
export function mergeData(a, b) {
  if (!b) return a
  if (!a) return b
  const mergeList = (x = [], y = []) => {
    const m = new Map()
    for (const it of [...x, ...y]) {
      const old = m.get(it.id)
      if (!old || (it.updatedAt || 0) >= (old.updatedAt || 0)) m.set(it.id, it)
    }
    return [...m.values()]
  }
  return {
    ...a,
    settings: (b.settings?.updatedAt || 0) > (a.settings?.updatedAt || 0) ? { ...a.settings, ...b.settings } : a.settings,
    categories: mergeList(a.categories, b.categories),
    txns: mergeList(a.txns, b.txns),
  }
}

// ---------- Date helpers ----------
export const pad = (n) => String(n).padStart(2, '0')
export const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const parseYmd = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d) }
export const today = () => ymd(new Date())
export const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x }

export function weekRange(date = new Date()) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const day = (d.getDay() + 6) % 7 // Monday = 0
  const start = addDays(d, -day)
  return { start: ymd(start), end: ymd(addDays(start, 6)) }
}

// Salary cycle: salaryDay=1 => calendar month. salaryDay=7 => 7 Nov – 6 Dec
export function cycleRange(date = new Date(), salaryDay = 1) {
  const sd = Math.min(Math.max(+salaryDay || 1, 1), 28)
  let y = date.getFullYear(), m = date.getMonth()
  if (date.getDate() < sd) m -= 1
  const start = new Date(y, m, sd)
  const end = addDays(new Date(y, m + 1, sd), -1)
  return { start: ymd(start), end: ymd(end) }
}

export const inRange = (s, r) => s >= r.start && s <= r.end

export function daysBetween(a, b) {
  return Math.round((parseYmd(b) - parseYmd(a)) / 86400000) + 1
}

// ---------- Formatting ----------
const inr0 = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })
const inr2 = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 })
export const money = (n, dec = false) => (dec ? inr2 : inr0).format(Math.round((+n || 0) * 100) / 100)
export const shortMoney = (n) => {
  const a = Math.abs(n)
  if (a >= 1e7) return '₹' + (n / 1e7).toFixed(1) + 'Cr'
  if (a >= 1e5) return '₹' + (n / 1e5).toFixed(1) + 'L'
  if (a >= 1e3) return '₹' + (n / 1e3).toFixed(1) + 'k'
  return '₹' + Math.round(n)
}
export const fmtDate = (s, opt = { day: 'numeric', month: 'short' }) => parseYmd(s).toLocaleDateString('en-IN', opt)
export function dayLabel(s) {
  const t = today()
  if (s === t) return 'Today'
  if (s === ymd(addDays(new Date(), -1))) return 'Yesterday'
  return fmtDate(s, { weekday: 'short', day: 'numeric', month: 'short', year: s.slice(0, 4) === t.slice(0, 4) ? undefined : 'numeric' })
}

export const sum = (arr) => arr.reduce((s, t) => s + (+t.amount || 0), 0)

// ---------- Export ----------
export function toCSV(txns, cats) {
  const cm = Object.fromEntries(cats.map((c) => [c.id, c.name]))
  const rows = [['Date', 'Type', 'Category', 'Amount', 'Method', 'Note']]
  for (const t of [...txns].sort((a, b) => a.date.localeCompare(b.date)))
    rows.push([t.date, t.type, cm[t.catId] || t.catId, t.amount, t.method, (t.note || '').replace(/"/g, '""')])
  return rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n')
}

export function download(name, text, type = 'text/plain') {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([text], { type }))
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 2000)
}
