import { useEffect, useState } from 'react'
import { t } from '../lib/i18n'
import { money } from '../lib/store'

export function Card({ className = '', children, ...p }) {
  return (
    <div className={`rounded-3xl bg-white dark:bg-slate-900 shadow-[0_1px_2px_rgba(15,23,42,.04),0_8px_24px_-12px_rgba(15,23,42,.12)] ring-1 ring-slate-200/60 dark:ring-slate-800 ${className}`} {...p}>
      {children}
    </div>
  )
}

export function Sheet({ open, onClose, title, children }) {
  useEffect(() => {
    if (!open) return
    const h = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm anim-fade" onClick={onClose} />
      <div className="relative w-full max-w-md max-h-[92vh] overflow-y-auto no-scrollbar rounded-t-[28px] bg-white dark:bg-slate-900 p-5 pb-8 safe-bottom anim-pop">
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-slate-200 dark:bg-slate-700" />
        {title && <h3 className="mb-4 text-lg font-bold text-slate-900 dark:text-white">{title}</h3>}
        {children}
      </div>
    </div>
  )
}

export function Seg({ options, value, onChange, className = '' }) {
  return (
    <div className={`flex rounded-2xl bg-slate-100 dark:bg-slate-800 p-1 ${className}`}>
      {options.map((o) => {
        const v = typeof o === 'string' ? o : o.value
        const l = typeof o === 'string' ? o : o.label
        return (
          <button key={v} onClick={() => onChange(v)}
            className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition ${value === v ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow' : 'text-slate-500 dark:text-slate-400'}`}>
            {l}
          </button>
        )
      })}
    </div>
  )
}

export function Chip({ active, onClick, children }) {
  return (
    <button onClick={onClick}
      className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition ring-1 ${active ? 'bg-indigo-600 text-white ring-indigo-600' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 ring-slate-200 dark:ring-slate-700'}`}>
      {children}
    </button>
  )
}

export function Input({ label, className = '', ...p }) {
  return (
    <label className="block">
      {label && <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>}
      <input {...p} className={`w-full rounded-2xl bg-slate-100 dark:bg-slate-800 px-4 py-3 text-slate-900 dark:text-white outline-none ring-indigo-500 focus:ring-2 ${className}`} />
    </label>
  )
}

export function Btn({ variant = 'primary', className = '', ...p }) {
  const v = {
    primary: 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/30',
    soft: 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300',
    ghost: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200',
    danger: 'bg-rose-50 dark:bg-rose-500/15 text-rose-600',
  }[variant]
  return <button {...p} className={`rounded-2xl px-4 py-3 font-semibold transition active:scale-[.98] disabled:opacity-50 ${v} ${className}`} />
}

export function Bar({ value, max, color = '#6366f1' }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  const c = pct >= 100 ? '#ef4444' : pct >= 80 ? '#f59e0b' : color
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
      <div className="h-full rounded-full transition-all duration-700" style={{ width: pct + '%', background: c }} />
    </div>
  )
}

// Animated count-up number
export function useCount(target, ms = 700) {
  const [v, setV] = useState(target)
  useEffect(() => {
    const from = v, start = performance.now()
    let raf
    const step = (t) => {
      const k = Math.min(1, (t - start) / ms)
      setV(from + (target - from) * (1 - Math.pow(1 - k, 3)))
      if (k < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target])
  return v
}

// Live semicircle meter: spent vs income
export function Gauge({ spent, income }) {
  const R = 90, L = Math.PI * R
  const pct = income > 0 ? Math.min(1, spent / income) : spent > 0 ? 1 : 0
  const [p, setP] = useState(0)
  useEffect(() => { const t = setTimeout(() => setP(pct), 60); return () => clearTimeout(t) }, [pct])
  const color = pct < 0.6 ? '#34d399' : pct < 0.85 ? '#fbbf24' : '#f87171'
  const left = useCount(income - spent)
  const ang = Math.PI * (1 - p)
  const nx = 110 + 90 * Math.cos(ang), ny = 110 - 90 * Math.sin(ang)
  return (
    <div className="relative mx-auto w-full max-w-[280px]">
      <svg viewBox="0 0 220 128" className="w-full">
        <defs>
          <linearGradient id="gtrack" x1="0" x2="1">
            <stop offset="0" stopColor="#34d399" /><stop offset=".6" stopColor="#fbbf24" /><stop offset="1" stopColor="#f87171" />
          </linearGradient>
        </defs>
        <path d="M20 110 A90 90 0 0 1 200 110" fill="none" stroke="rgba(255,255,255,.18)" strokeWidth="16" strokeLinecap="round" />
        <path d="M20 110 A90 90 0 0 1 200 110" fill="none" stroke="url(#gtrack)" strokeWidth="16" strokeLinecap="round"
          strokeDasharray={L} strokeDashoffset={L * (1 - p)} style={{ transition: 'stroke-dashoffset 1s cubic-bezier(.2,.8,.2,1)' }} />
        <circle cx={nx} cy={ny} r="13" fill={color} opacity=".35" style={{ transition: 'all 1s cubic-bezier(.2,.8,.2,1)' }} />
        <circle cx={nx} cy={ny} r="7.5" fill="white" stroke={color} strokeWidth="4" style={{ transition: 'all 1s cubic-bezier(.2,.8,.2,1)' }} />
      </svg>
      <div className="absolute inset-x-0 top-[44%] text-center">
        <div className="text-[11px] font-semibold uppercase tracking-widest text-white/70">{t('Left this month')}</div>
        <div className={`text-3xl font-extrabold tabular-nums ${left < 0 ? 'text-rose-200' : 'text-white'}`}>{money(left)}</div>
      </div>
      <div className="-mt-1 flex justify-between px-2 text-[11px] font-medium text-white/70">
        <span>₹0</span><span>{Math.round(pct * 100)}% {t('used')}</span><span>{money(income)}</span>
      </div>
    </div>
  )
}

export function Empty({ icon = '🪙', text }) {
  return (
    <div className="py-10 text-center text-slate-400">
      <div className="text-4xl mb-2">{icon}</div>
      <div className="text-sm">{text}</div>
    </div>
  )
}
