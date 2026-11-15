import { Card, Btn } from '../components/ui'
import { uid, now, today, money, parseYmd } from '../lib/store'
import { t } from '../lib/i18n'
import { celebrate } from '../lib/confetti'

export function billStatus(b) {
  const td = today(), ym = td.slice(0, 7)
  if (b.lastPaid === ym) return { paid: true, diff: 99, label: t('Paid') + ' ✓', tone: 'emerald' }
  const [y, m] = ym.split('-').map(Number)
  const day = Math.min(+b.day || 1, new Date(y, m, 0).getDate())
  const due = `${ym}-${String(day).padStart(2, '0')}`
  const diff = Math.round((parseYmd(due) - parseYmd(td)) / 86400000)
  if (diff < 0) return { paid: false, diff, label: `${t('Overdue')} ${-diff}d`, tone: 'rose' }
  if (diff === 0) return { paid: false, diff, label: t('Due today'), tone: 'amber' }
  return { paid: false, diff, label: `${t('Due in')} ${diff} ${t('days')}`, tone: diff <= 3 ? 'amber' : 'slate' }
}

export const TONE = { emerald: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300', rose: 'bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300', amber: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300', slate: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' }

export function payBill(b, update, addTxn, flash) {
  addTxn({ id: uid(), type: 'expense', amount: +b.amount, catId: b.catId || 'bills', method: b.method || 'Paytm', date: today(), note: b.name, createdAt: now(), updatedAt: now() }, true)
  update((d) => ({ ...d, bills: d.bills.map((x) => (x.id === b.id ? { ...x, lastPaid: today().slice(0, 7), updatedAt: now() } : x)) }))
  celebrate(0.6); flash(`🧾 ${b.name} ${t('Paid')} – ${money(b.amount)}`)
}

// strip on Home: unpaid bills due within 5 days / overdue
export function UpcomingBills({ data, catMap, update, addTxn, flash, onOpen }) {
  const list = (data.bills || []).filter((b) => !b.deleted).map((b) => ({ b, s: billStatus(b) })).filter((x) => !x.s.paid && x.s.diff <= 5).sort((a, b) => a.s.diff - b.s.diff)
  if (!list.length) return null
  return (
    <Card className="p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-bold text-slate-900 dark:text-white">🧾 {t('Upcoming bills')}</h3>
        <button onClick={onOpen} className="text-xs font-semibold text-indigo-600">{t('Manage')}</button>
      </div>
      <div className="space-y-2">
        {list.map(({ b, s }) => (
          <div key={b.id} className="flex items-center gap-3">
            <span className="text-xl">{catMap[b.catId]?.icon || '🧾'}</span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{b.name} · {money(b.amount)}</div>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${TONE[s.tone]}`}>{s.label}</span>
            </div>
            <Btn variant="soft" className="py-1.5 text-xs" onClick={() => payBill(b, update, addTxn, flash)}>{t('Mark paid')}</Btn>
          </div>
        ))}
      </div>
    </Card>
  )
}

