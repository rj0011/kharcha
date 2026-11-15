import { money } from '../lib/store'

export default function TxnRow({ t, cat, onClick }) {
  const inc = t.type === 'income'
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-slate-50 dark:active:bg-slate-800/60">
      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-xl" style={{ background: (cat?.color || '#64748b') + '22' }}>
        {cat?.icon || '📦'}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate font-semibold text-slate-800 dark:text-slate-100">{t.note || cat?.name || 'Entry'}</div>
        <div className="truncate text-xs text-slate-500">{t.note ? cat?.name + ' · ' : ''}{t.method}</div>
      </div>
      <div className={`font-bold tabular-nums ${inc ? 'text-emerald-600' : 'text-slate-900 dark:text-white'}`}>
        {inc ? '+' : '−'}{money(t.amount, true)}
      </div>
    </button>
  )
}
