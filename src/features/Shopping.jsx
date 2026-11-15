import { useState } from 'react'
import { Sheet, Btn } from '../components/ui'
import { uid, now, today, money } from '../lib/store'
import { t } from '../lib/i18n'

export default function ShoppingPage({ open, onClose, data, update, addTxn, flash }) {
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [total, setTotal] = useState('')
  const items = (data.shopping || []).filter((i) => !i.deleted).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
  const done = items.filter((i) => i.done)
  const sumDone = done.reduce((s, i) => s + (+i.price || 0), 0)

  const add = () => {
    const n = name.trim(); if (!n) return
    update((d) => ({ ...d, shopping: [...d.shopping, { id: uid(), name: n, price: +price || 0, done: false, createdAt: now(), updatedAt: now() }] }))
    setName(''); setPrice('')
  }
  const toggle = (i) => update((d) => ({ ...d, shopping: d.shopping.map((x) => (x.id === i.id ? { ...x, done: !x.done, updatedAt: now() } : x)) }))
  const remove = (i) => update((d) => ({ ...d, shopping: d.shopping.map((x) => (x.id === i.id ? { ...x, deleted: true, updatedAt: now() } : x)) }))
  const checkout = () => {
    const amt = +total || sumDone
    if (!(amt > 0)) return
    addTxn({ id: uid(), type: 'expense', amount: amt, catId: 'grocery', method: data.settings.defaultMethod || 'Paytm', date: today(), note: 'Shopping: ' + done.map((i) => i.name).join(', ').slice(0, 80), createdAt: now(), updatedAt: now() }, true)
    const ids = new Set(done.map((i) => i.id))
    update((d) => ({ ...d, shopping: d.shopping.map((x) => (ids.has(x.id) ? { ...x, deleted: true, updatedAt: now() } : x)) }))
    setTotal(''); flash(`🛒 ${money(amt)} added to Groceries`)
  }

  return (
    <Sheet open={open} onClose={onClose} title={`🛒 ${t('Shopping list')}`}>
      <div className="flex gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} placeholder="Milk, bread, soap…"
          className="min-w-0 flex-1 rounded-2xl bg-slate-100 px-4 py-3 text-slate-900 outline-none ring-indigo-500 focus:ring-2 dark:bg-slate-800 dark:text-white" />
        <input value={price} onChange={(e) => setPrice(e.target.value.replace(/[^0-9.]/g, ''))} inputMode="decimal" placeholder="₹"
          className="w-20 rounded-2xl bg-slate-100 px-3 py-3 text-slate-900 outline-none ring-indigo-500 focus:ring-2 dark:bg-slate-800 dark:text-white" />
        <Btn className="px-4" onClick={add}>+</Btn>
      </div>
      <div className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
        {items.map((i) => (
          <div key={i.id} className="flex items-center gap-3 py-2.5">
            <button onClick={() => toggle(i)} className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 text-sm text-white transition ${i.done ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300 dark:border-slate-600'}`}>{i.done ? '✓' : ''}</button>
            <span className={`flex-1 ${i.done ? 'text-slate-400 line-through' : 'text-slate-800 dark:text-slate-100'}`}>{i.name}</span>
            {i.price > 0 && <span className="text-sm tabular-nums text-slate-500">{money(i.price)}</span>}
            <button onClick={() => remove(i)} className="px-1 text-slate-300 hover:text-rose-500">✕</button>
          </div>
        ))}
      </div>
      {items.length === 0 && <p className="py-6 text-center text-sm text-slate-400">Write what to buy. Tick items at the shop, then tap “Bought” – it becomes one expense.</p>}
      {done.length > 0 && (
        <div className="mt-4 rounded-2xl bg-emerald-50 p-3 dark:bg-emerald-500/10">
          <div className="mb-2 text-sm font-semibold text-emerald-800 dark:text-emerald-300">{done.length} items bought – total bill?</div>
          <div className="flex gap-2">
            <input value={total} onChange={(e) => setTotal(e.target.value.replace(/[^0-9.]/g, ''))} inputMode="decimal" placeholder={sumDone ? String(sumDone) : '₹ total'}
              className="min-w-0 flex-1 rounded-2xl bg-white px-4 py-2.5 text-slate-900 outline-none dark:bg-slate-900 dark:text-white" />
            <Btn className="py-2" disabled={!(+total > 0 || sumDone > 0)} onClick={checkout}>{t('Bought ✓')}</Btn>
          </div>
        </div>
      )}
    </Sheet>
  )
}
