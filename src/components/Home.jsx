import { useMemo } from 'react'
import { Card, Gauge, Bar, Btn, Empty, useCount } from './ui'
import TxnRow from './TxnRow'
import { cycleRange, weekRange, today, inRange, sum, money, fmtDate, daysBetween, parseYmd } from '../lib/store'

function Stat({ label, value, sub, tone = 'slate' }) {
  const v = useCount(value)
  const c = { rose: 'text-rose-600', emerald: 'text-emerald-600', slate: 'text-slate-900 dark:text-white' }[tone]
  return (
    <Card className="p-3.5">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`mt-1 text-lg font-extrabold tabular-nums ${c}`}>{money(v)}</div>
      {sub && <div className="text-[11px] text-slate-400">{sub}</div>}
    </Card>
  )
}

export default function Home({ data, catMap, onEdit, onAddSalary, goto }) {
  const s = data.settings
  const live = data.txns.filter((t) => !t.deleted)
  const cyc = cycleRange(new Date(), s.salaryDay)
  const wk = weekRange()
  const td = today()

  const m = useMemo(() => {
    const exp = live.filter((t) => t.type === 'expense')
    const inc = live.filter((t) => t.type === 'income')
    const cExp = exp.filter((t) => inRange(t.date, cyc))
    const cInc = inc.filter((t) => inRange(t.date, cyc))
    const salaryIn = cInc.some((t) => t.catId === 'salary')
    const incomeCycle = sum(cInc) + (salaryIn ? 0 : +s.salary || 0) // expected salary if not yet added
    const spentCycle = sum(cExp)
    const budgetBase = +s.monthlyBudget > 0 ? +s.monthlyBudget : incomeCycle
    const daysLeft = daysBetween(td, cyc.end)
    const byCat = {}
    for (const t of cExp) byCat[t.catId] = (byCat[t.catId] || 0) + t.amount
    return {
      today: sum(exp.filter((t) => t.date === td)),
      week: sum(exp.filter((t) => inRange(t.date, wk))),
      spentCycle, incomeCycle, budgetBase, salaryIn, daysLeft,
      wallet: (+s.openingBalance || 0) + sum(inc) - sum(exp),
      perDay: Math.max(0, (budgetBase - spentCycle) / Math.max(1, daysLeft)),
      avgDay: spentCycle / Math.max(1, daysBetween(cyc.start, td)),
      byCat,
    }
  }, [live, cyc.start, cyc.end, wk.start, td, s.salary, s.monthlyBudget, s.openingBalance])

  const recent = [...live].sort((a, b) => b.date.localeCompare(a.date) || b.updatedAt - a.updatedAt).slice(0, 6)
  const budgets = data.categories.filter((c) => !c.deleted && c.kind === 'expense' && (c.budget > 0 || m.byCat[c.id]))
    .sort((a, b) => (m.byCat[b.id] || 0) - (m.byCat[a.id] || 0)).slice(0, 6)
  const hr = new Date().getHours()
  const greet = hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 p-5 pb-4 text-white shadow-xl shadow-indigo-500/30">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-16 -left-10 h-44 w-44 rounded-full bg-white/10" />
        <div className="relative flex items-start justify-between">
          <div>
            <div className="text-sm text-white/80">{greet}{s.name ? ', ' + s.name : ''} 👋</div>
            <div className="text-xs text-white/60">Cycle {fmtDate(cyc.start)} – {fmtDate(cyc.end)} · {m.daysLeft} days left</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-widest text-white/60">Wallet balance</div>
            <div className="font-bold tabular-nums">{money(m.wallet)}</div>
          </div>
        </div>
        <div className="relative mt-2">
          <Gauge spent={m.spentCycle} income={m.budgetBase} />
        </div>
        <div className="relative mt-3 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-2xl bg-white/15 p-2"><div className="text-[10px] uppercase text-white/70">Income</div><div className="text-sm font-bold">{money(m.incomeCycle)}</div></div>
          <div className="rounded-2xl bg-white/15 p-2"><div className="text-[10px] uppercase text-white/70">Spent</div><div className="text-sm font-bold">{money(m.spentCycle)}</div></div>
          <div className="rounded-2xl bg-white/15 p-2"><div className="text-[10px] uppercase text-white/70">Safe / day</div><div className="text-sm font-bold">{money(m.perDay)}</div></div>
        </div>
      </div>

      {!m.salaryIn && (
        <Card className="flex items-center gap-3 p-4">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-100 text-2xl dark:bg-emerald-500/15">💼</div>
          <div className="flex-1">
            <div className="font-semibold text-slate-800 dark:text-slate-100">Salary credited?</div>
            <div className="text-xs text-slate-500">{+s.salary > 0 ? `Add ${money(s.salary)} for this cycle in one tap` : 'Set your salary in More → Salary'}</div>
          </div>
          {+s.salary > 0
            ? <Btn variant="soft" className="py-2 text-sm" onClick={onAddSalary}>+ Add</Btn>
            : <Btn variant="soft" className="py-2 text-sm" onClick={() => goto('more')}>Set</Btn>}
        </Card>
      )}

      <div className="grid grid-cols-3 gap-2">
        <Stat label="Today" value={m.today} tone="rose" />
        <Stat label="This week" value={m.week} />
        <Stat label="Avg / day" value={m.avgDay} />
      </div>

      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 dark:text-white">Category budgets</h3>
          <button onClick={() => goto('more', 'cats')} className="text-xs font-semibold text-indigo-600">Manage</button>
        </div>
        {budgets.length === 0 ? <Empty icon="🎯" text="No spending yet this cycle" /> : (
          <div className="space-y-3">
            {budgets.map((c) => (
              <div key={c.id}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="text-slate-700 dark:text-slate-200">{c.icon} {c.name}</span>
                  <span className="tabular-nums text-slate-500">{money(m.byCat[c.id] || 0)}{c.budget > 0 && <span className="text-slate-400"> / {money(c.budget)}</span>}</span>
                </div>
                <Bar value={m.byCat[c.id] || 0} max={c.budget > 0 ? c.budget : m.spentCycle} color={c.color} />
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between px-4 pt-4">
          <h3 className="font-bold text-slate-900 dark:text-white">Recent</h3>
          <button onClick={() => goto('history')} className="text-xs font-semibold text-indigo-600">See all</button>
        </div>
        {recent.length === 0 ? <Empty text="Tap + to add your first expense" /> : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {recent.map((t) => (
              <div key={t.id}>
                <TxnRow t={t} cat={catMap[t.catId]} onClick={() => onEdit(t)} />
              </div>
            ))}
          </div>
        )}
      </Card>
      <p className="pb-2 text-center text-[11px] text-slate-400">{fmtDate(td, { weekday: 'long', day: 'numeric', month: 'long' })} · {parseYmd(td).getFullYear()}</p>
    </div>
  )
}
