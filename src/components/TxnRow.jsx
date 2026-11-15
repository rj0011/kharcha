import { useRef, useState } from 'react'
import { money } from '../lib/store'

const OPEN = -144

// Row with swipe-left actions (Edit / Delete). Tap = edit.
export default function TxnRow({ t, cat, onClick, onDelete }) {
  const inc = t.type === 'income'
  const [dx, setDx] = useState(0)
  const [anim, setAnim] = useState(true)
  const s = useRef(null)

  const down = (e) => { s.current = { x: e.clientX, y: e.clientY, base: dx, drag: false, id: e.pointerId }; setAnim(false) }
  const move = (e) => {
    const st = s.current
    if (!st) return
    const mx = e.clientX - st.x, my = e.clientY - st.y
    if (!st.drag) {
      if (Math.abs(mx) > 10 && Math.abs(mx) > Math.abs(my) * 1.3) { st.drag = true; e.currentTarget.setPointerCapture?.(st.id) }
      else if (Math.abs(my) > 10) { s.current = null; setAnim(true); return }
      else return
    }
    setDx(Math.max(OPEN - 30, Math.min(0, st.base + mx)))
  }
  const up = () => {
    const st = s.current
    s.current = null; setAnim(true)
    if (!st) return
    if (!st.drag) { if (dx !== 0) setDx(0); else onClick?.(); return }
    setDx(dx < OPEN / 2.5 ? OPEN : 0)
  }

  return (
    <div className="relative overflow-hidden">
      {onDelete && (
        <div className="absolute inset-y-0 right-0 flex">
          <button onClick={() => { setDx(0); onClick?.() }} className="flex w-[72px] flex-col items-center justify-center gap-0.5 bg-indigo-500 text-xs font-semibold text-white">
            <span className="text-lg">✏️</span>Edit
          </button>
          <button onClick={() => { setDx(0); onDelete(t) }} className="flex w-[72px] flex-col items-center justify-center gap-0.5 bg-rose-500 text-xs font-semibold text-white">
            <span className="text-lg">🗑️</span>Delete
          </button>
        </div>
      )}
      <div
        onPointerDown={onDelete ? down : undefined} onPointerMove={onDelete ? move : undefined}
        onPointerUp={onDelete ? up : undefined} onPointerCancel={() => { s.current = null; setAnim(true) }}
        onClick={onDelete ? undefined : onClick}
        style={{ transform: `translateX(${dx}px)`, transition: anim ? 'transform .25s cubic-bezier(.2,.8,.2,1)' : 'none', touchAction: 'pan-y' }}
        className="relative flex w-full cursor-pointer select-none items-center gap-3 bg-white px-4 py-3 text-left active:bg-slate-50 dark:bg-slate-900 dark:active:bg-slate-800/60">
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
      </div>
    </div>
  )
}
