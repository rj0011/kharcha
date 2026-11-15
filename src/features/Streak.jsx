import { useEffect, useMemo } from 'react'
import { Card, Sheet } from '../components/ui'
import { addDays, today, ymd, cycleRange, inRange, sum, now } from '../lib/store'
import { t } from '../lib/i18n'
import { celebrate } from '../lib/confetti'

// active day = at least one entry OR marked "no-spend day"
export function activeDays(data) {
  const s = new Set()
  for (const x of data.txns) if (!x.deleted) s.add(x.date)
  for (const n of data.noSpend || []) if (!n.deleted) s.add(n.id)
  return s
}

export function computeStreak(data) {
  const days = activeDays(data)
  let d = new Date(), n = 0
  if (!days.has(ymd(d))) d = addDays(d, -1) // today not done yet – streak still alive from yesterday
  while (days.has(ymd(d))) { n++; d = addDays(d, -1) }
  // best streak
  const sorted = [...days].sort()
  let best = 0, run = 0, prev = null
  for (const s of sorted) { run = prev && ymd(addDays(new Date(prev), 1)) === s ? run + 1 : 1; best = Math.max(best, run); prev = s }
  return { current: n, best, todayDone: days.has(today()) }
}

export const BADGES = [
  { id: 'first', icon: '🌱', name: 'First step', hi: 'पहला कदम', desc: 'Add your first entry', test: (d) => d.txns.some((x) => !x.deleted) },
  { id: 's3', icon: '🔥', name: '3-day streak', hi: '3 दिन स्ट्रीक', desc: '3 days in a row', test: (_, s) => s.best >= 3 },
  { id: 's7', icon: '🥉', name: 'Week warrior', hi: 'हफ़्ते का योद्धा', desc: '7-day streak', test: (_, s) => s.best >= 7 },
  { id: 's30', icon: '🥈', name: 'Monthly master', hi: 'महीने का मास्टर', desc: '30-day streak', test: (_, s) => s.best >= 30 },
  { id: 's100', icon: '🥇', name: 'Legend', hi: 'लेजेंड', desc: '100-day streak', test: (_, s) => s.best >= 100 },
  { id: 'n50', icon: '📒', name: 'Record keeper', hi: 'हिसाबी', desc: '50 entries', test: (d) => d.txns.filter((x) => !x.deleted).length >= 50 },
  { id: 'n500', icon: '📚', name: 'Accountant', hi: 'मुनीम जी', desc: '500 entries', test: (d) => d.txns.filter((x) => !x.deleted).length >= 500 },
  { id: 'ns1', icon: '🧘', name: 'No-spend day', hi: 'बिना खर्च का दिन', desc: 'Mark a no-spend day', test: (d) => (d.noSpend || []).some((x) => !x.deleted) },
  { id: 'ns5', icon: '💎', name: 'Saver', hi: 'बचतकर्ता', desc: '5 no-spend days', test: (d) => (d.noSpend || []).filter((x) => !x.deleted).length >= 5 },
  { id: 'bill', icon: '🧾', name: 'Bill boss', hi: 'बिल बॉस', desc: 'Pay a bill from Bills', test: (d) => (d.bills || []).some((b) => b.lastPaid) },
  { id: 'udhaar', icon: '🤝', name: 'Clean slate', hi: 'हिसाब साफ़', desc: 'Settle an udhaar', test: (d) => (d.loans || []).some((l) => l.settled) },
  { id: 'budget', icon: '🏆', name: 'Budget hero', hi: 'बजट हीरो', desc: 'Finish a month within income', test: (d) => {
    const prev = cycleRange(addDays(new Date(cycleRange(new Date(), d.settings.salaryDay).start), -1), d.settings.salaryDay)
    const inc = sum(d.txns.filter((x) => !x.deleted && x.type === 'income' && inRange(x.date, prev)))
    const exp = sum(d.txns.filter((x) => !x.deleted && x.type === 'expense' && inRange(x.date, prev)))
    return inc > 0 && exp > 0 && exp <= inc
  } },
]

