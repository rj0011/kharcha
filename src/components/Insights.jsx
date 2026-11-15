import { useMemo } from 'react'
import { addDays, cycleRange, daysBetween, inRange, money, parseYmd, sum, today, weekRange, ymd } from '../lib/store'

const WEEKDAY = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

// Smart tips computed from your own entries
export function getInsights(data, catMap) {
  const s = data.settings
  const td = today()
  const exp = data.txns.filter((t) => !t.deleted && t.type === 'expense')
  const out = []

  // 1. This week vs same days last week
  const wk = weekRange()
  const daysIn = daysBetween(wk.start, td)
  const lastWk = { start: ymd(addDays(parseYmd(wk.start), -7)), end: ymd(addDays(parseYmd(td), -7)) }
  const thisW = sum(exp.filter((t) => inRange(t.date, { start: wk.start, end: td })))
  const lastW = sum(exp.filter((t) => inRange(t.date, lastWk)))
  if (lastW > 0 && thisW > 0) {
    const p = Math.round(((thisW - lastW) / lastW) * 100)
    if (Math.abs(p) >= 10) out.push(p > 0
      ? { icon: '📈', tone: 'rose', title: `${p}% more than last week`, text: `${money(thisW)} in ${daysIn} day${daysIn > 1 ? 's' : ''} vs ${money(lastW)} last week.` }
      : { icon: '🎉', tone: 'emerald', title: `${-p}% less than last week`, text: `Great control! ${money(thisW)} vs ${money(lastW)}.` })
  }

  // 2. Month-end projection at current pace
  const cyc = cycleRange(new Date(), s.salaryDay)
  const spent = sum(exp.filter((t) => inRange(t.date, cyc)))
  const gone = daysBetween(cyc.start, td), total = daysBetween(cyc.start, cyc.end)
  const income = sum(data.txns.filter((t) => !t.deleted && t.type === 'income' && inRange(t.date, cyc))) || +s.salary || 0
  const limit = +s.monthlyBudget > 0 ? +s.monthlyBudget : income
  if (spent > 0 && gone >= 3 && limit > 0) {
    const proj = (spent / gone) * total
    out.push(proj > limit
      ? { icon: '⚠️', tone: 'amber', title: `On track to overspend ${money(proj - limit)}`, text: `At this pace month-end spend ≈ ${money(proj)}. Try ≤ ${money(Math.max(0, (limit - spent) / Math.max(1, total - gone)))}/day.` }
      : { icon: '✅', tone: 'emerald', title: `You can save ≈ ${money(limit - proj)}`, text: `At this pace month-end spend ≈ ${money(proj)} of ${money(limit)}.` })
  }

  // 3. Category budgets close to limit
  const byCat = {}
  for (const t of exp) if (inRange(t.date, cyc)) byCat[t.catId] = (byCat[t.catId] || 0) + t.amount
  for (const c of data.categories) {
    if (c.deleted || !(c.budget > 0) || !byCat[c.id]) continue
    const p = byCat[c.id] / c.budget
    if (p >= 0.8) out.push({ icon: c.icon, tone: p >= 1 ? 'rose' : 'amber', title: p >= 1 ? `${c.name} budget crossed` : `${c.name} at ${Math.round(p * 100)}%`, text: `${money(byCat[c.id])} of ${money(c.budget)} used this month.` })
  }

  // 4. Top category this month
  const top = Object.entries(byCat).sort((a, b) => b[1] - a[1])[0]
  if (top && spent > 0) {
    const c = catMap[top[0]]
    out.push({ icon: c?.icon || '📦', tone: 'indigo', title: `Most spent on ${c?.name || 'Other'}`, text: `${money(top[1])} · ${Math.round((top[1] / spent) * 100)}% of this month's spending.` })
  }

  // 5. Costliest weekday (last 60 days)
  const since = ymd(addDays(new Date(), -60))
  const wd = Array(7).fill(0)
  for (const t of exp) if (t.date >= since) wd[parseYmd(t.date).getDay()] += t.amount
  const best = wd.indexOf(Math.max(...wd))
  if (wd[best] > 0 && exp.filter((t) => t.date >= since).length >= 7) out.push({ icon: '📅', tone: 'violet', title: `${WEEKDAY[best]}s cost you most`, text: `${money(wd[best])} spent on ${WEEKDAY[best]}s in the last 60 days.` })

  return out.slice(0, 5)
}

const TONES = {
  rose: 'from-rose-500 to-pink-500', emerald: 'from-emerald-500 to-teal-500', amber: 'from-amber-500 to-orange-500',
  indigo: 'from-indigo-500 to-blue-500', violet: 'from-violet-500 to-fuchsia-500',
}

export default function Insights({ data, catMap }) {
  const list = useMemo(() => getInsights(data, catMap), [data, catMap])
  if (!list.length) return null
  return (
    <div>
      <div className="mb-2 flex items-center justify-between px-1">
        <h3 className="font-bold text-slate-900 dark:text-white">💡 Insights</h3>
        <span className="text-[11px] text-slate-400">swipe →</span>
      </div>
      <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1">
        {list.map((x, i) => (
          <div key={i} className={`relative w-[78%] shrink-0 snap-start overflow-hidden rounded-3xl bg-gradient-to-br ${TONES[x.tone]} p-4 text-white shadow-lg`}>
            <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/15" />
            <div className="text-2xl">{x.icon}</div>
            <div className="mt-1 font-bold leading-snug">{x.title}</div>
            <div className="mt-0.5 text-xs text-white/85">{x.text}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
