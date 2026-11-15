import { useMemo, useState } from 'react'
import { t } from '../lib/i18n'
import { Card, Empty } from './ui'
import TxnRow from './TxnRow'
import { ymd, today, money, shortMoney, sum, dayLabel } from '../lib/store'

const WD = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

// Month calendar with spending heatmap; tap a day to see its entries
export default function Calendar({ data, catMap, onEdit, onDelete }) {
  const td = today()
  const [ym, setYm] = useState(td.slice(0, 7))
  const [sel, setSel] = useState(td)
  const [y, m] = ym.split('-').map(Number)

  const { cells, byDay, max, total } = useMemo(() => {
    const byDay = {}
    for (const t of data.txns) {
      if (t.deleted || t.type !== 'expense' || !t.date.startsWith(ym)) continue
      byDay[t.date] = (byDay[t.date] || 0) + t.amount
    }
    const first = new Date(y, m - 1, 1)
    const lead = (first.getDay() + 6) % 7
    const days = new Date(y, m, 0).getDate()
    const cells = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => ymd(new Date(y, m - 1, i + 1)))]
    const vals = Object.values(byDay)
    return { cells, byDay, max: vals.length ? Math.max(...vals) : 0, total: vals.reduce((a, b) => a + b, 0) }
  }, [data.txns, ym, y, m])

  const shift = (k) => { const d = new Date(y, m - 1 + k, 1); setYm(ymd(d).slice(0, 7)) }
  const dayList = data.txns.filter((t) => !t.deleted && t.date === sel).sort((a, b) => b.updatedAt - a.updatedAt)

  return (
    <div className="space-y-3">
      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <button onClick={() => shift(-1)} className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-lg dark:bg-slate-800 dark:text-white">‹</button>
          <div className="text-center">
            <div className="font-bold text-slate-900 dark:text-white">{new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</div>
            <div className="text-xs text-slate-500">{t('Spent')} {money(total)}</div>
          </div>
          <button onClick={() => shift(1)} disabled={ym >= td.slice(0, 7)} className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-lg disabled:opacity-30 dark:bg-slate-800 dark:text-white">›</button>
        </div>
        <div className="grid grid-cols-7 gap-1.5 text-center">
          {WD.map((w, i) => <div key={i} className="pb-1 text-[11px] font-semibold text-slate-400">{w}</div>)}
          {cells.map((d, i) => {
            if (!d) return <div key={'e' + i} />
            const v = byDay[d] || 0
            const k = max ? v / max : 0
            const future = d > td
            return (
              <button key={d} disabled={future} onClick={() => setSel(d)}
                className={`relative flex aspect-square flex-col items-center justify-center rounded-xl text-xs transition active:scale-95 ${sel === d ? 'ring-2 ring-indigo-500 ring-offset-1 dark:ring-offset-slate-900' : ''} ${future ? 'opacity-30' : ''}`}
                style={{ background: v ? `rgba(99,102,241,${0.12 + k * 0.78})` : undefined }}>
                <span className={`font-semibold ${k > 0.5 ? 'text-white' : d === td ? 'text-indigo-600 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-200'}`}>{+d.slice(8)}</span>
                {v > 0 && <span className={`text-[8.5px] leading-none ${k > 0.5 ? 'text-white/90' : 'text-slate-500 dark:text-slate-400'}`}>{shortMoney(v).replace('₹', '')}</span>}
                {d === td && <span className="absolute bottom-0.5 h-1 w-1 rounded-full bg-fuchsia-500" />}
              </button>
            )
          })}
        </div>
        <div className="mt-3 flex items-center justify-end gap-1.5 text-[10px] text-slate-400">
          Less {[0.12, 0.35, 0.6, 0.9].map((a) => <span key={a} className="h-3 w-3 rounded" style={{ background: `rgba(99,102,241,${a})` }} />)} More
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="flex justify-between bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-500 dark:bg-slate-800/50">
          <span>{dayLabel(sel)}</span>
          <span className="tabular-nums">−{money(sum(dayList.filter((t) => t.type === 'expense')), true)}</span>
        </div>
        {dayList.length === 0 ? <Empty icon="📅" text={t('No entries this day')} /> : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {dayList.map((t) => <TxnRow key={t.id} t={t} cat={catMap[t.catId]} onClick={() => onEdit(t)} onDelete={onDelete} />)}
          </div>
        )}
      </Card>
    </div>
  )
}