export function useBadges(data, flash) {
  const streak = useMemo(() => computeStreak(data), [data])
  const earned = useMemo(() => BADGES.filter((b) => b.test(data, streak)).map((b) => b.id), [data, streak])
  useEffect(() => {
    const seen = JSON.parse(localStorage.getItem('kharcha_badges_seen') || 'null')
    if (seen === null) { localStorage.setItem('kharcha_badges_seen', JSON.stringify(earned)); return } // first run: no spam
    const fresh = earned.filter((id) => !seen.includes(id))
    if (fresh.length) {
      localStorage.setItem('kharcha_badges_seen', JSON.stringify(earned))
      const b = BADGES.find((x) => x.id === fresh[0])
      celebrate(); flash?.(`${b.icon} New badge: ${b.name}!`)
    }
  }, [earned.join()]) // eslint-disable-line react-hooks/exhaustive-deps
  return { streak, earned }
}

export function StreakCard({ data, update, streak, earned, onOpen }) {
  const td = today()
  const noSpendToday = (data.noSpend || []).some((n) => n.id === td && !n.deleted)
  const spentToday = data.txns.some((x) => !x.deleted && x.date === td && x.type === 'expense')
  const markNoSpend = () => update((d) => ({ ...d, noSpend: [...(d.noSpend || []).filter((n) => n.id !== td), { id: td, updatedAt: now() }] }))
  const last7 = [...Array(7)].map((_, i) => ymd(addDays(new Date(), i - 6)))
  const act = activeDays(data)
  return (
    <Card className="flex items-center gap-3 p-4" onClick={onOpen}>
      <div className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-3xl ${streak.current ? 'bg-gradient-to-br from-orange-400 to-rose-500' : 'bg-slate-100 dark:bg-slate-800'}`}>
        {streak.current ? '🔥' : '🌱'}
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-extrabold text-slate-900 dark:text-white">{streak.current} {t('day streak')}</div>
        <div className="mt-1 flex gap-1">
          {last7.map((d) => <span key={d} className={`h-2 flex-1 rounded-full ${act.has(d) ? 'bg-orange-400' : 'bg-slate-200 dark:bg-slate-700'}`} />)}
        </div>
        <div className="mt-1 text-[11px] text-slate-500">🏅 {earned.length}/{BADGES.length} {t('Badges')} · {streak.todayDone ? t('Keep it going!') : t('Start today!')}</div>
      </div>
      {!spentToday && !noSpendToday && new Date().getHours() >= 18 && (
        <button onClick={(e) => { e.stopPropagation(); markNoSpend() }} className="shrink-0 rounded-2xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">🧘 {t('No-spend day')}</button>
      )}
    </Card>
  )
}

export function BadgesSheet({ open, onClose, streak, earned, lang }) {
  return (
    <Sheet open={open} onClose={onClose} title={`🏅 ${t('Badges')}`}>
      <div className="mb-4 grid grid-cols-2 gap-2">
        <div className="rounded-2xl bg-gradient-to-br from-orange-400 to-rose-500 p-3 text-white"><div className="text-xs opacity-80">Current</div><div className="text-2xl font-extrabold">🔥 {streak.current}</div></div>
        <div className="rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 p-3 text-white"><div className="text-xs opacity-80">Best</div><div className="text-2xl font-extrabold">⭐ {streak.best}</div></div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {BADGES.map((b) => {
          const ok = earned.includes(b.id)
          return (
            <div key={b.id} className={`rounded-2xl p-3 text-center ${ok ? 'bg-amber-50 ring-1 ring-amber-200 dark:bg-amber-500/10 dark:ring-amber-500/30' : 'bg-slate-50 opacity-50 grayscale dark:bg-slate-800'}`}>
              <div className="text-3xl">{b.icon}</div>
              <div className="mt-1 text-[11px] font-bold leading-tight text-slate-800 dark:text-slate-100">{lang === 'hi' ? b.hi : b.name}</div>
              <div className="text-[10px] leading-tight text-slate-500">{b.desc}</div>
            </div>
          )
        })}
      </div>
    </Sheet>
  )
}
