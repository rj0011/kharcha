import { useMemo, useState } from 'react'
import { t } from '../lib/i18n'
import { Card, Chip, Empty } from './ui'
import TxnRow from './TxnRow'
import Calendar from './Calendar'
import { Seg } from './ui'
import { today, weekRange, cycleRange, inRange, sum, money, dayLabel, METHODS } from '../lib/store'

export default function History({ data, catMap, onEdit, onDelete }) {
  const [view, setView] = useState('list')
  const [period, setPeriod] = useState('month')
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('')
  const [method, setMethod] = useState('')
  const [type, setType] = useState('')
  const [from, setFrom] = useState(today().slice(0, 8) + '01')
  const [to, setTo] = useState(today())

  const range = useMemo(() => {
    if (period === 'today') return { start: today(), end: today() }
    if (period === 'week') return weekRange()
    if (period === 'month') return cycleRange(new Date(), data.settings.salaryDay)
    if (period === 'custom') return { start: from, end: to }
    return { start: '0000', end: '9999' }
  }, [period, from, to, data.settings.salaryDay])

  const list = useMemo(() => {
    const ql = q.toLowerCase()
    return data.txns
      .filter((t) => !t.deleted && inRange(t.date, range) && (!cat || t.catId === cat) && (!method || t.method === method) && (!type || t.type === type))
      .filter((t) => !ql || (t.note || '').toLowerCase().includes(ql) || (catMap[t.catId]?.name || '').toLowerCase().includes(ql) || String(t.amount).includes(ql))
      .sort((a, b) => b.date.localeCompare(a.date) || b.updatedAt - a.updatedAt)
  }, [data.txns, range, q, cat, method, type, catMap])

  const groups = useMemo(() => {
    const g = []
    for (const t of list) {
      if (!g.length || g[g.length - 1].date !== t.date) g.push({ date: t.date, items: [] })
      g[g.length - 1].items.push(t)
    }
    return g
  }, [list])

  const exp = sum(list.filter((t) => t.type === 'expense'))
  const inc = sum(list.filter((t) => t.type === 'income'))

  const toggle = <Seg value={view} onChange={setView} options={[{ value: 'list', label: '☰ ' + t('List') }, { value: 'cal', label: '📅 ' + t('Calendar') }]} />
  if (view === 'cal') return <div className="space-y-3">{toggle}<Calendar data={data} catMap={catMap} onEdit={onEdit} onDelete={onDelete} /></div>

  return (
    <div className="space-y-3">
      {toggle}
      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {[['today', 'Today'], ['week', 'This week'], ['month', 'This month'], ['all', 'All'], ['custom', 'Custom']].map(([v, l]) =>
          <Chip key={v} active={period === v} onClick={() => setPeriod(v)}>{t(l)}</Chip>)}
      </div>
      {period === 'custom' && (
        <div className="flex gap-2">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="flex-1 rounded-2xl bg-white dark:bg-slate-900 px-3 py-2 text-sm dark:text-white ring-1 ring-slate-200 dark:ring-slate-800" />
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="flex-1 rounded-2xl bg-white dark:bg-slate-900 px-3 py-2 text-sm dark:text-white ring-1 ring-slate-200 dark:ring-slate-800" />
        </div>
      )}
      <input placeholder="🔍  Search note, category, amount" value={q} onChange={(e) => setQ(e.target.value)}
        className="w-full rounded-2xl bg-white dark:bg-slate-900 px-4 py-3 text-sm dark:text-white outline-none ring-1 ring-slate-200 dark:ring-slate-800 focus:ring-2 focus:ring-indigo-500" />
      <div className="grid grid-cols-3 gap-2">
        <select value={type} onChange={(e) => setType(e.target.value)} className="rounded-2xl bg-white dark:bg-slate-900 px-3 py-2 text-sm dark:text-white ring-1 ring-slate-200 dark:ring-slate-800">
          <option value="">{t('All types')}</option><option value="expense">Expense</option><option value="income">Income</option>
        </select>
        <select value={cat} onChange={(e) => setCat(e.target.value)} className="rounded-2xl bg-white dark:bg-slate-900 px-3 py-2 text-sm dark:text-white ring-1 ring-slate-200 dark:ring-slate-800">
          <option value="">{t('All categories')}</option>
          {data.categories.filter((c) => !c.deleted).map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
        </select>
        <select value={method} onChange={(e) => setMethod(e.target.value)} className="rounded-2xl bg-white dark:bg-slate-900 px-3 py-2 text-sm dark:text-white ring-1 ring-slate-200 dark:ring-slate-800">
          <option value="">{t('All methods')}</option>
          {METHODS.map((m) => <option key={m.id} value={m.id}>{m.id}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Card className="p-3"><div className="text-[11px] font-semibold uppercase text-slate-500">{t('Spent')}</div><div className="text-lg font-extrabold text-rose-600 tabular-nums">{money(exp, true)}</div></Card>
        <Card className="p-3"><div className="text-[11px] font-semibold uppercase text-slate-500">{t('Received')}</div><div className="text-lg font-extrabold text-emerald-600 tabular-nums">{money(inc, true)}</div></Card>
      </div>

      {groups.length > 0 && <p className="px-1 text-[11px] text-slate-400">{t('Tip: swipe an entry left to edit or delete')}</p>}
      {groups.length === 0 ? <Card><Empty icon="🔎" text={t('No entries found')} /></Card> : groups.map((g) => {
        const dayExp = sum(g.items.filter((t) => t.type === 'expense'))
        return (
          <Card key={g.date} className="overflow-hidden">
            <div className="flex justify-between bg-slate-50 dark:bg-slate-800/50 px-4 py-2 text-xs font-semibold text-slate-500">
              <span>{dayLabel(g.date)}</span>{dayExp > 0 && <span className="tabular-nums">−{money(dayExp, true)}</span>}
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {g.items.map((t) => <TxnRow key={t.id} t={t} cat={catMap[t.catId]} onClick={() => onEdit(t)} onDelete={onDelete} />)}
            </div>
          </Card>
        )
      })}
    </div>
  )
}
