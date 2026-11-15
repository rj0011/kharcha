import { useState } from 'react'
import { Sheet, Btn, Input } from '../components/ui'
import { uid, now, money } from '../lib/store'
import { t } from '../lib/i18n'
import { billStatus, payBill, TONE } from './billsCore'

const blank = () => ({ id: uid(), name: '', amount: '', day: '', catId: 'bills', method: 'Paytm', lastPaid: '' })

export default function BillsPage({ open, onClose, data, catMap, update, addTxn, flash }) {
  const [form, setForm] = useState(null)
  const bills = (data.bills || []).filter((b) => !b.deleted).sort((a, b) => billStatus(a).diff - billStatus(b).diff)
  const total = bills.reduce((s, b) => s + (+b.amount || 0), 0)
  const save = () => {
    const b = { ...form, name: form.name.trim(), amount: +form.amount || 0, day: Math.min(31, Math.max(1, +form.day || 1)), updatedAt: now() }
    update((d) => ({ ...d, bills: d.bills.some((x) => x.id === b.id) ? d.bills.map((x) => (x.id === b.id ? b : x)) : [...d.bills, b] }))
    setForm(null)
  }
  const del = (b) => { update((d) => ({ ...d, bills: d.bills.map((x) => (x.id === b.id ? { ...x, deleted: true, updatedAt: now() } : x)) })); setForm(null) }
  const expCats = data.categories.filter((c) => !c.deleted && c.kind === 'expense')

  return (
    <Sheet open={open} onClose={() => { setForm(null); onClose() }} title={`🔁 ${t('Bills & subscriptions')}`}>
      {form ? (
        <div className="space-y-3">
          <Input label={t('Name')} placeholder="Rent / Jio recharge / Netflix" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <div className="grid grid-cols-2 gap-2">
            <Input label={t('Amount')} inputMode="decimal" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value.replace(/[^0-9.]/g, '') })} />
            <Input label={t('Due day of month')} inputMode="numeric" placeholder="1–31" value={form.day} onChange={(e) => setForm({ ...form, day: e.target.value.replace(/\D/g, '') })} />
          </div>
          <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5">
            {expCats.map((c) => (
              <button key={c.id} onClick={() => setForm({ ...form, catId: c.id })} className={`shrink-0 rounded-full px-3 py-1.5 text-sm ${form.catId === c.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'}`}>{c.icon} {c.name}</button>
            ))}
          </div>
          <div className="flex gap-2">
            {data.bills.some((x) => x.id === form.id) && <Btn variant="danger" onClick={() => del(form)}>{t('Delete')}</Btn>}
            <Btn variant="ghost" onClick={() => setForm(null)}>{t('Cancel')}</Btn>
            <Btn className="flex-1" disabled={!form.name.trim() || !(+form.amount > 0) || !form.day} onClick={save}>{t('Save')}</Btn>
          </div>
        </div>
      ) : (
        <>
          <div className="mb-3 rounded-2xl bg-indigo-50 p-3 text-sm text-indigo-900 dark:bg-indigo-500/15 dark:text-indigo-200">
            Monthly fixed bills: <b>{money(total)}</b> · {bills.filter((b) => billStatus(b).paid).length}/{bills.length} paid this month
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {bills.map((b) => {
              const s = billStatus(b)
              return (
                <div key={b.id} className="flex items-center gap-3 py-3">
                  <button onClick={() => setForm({ ...b, amount: String(b.amount), day: String(b.day) })} className="text-2xl">{catMap[b.catId]?.icon || '🧾'}</button>
                  <button onClick={() => setForm({ ...b, amount: String(b.amount), day: String(b.day) })} className="min-w-0 flex-1 text-left">
                    <div className="truncate font-semibold text-slate-800 dark:text-slate-100">{b.name}</div>
                    <div className="text-xs text-slate-500">{money(b.amount)} · every month on {b.day}</div>
                  </button>
                  {s.paid ? <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${TONE[s.tone]}`}>{s.label}</span>
                    : <div className="text-right"><span className={`mb-1 block rounded-full px-2 py-0.5 text-[10px] font-bold ${TONE[s.tone]}`}>{s.label}</span><Btn variant="soft" className="py-1 text-xs" onClick={() => payBill(b, update, addTxn, flash)}>{t('Mark paid')}</Btn></div>}
                </div>
              )
            })}
          </div>
          {bills.length === 0 && <p className="py-6 text-center text-sm text-slate-400">Add rent, recharge, EMI, Netflix… and never miss a due date</p>}
          <Btn className="mt-3 w-full" onClick={() => setForm(blank())}>+ {t('Add bill')}</Btn>
        </>
      )}
    </Sheet>
  )
}
