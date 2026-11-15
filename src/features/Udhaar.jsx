import { useState } from 'react'
import { Sheet, Btn, Input, Seg } from '../components/ui'
import { uid, now, today, money, fmtDate } from '../lib/store'
import { t } from '../lib/i18n'
import { celebrate } from '../lib/confetti'

const blank = () => ({ id: uid(), person: '', phone: '', amount: '', type: 'lent', note: '', date: today(), settled: false })

function waLink(l) {
  const msg = `Namaste ${l.person} 🙏\nAapke ₹${(+l.amount).toLocaleString('en-IN')}${l.note ? ` (${l.note})` : ''} ${fmtDate(l.date, { day: 'numeric', month: 'short' })} se baaki hain. Jab ho sake please lauta dijiye. Dhanyavaad!`
  const ph = (l.phone || '').replace(/\D/g, '')
  const num = ph.length === 10 ? '91' + ph : ph
  return `https://wa.me/${num}?text=${encodeURIComponent(msg)}`
}

export default function UdhaarPage({ open, onClose, data, update, flash }) {
  const [form, setForm] = useState(null)
  const [show, setShow] = useState('open')
  const loans = (data.loans || []).filter((l) => !l.deleted)
  const openL = loans.filter((l) => !l.settled)
  const get = openL.filter((l) => l.type === 'lent').reduce((s, l) => s + +l.amount, 0)
  const owe = openL.filter((l) => l.type === 'borrowed').reduce((s, l) => s + +l.amount, 0)
  const list = (show === 'open' ? openL : loans.filter((l) => l.settled)).sort((a, b) => b.date.localeCompare(a.date))

  const save = () => {
    const l = { ...form, person: form.person.trim(), amount: +form.amount || 0, updatedAt: now() }
    update((d) => ({ ...d, loans: d.loans.some((x) => x.id === l.id) ? d.loans.map((x) => (x.id === l.id ? l : x)) : [...d.loans, l] }))
    setForm(null)
  }
  const settle = (l) => {
    update((d) => ({ ...d, loans: d.loans.map((x) => (x.id === l.id ? { ...x, settled: !x.settled, settledOn: today(), updatedAt: now() } : x)) }))
    if (!l.settled) { celebrate(0.6); flash(`🤝 ${l.person} – ${t('Settled')}`) }
  }
  const del = (l) => { update((d) => ({ ...d, loans: d.loans.map((x) => (x.id === l.id ? { ...x, deleted: true, updatedAt: now() } : x)) })); setForm(null) }

  return (
    <Sheet open={open} onClose={() => { setForm(null); onClose() }} title={`🤝 ${t('Udhaar')}`}>
      {form ? (
        <div className="space-y-3">
          <Seg value={form.type} onChange={(v) => setForm({ ...form, type: v })} options={[{ value: 'lent', label: '⬆️ ' + t('I gave') }, { value: 'borrowed', label: '⬇️ ' + t('I took') }]} />
          <Input label={t('Name')} placeholder="Rahul" value={form.person} onChange={(e) => setForm({ ...form, person: e.target.value })} />
          <div className="grid grid-cols-2 gap-2">
            <Input label={t('Amount')} inputMode="decimal" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value.replace(/[^0-9.]/g, '') })} />
            <Input label={t('Phone') + ' (WhatsApp)'} inputMode="tel" placeholder="98xxxxxxxx" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <Input label="Note" placeholder="Movie tickets" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          <input type="date" value={form.date} max={today()} onChange={(e) => setForm({ ...form, date: e.target.value })} className="w-full rounded-2xl bg-slate-100 px-4 py-3 text-slate-800 dark:bg-slate-800 dark:text-white" />
          <div className="flex gap-2">
            {data.loans.some((x) => x.id === form.id) && <Btn variant="danger" onClick={() => del(form)}>{t('Delete')}</Btn>}
            <Btn variant="ghost" onClick={() => setForm(null)}>{t('Cancel')}</Btn>
            <Btn className="flex-1" disabled={!form.person.trim() || !(+form.amount > 0)} onClick={save}>{t('Save')}</Btn>
          </div>
        </div>
      ) : (
        <>
          <div className="mb-3 grid grid-cols-2 gap-2">
            <div className="rounded-2xl bg-emerald-50 p-3 dark:bg-emerald-500/10"><div className="text-[11px] font-semibold uppercase text-emerald-700 dark:text-emerald-300">{t('You will get')}</div><div className="text-xl font-extrabold text-emerald-600">{money(get)}</div></div>
            <div className="rounded-2xl bg-rose-50 p-3 dark:bg-rose-500/10"><div className="text-[11px] font-semibold uppercase text-rose-700 dark:text-rose-300">{t('You owe')}</div><div className="text-xl font-extrabold text-rose-600">{money(owe)}</div></div>
          </div>
          <Seg value={show} onChange={setShow} options={[{ value: 'open', label: `Open (${openL.length})` }, { value: 'done', label: t('Settled') }]} />
          <div className="mt-2 divide-y divide-slate-100 dark:divide-slate-800">
            {list.map((l) => (
              <div key={l.id} className="py-3">
                <div className="flex items-center gap-3">
                  <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-full font-bold text-white ${l.type === 'lent' ? 'bg-emerald-500' : 'bg-rose-500'}`}>{l.person[0]?.toUpperCase()}</div>
                  <button onClick={() => setForm({ ...l, amount: String(l.amount) })} className="min-w-0 flex-1 text-left">
                    <div className="truncate font-semibold text-slate-800 dark:text-slate-100">{l.person}</div>
                    <div className="truncate text-xs text-slate-500">{l.type === 'lent' ? t('I gave') : t('I took')} · {fmtDate(l.date)}{l.note ? ' · ' + l.note : ''}</div>
                  </button>
                  <div className={`font-bold tabular-nums ${l.type === 'lent' ? 'text-emerald-600' : 'text-rose-600'}`}>{money(l.amount)}</div>
                </div>
                <div className="mt-2 flex gap-2 pl-[52px]">
                  {!l.settled && l.type === 'lent' && <a href={waLink(l)} target="_blank" rel="noreferrer" className="rounded-full bg-green-500 px-3 py-1.5 text-xs font-bold text-white">💬 {t('Remind on WhatsApp')}</a>}
                  <button onClick={() => settle(l)} className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">{l.settled ? '↩️ Reopen' : '✓ ' + t('Mark settled')}</button>
                </div>
              </div>
            ))}
          </div>
          {list.length === 0 && <p className="py-6 text-center text-sm text-slate-400">Track money you gave or took – remind friends on WhatsApp in one tap</p>}
          <Btn className="mt-3 w-full" onClick={() => setForm(blank())}>+ {t('Add udhaar')}</Btn>
        </>
      )}
    </Sheet>
  )
}
