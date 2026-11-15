import { useMemo, useState } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar as RBar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { Card, Seg, Bar, Empty } from './ui'
import { today, ymd, parseYmd, addDays, weekRange, cycleRange, inRange, sum, money, shortMoney, fmtDate, daysBetween, METHODS } from '../lib/store'

function rangeFor(mode, off, salaryDay) {
  const t = new Date()
  if (mode === 'daily') { const d = ymd(addDays(t, off)); return { start: d, end: d, label: fmtDate(d, { weekday: 'long', day: 'numeric', month: 'short' }) } }
  if (mode === 'weekly') { const r = weekRange(addDays(t, off * 7)); return { ...r, label: `${fmtDate(r.start)} – ${fmtDate(r.end)}` } }
  if (mode === 'monthly') {
    const cur = parseYmd(cycleRange(t, salaryDay).start)
    const r = cycleRange(new Date(cur.getFullYear(), cur.getMonth() + off, cur.getDate()), salaryDay)
    return { ...r, label: +salaryDay === 1 ? parseYmd(r.start).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) : `${fmtDate(r.start)} – ${fmtDate(r.end)}` }
  }
  const y = t.getFullYear() + off
  return { start: `${y}-01-01`, end: `${y}-12-31`, label: String(y) }
}

const tip = { contentStyle: { borderRadius: 14, border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,.15)', fontSize: 12 }, cursor: { fill: 'rgba(99,102,241,.08)' } }

export default function Reports({ data, catMap }) {
  const [mode, setMode] = useState('monthly')
  const [off, setOff] = useState(0)
  const sd = data.settings.salaryDay
  const live = useMemo(() => data.txns.filter((t) => !t.deleted), [data.txns])
  const r = rangeFor(mode, off, sd)
  const prev = rangeFor(mode, off - 1, sd)

  const st = useMemo(() => {
    const cur = live.filter((t) => inRange(t.date, r))
    const exp = cur.filter((t) => t.type === 'expense')
    const inc = sum(cur.filter((t) => t.type === 'income'))
    const spent = sum(exp)
    const prevSpent = sum(live.filter((t) => t.type === 'expense' && inRange(t.date, prev)))
    const byCat = {}, byMethod = {}
    for (const t of exp) { byCat[t.catId] = (byCat[t.catId] || 0) + t.amount; byMethod[t.method] = (byMethod[t.method] || 0) + t.amount }
    const pie = Object.entries(byCat).map(([id, v]) => ({ id, name: catMap[id]?.name || id, icon: catMap[id]?.icon, value: v, color: catMap[id]?.color || '#94a3b8' })).sort((a, b) => b.value - a.value)
    const effEnd = r.end > today() ? today() : r.end
    const days = r.start > today() ? 1 : Math.max(1, daysBetween(r.start, effEnd))
    const biggest = [...exp].sort((a, b) => b.amount - a.amount)[0]

    // trend bars
    let trend = []
    const expOn = (pred) => sum(live.filter((t) => t.type === 'expense' && pred(t)))
    if (mode === 'daily') {
      for (let i = 6; i >= 0; i--) { const d = ymd(addDays(parseYmd(r.start), -i)); trend.push({ k: fmtDate(d, { weekday: 'short' }), v: expOn((t) => t.date === d), on: i === 0 }) }
    } else if (mode === 'weekly' || mode === 'monthly') {
      for (let d = parseYmd(r.start); ymd(d) <= r.end; d = addDays(d, 1)) {
        const s = ymd(d)
        trend.push({ k: mode === 'weekly' ? fmtDate(s, { weekday: 'short' }) : String(d.getDate()), v: expOn((t) => t.date === s), on: s === today() })
      }
    } else {
      const y = r.start.slice(0, 4)
      for (let m = 1; m <= 12; m++) { const p = `${y}-${String(m).padStart(2, '0')}`; trend.push({ k: new Date(+y, m - 1, 1).toLocaleDateString('en-IN', { month: 'short' }), v: expOn((t) => t.date.startsWith(p)) }) }
    }
    // 6-cycle history (monthly mode)
    const hist = []
    if (mode === 'monthly') for (let i = 5; i >= 0; i--) {
      const rr = rangeFor('monthly', off - i, sd)
      const e = sum(live.filter((t) => t.type === 'expense' && inRange(t.date, rr)))
      const n = sum(live.filter((t) => t.type === 'income' && inRange(t.date, rr)))
      hist.push({ k: parseYmd(rr.start).toLocaleDateString('en-IN', { month: 'short' }), Spent: e, Income: n })
    }
    return { spent, inc, prevSpent, pie, byMethod, days, avg: spent / days, biggest, trend, hist, count: exp.length }
  }, [live, r.start, r.end, prev.start, prev.end, mode, off, sd, catMap])

  const change = st.prevSpent > 0 ? ((st.spent - st.prevSpent) / st.prevSpent) * 100 : null
  const saved = st.inc - st.spent

  return (
    <div className="space-y-4">
      <Seg value={mode} onChange={(v) => { setMode(v); setOff(0) }} options={[{ value: 'daily', label: 'Daily' }, { value: 'weekly', label: 'Weekly' }, { value: 'monthly', label: 'Monthly' }, { value: 'yearly', label: 'Yearly' }]} />

      <div className="flex items-center justify-between">
        <button onClick={() => setOff(off - 1)} className="grid h-10 w-10 place-items-center rounded-full bg-white dark:bg-slate-900 text-xl dark:text-white ring-1 ring-slate-200 dark:ring-slate-800">‹</button>
        <div className="text-center">
          <div className="font-bold text-slate-900 dark:text-white">{r.label}</div>
          {off !== 0 && <button onClick={() => setOff(0)} className="text-xs font-semibold text-indigo-600">Back to current</button>}
        </div>
        <button disabled={off >= 0} onClick={() => setOff(off + 1)} className="grid h-10 w-10 place-items-center rounded-full bg-white dark:bg-slate-900 text-xl dark:text-white ring-1 ring-slate-200 dark:ring-slate-800 disabled:opacity-30">›</button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Card className="p-4">
          <div className="text-[11px] font-semibold uppercase text-slate-500">Spent</div>
          <div className="text-2xl font-extrabold text-rose-600 tabular-nums">{money(st.spent)}</div>
          {change !== null && <div className={`text-xs font-semibold ${change > 0 ? 'text-rose-500' : 'text-emerald-600'}`}>{change > 0 ? '▲' : '▼'} {Math.abs(change).toFixed(0)}% vs previous</div>}
        </Card>
        <Card className="p-4">
          <div className="text-[11px] font-semibold uppercase text-slate-500">{saved >= 0 ? 'Saved' : 'Overspent'}</div>
          <div className={`text-2xl font-extrabold tabular-nums ${saved >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{money(Math.abs(saved))}</div>
          <div className="text-xs text-slate-500">Income {money(st.inc)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-[11px] font-semibold uppercase text-slate-500">Avg / day</div>
          <div className="text-lg font-extrabold text-slate-900 dark:text-white tabular-nums">{money(st.avg)}</div>
          <div className="text-xs text-slate-500">{st.count} expenses</div>
        </Card>
        <Card className="p-4">
          <div className="text-[11px] font-semibold uppercase text-slate-500">Biggest</div>
          <div className="text-lg font-extrabold text-slate-900 dark:text-white tabular-nums">{st.biggest ? money(st.biggest.amount) : '—'}</div>
          <div className="truncate text-xs text-slate-500">{st.biggest ? (st.biggest.note || catMap[st.biggest.catId]?.name) : 'No expense'}</div>
        </Card>
      </div>

      <Card className="p-4">
        <h3 className="mb-2 font-bold text-slate-900 dark:text-white">Spending trend</h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={st.trend} margin={{ left: -18, right: 4, top: 8 }}>
              <CartesianGrid vertical={false} stroke="#94a3b833" />
              <XAxis dataKey="k" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} interval={mode === 'monthly' ? 4 : 0} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={shortMoney} />
              <Tooltip {...tip} formatter={(v) => [money(v), 'Spent']} />
              <RBar dataKey="v" radius={[8, 8, 0, 0]} maxBarSize={28}>
                {st.trend.map((d, i) => <Cell key={i} fill={d.on ? '#ec4899' : '#6366f1'} />)}
              </RBar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="p-4">
        <h3 className="mb-2 font-bold text-slate-900 dark:text-white">Where money went</h3>
        {st.pie.length === 0 ? <Empty icon="🥧" text="No expenses in this period" /> : (
          <>
            <div className="relative h-52">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={st.pie} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="92%" paddingAngle={2} stroke="none">
                    {st.pie.map((p) => <Cell key={p.id} fill={p.color} />)}
                  </Pie>
                  <Tooltip {...tip} formatter={(v, n) => [money(v), n]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
                <div><div className="text-[11px] uppercase text-slate-500">Total</div><div className="text-xl font-extrabold text-slate-900 dark:text-white">{money(st.spent)}</div></div>
              </div>
            </div>
            <div className="mt-3 space-y-2.5">
              {st.pie.map((p) => (
                <div key={p.id}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="text-slate-700 dark:text-slate-200">{p.icon} {p.name}</span>
                    <span className="tabular-nums text-slate-500">{money(p.value)} · {((p.value / st.spent) * 100).toFixed(0)}%</span>
                  </div>
                  <Bar value={p.value} max={st.spent} color={p.color} />
                </div>
              ))}
            </div>
          </>
        )}
      </Card>

      <Card className="p-4">
        <h3 className="mb-3 font-bold text-slate-900 dark:text-white">Paid via</h3>
        {st.spent === 0 ? <Empty icon="💳" text="Nothing yet" /> : (
          <div className="space-y-2.5">
            {METHODS.filter((m) => st.byMethod[m.id]).map((m) => (
              <div key={m.id}>
                <div className="mb-1 flex justify-between text-sm"><span className="text-slate-700 dark:text-slate-200">{m.icon} {m.id}</span><span className="tabular-nums text-slate-500">{money(st.byMethod[m.id])}</span></div>
                <Bar value={st.byMethod[m.id]} max={st.spent} color={m.id === 'Paytm' ? '#00baf2' : '#6366f1'} />
              </div>
            ))}
          </div>
        )}
      </Card>

      {mode === 'monthly' && (
        <Card className="p-4">
          <h3 className="mb-2 font-bold text-slate-900 dark:text-white">Last 6 months</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={st.hist} margin={{ left: -18, right: 4, top: 8 }}>
                <CartesianGrid vertical={false} stroke="#94a3b833" />
                <XAxis dataKey="k" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={shortMoney} />
                <Tooltip {...tip} formatter={(v, n) => [money(v), n]} />
                <RBar dataKey="Income" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={18} />
                <RBar dataKey="Spent" fill="#6366f1" radius={[6, 6, 0, 0]} maxBarSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-1 flex justify-center gap-4 text-xs text-slate-500"><span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-emerald-500" />Income</span><span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-indigo-500" />Spent</span></div>
        </Card>
      )}
    </div>
  )
}
