import { useState } from 'react'
import { Sheet } from '../components/ui'
import { uid, now, today, money } from '../lib/store'
import { t } from '../lib/i18n'

// one-tap favourite expenses (e.g. Chai ₹20, Metro ₹40)
export default function QuickAdd({ data, catMap, update, addTxn, undoAdd, flash }) {
  const [manage, setManage] = useState(false)
  const favs = (data.favs || []).filter((f) => !f.deleted)
  const tap = (f) => {
    const tx = { id: uid(), type: 'expense', amount: +f.amount, catId: f.catId, method: f.method || data.settings.defaultMethod, date: today(), note: f.name, createdAt: now(), updatedAt: now() }
    addTxn(tx, true)
    if (navigator.vibrate) navigator.vibrate(15)
    flash(`⚡ ${f.name} ${money(f.amount)}`, () => undoAdd(tx))
  }
  const del = (f) => update((d) => ({ ...d, favs: d.favs.map((x) => (x.id === f.id ? { ...x, deleted: true, updatedAt: now() } : x)) }))

  return (
    <div>
      <div className="mb-2 flex items-center justify-between px-1">
        <h3 className="font-bold text-slate-900 dark:text-white">⚡ {t('Quick add')}</h3>
        {favs.length > 0 && <button onClick={() => setManage(true)} className="text-xs font-semibold text-indigo-600">{t('Manage')}</button>}
      </div>
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {favs.map((f) => (
          <button key={f.id} onClick={() => tap(f)} className="flex shrink-0 items-center gap-2 rounded-2xl bg-white px-3 py-2.5 shadow-sm ring-1 ring-slate-200/70 transition active:scale-95 dark:bg-slate-900 dark:ring-slate-800">
            <span className="text-xl">{catMap[f.catId]?.icon || '⭐'}</span>
            <span className="text-left leading-tight"><span className="block text-sm font-semibold text-slate-800 dark:text-slate-100">{f.name}</span><span className="text-xs tabular-nums text-slate-500">{money(f.amount)}</span></span>
          </button>
        ))}
        {favs.length === 0 && <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-3 text-xs text-slate-500 dark:border-slate-700">Tap <b>+</b>, fill an expense and turn on <b>⭐ Save as quick-add</b> – it appears here for one-tap entry</div>}
      </div>
      <Sheet open={manage} onClose={() => setManage(false)} title={`⚡ ${t('Quick add')}`}>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {favs.map((f) => (
            <div key={f.id} className="flex items-center gap-3 py-3">
              <span className="text-xl">{catMap[f.catId]?.icon}</span>
              <span className="flex-1 font-semibold text-slate-800 dark:text-slate-100">{f.name}</span>
              <span className="tabular-nums text-slate-500">{money(f.amount)}</span>
              <button onClick={() => del(f)} className="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-600 dark:bg-rose-500/15">{t('Delete')}</button>
            </div>
          ))}
        </div>
      </Sheet>
    </div>
  )
}
