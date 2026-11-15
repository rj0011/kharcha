import { useEffect, useMemo, useRef, useState } from 'react'
import { Sheet, Seg, Btn, Chip } from './ui'
import { METHODS, today, ymd, addDays, uid, now, money } from '../lib/store'

export default function AddSheet({ open, onClose, data, editing, onSave, onDelete, presetType }) {
  const [type, setType] = useState('expense')
  const [amount, setAmount] = useState('')
  const [catId, setCatId] = useState('')
  const [method, setMethod] = useState('Paytm')
  const [date, setDate] = useState(today())
  const [note, setNote] = useState('')
  const amtRef = useRef()

  useEffect(() => {
    if (!open) return
    if (editing) {
      setType(editing.type); setAmount(String(editing.amount)); setCatId(editing.catId)
      setMethod(editing.method); setDate(editing.date); setNote(editing.note || '')
    } else {
      const t = presetType || 'expense'
      setType(t); setAmount(''); setNote(''); setDate(today())
      setMethod(t === 'income' ? 'Bank' : data.settings.defaultMethod || 'Paytm')
      setCatId(t === 'income' ? 'salary' : '')
      setTimeout(() => amtRef.current?.focus(), 250)
    }
  }, [open, editing, presetType, data.settings.defaultMethod])

  const cats = useMemo(() => data.categories.filter((c) => !c.deleted && c.kind === type), [data.categories, type])
  const recentNotes = useMemo(() => {
    const s = new Set()
    for (const t of [...data.txns].filter((t) => !t.deleted && t.note && t.type === type && (!catId || t.catId === catId)).sort((a, b) => b.updatedAt - a.updatedAt)) {
      s.add(t.note); if (s.size >= 5) break
    }
    return [...s]
  }, [data.txns, type, catId])

  const valid = +amount > 0 && catId
  const save = () => {
    if (!valid) return
    onSave({
      id: editing?.id || uid(), type, amount: Math.round(+amount * 100) / 100, catId, method, date,
      note: note.trim(), createdAt: editing?.createdAt || now(), updatedAt: now(),
    })
    onClose()
  }

  const y = ymd(addDays(new Date(), -1))
  return (
    <Sheet open={open} onClose={onClose} title={editing ? 'Edit entry' : 'Add entry'}>
      <Seg value={type} onChange={(v) => { setType(v); setCatId(v === 'income' ? 'salary' : ''); setMethod(v === 'income' ? 'Bank' : data.settings.defaultMethod) }}
        options={[{ value: 'expense', label: '− Expense' }, { value: 'income', label: '+ Income' }]} />

      <div className={`mt-4 flex items-center justify-center rounded-3xl py-5 ${type === 'expense' ? 'bg-rose-50 dark:bg-rose-500/10' : 'bg-emerald-50 dark:bg-emerald-500/10'}`}>
        <span className={`text-4xl font-bold ${type === 'expense' ? 'text-rose-500' : 'text-emerald-500'}`}>₹</span>
        <input ref={amtRef} inputMode="decimal" placeholder="0" value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
          onKeyDown={(e) => e.key === 'Enter' && save()}
          style={{ width: Math.max(1.2, amount.length * 0.62 + 0.4) + 'em' }} className="max-w-[70%] bg-transparent text-center text-5xl font-extrabold text-slate-900 dark:text-white outline-none tabular-nums" />
      </div>
      <div className="mt-2 flex gap-2 overflow-x-auto no-scrollbar">
        {[50, 100, 200, 500, 1000].map((v) => (
          <button key={v} onClick={() => setAmount(String((+amount || 0) + v))} className="shrink-0 rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-600 dark:text-slate-300">+{v}</button>
        ))}
      </div>

      <div className="mt-5 mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Category</div>
      <div className="grid grid-cols-4 gap-2">
        {cats.map((c) => (
          <button key={c.id} onClick={() => setCatId(c.id)}
            className={`flex flex-col items-center gap-1 rounded-2xl p-2 transition ${catId === c.id ? 'ring-2 ring-offset-0' : 'bg-slate-50 dark:bg-slate-800/60'}`}
            style={catId === c.id ? { background: c.color + '22', '--tw-ring-color': c.color } : {}}>
            <span className="text-2xl">{c.icon}</span>
            <span className="line-clamp-2 text-center text-[10.5px] font-medium leading-tight text-slate-600 dark:text-slate-300">{c.name}</span>
          </button>
        ))}
      </div>

      <div className="mt-5 mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Paid via</div>
      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {METHODS.map((m) => <Chip key={m.id} active={method === m.id} onClick={() => setMethod(m.id)}>{m.icon} {m.id}</Chip>)}
      </div>

      <div className="mt-5 mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Date</div>
      <div className="flex items-center gap-2">
        <Chip active={date === today()} onClick={() => setDate(today())}>Today</Chip>
        <Chip active={date === y} onClick={() => setDate(y)}>Yesterday</Chip>
        <input type="date" value={date} max={today()} onChange={(e) => e.target.value && setDate(e.target.value)}
          className="ml-auto rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1.5 text-sm text-slate-700 dark:text-slate-200 outline-none" />
      </div>

      <div className="mt-5">
        <input placeholder="Note (optional) – e.g. Dinner with friends" value={note} onChange={(e) => setNote(e.target.value)}
          className="w-full rounded-2xl bg-slate-100 dark:bg-slate-800 px-4 py-3 text-slate-900 dark:text-white outline-none focus:ring-2 ring-indigo-500" />
        {recentNotes.length > 0 && (
          <div className="mt-2 flex gap-2 overflow-x-auto no-scrollbar">
            {recentNotes.map((n) => <button key={n} onClick={() => setNote(n)} className="shrink-0 rounded-full bg-indigo-50 dark:bg-indigo-500/15 px-3 py-1 text-xs text-indigo-700 dark:text-indigo-300">{n}</button>)}
          </div>
        )}
      </div>

      <div className="mt-6 flex gap-2">
        {editing && <Btn variant="danger" onClick={() => { if (confirm('Delete this entry?\n(You can restore it for 30 days from More → Recently deleted)')) { onDelete(editing); onClose() } }}>Delete</Btn>}
        <Btn className="flex-1" disabled={!valid} onClick={save}>
          {valid ? `Save ${money(+amount, true)}` : 'Enter amount & category'}
        </Btn>
      </div>
    </Sheet>
  )
}
