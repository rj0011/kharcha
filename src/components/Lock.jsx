import { useEffect, useRef, useState } from 'react'
import { Sheet, Btn } from './ui'
import { getLock, saveLock, clearLock, setPattern, checkPattern, bioAvailable, enableBio, verifyBio, disableBio } from '../lib/lock'

// ---------- 3x3 pattern pad ----------
export function PatternPad({ onDone, status = 'idle', dark = false }) {
  const ref = useRef()
  const [seq, setSeqState] = useState([])
  const seqRef = useRef([])
  const setSeq = (v) => { const n = typeof v === 'function' ? v(seqRef.current) : v; seqRef.current = n; setSeqState(n) }
  const [pos, setPos] = useState(null)
  const drawing = useRef(false)
  const S = 270, M = 45, G = 90
  const pts = [...Array(9)].map((_, i) => ({ x: M + (i % 3) * G, y: M + Math.floor(i / 3) * G }))

  useEffect(() => { if (status !== 'idle') { const t = setTimeout(() => setSeq([]), 700); return () => clearTimeout(t) } }, [status])

  const local = (e) => {
    const r = ref.current.getBoundingClientRect()
    return { x: ((e.clientX - r.left) / r.width) * S, y: ((e.clientY - r.top) / r.height) * S }
  }
  const hit = (p, cur) => {
    const i = pts.findIndex((d) => Math.hypot(d.x - p.x, d.y - p.y) < 30)
    if (i >= 0 && !cur.includes(i)) {
      if (navigator.vibrate) navigator.vibrate(12)
      return [...cur, i]
    }
    return cur
  }
  const down = (e) => { e.preventDefault(); ref.current.setPointerCapture?.(e.pointerId); drawing.current = true; const p = local(e); setPos(p); setSeq(hit(p, [])) }
  const move = (e) => { if (!drawing.current) return; const p = local(e); setPos(p); setSeq((s) => hit(p, s)) }
  const up = () => {
    if (!drawing.current) return
    drawing.current = false; setPos(null)
    const s = seqRef.current
    if (s.length) onDone(s)
  }

  const col = status === 'error' ? '#f43f5e' : status === 'ok' ? '#10b981' : dark ? '#ffffff' : '#6366f1'
  const last = seq.length ? pts[seq[seq.length - 1]] : null
  return (
    <svg ref={ref} viewBox={`0 0 ${S} ${S}`} className="mx-auto w-full max-w-[270px] select-none" style={{ touchAction: 'none' }}
      onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onPointerLeave={up}>
      {seq.length > 1 && <polyline points={seq.map((i) => `${pts[i].x},${pts[i].y}`).join(' ')} fill="none" stroke={col} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" opacity=".8" />}
      {last && pos && <line x1={last.x} y1={last.y} x2={pos.x} y2={pos.y} stroke={col} strokeWidth="6" strokeLinecap="round" opacity=".4" />}
      {pts.map((p, i) => {
        const on = seq.includes(i)
        return (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="26" fill={on ? col : 'transparent'} opacity=".18" />
            <circle cx={p.x} cy={p.y} r={on ? 10 : 7} fill={on ? col : dark ? 'rgba(255,255,255,.55)' : '#94a3b8'} />
          </g>
        )
      })}
    </svg>
  )
}

// ---------- Full-screen lock ----------
export function LockScreen({ onUnlock }) {
  const lock = getLock()
  const [status, setStatus] = useState('idle')
  const [msg, setMsg] = useState('Draw your pattern to unlock')
  const [fails, setFails] = useState(0)
  const [waitUntil, setWaitUntil] = useState(0)
  const [, tick] = useState(0)

  const bio = async () => {
    try { if (await verifyBio()) { setStatus('ok'); setTimeout(onUnlock, 150) } } catch { setMsg('Fingerprint cancelled – draw pattern') }
  }
  useEffect(() => { if (lock.bioId) bio() }, []) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!waitUntil) return; const t = setInterval(() => { tick((x) => x + 1); if (Date.now() > waitUntil) setWaitUntil(0) }, 1000); return () => clearInterval(t) }, [waitUntil])

  const done = async (p) => {
    if (waitUntil) return
    if (await checkPattern(p)) { setStatus('ok'); setTimeout(onUnlock, 200); return }
    const f = fails + 1; setFails(f); setStatus('error')
    if (f >= 5) { setWaitUntil(Date.now() + 30000); setFails(0); setMsg('Too many tries – wait 30 sec') }
    else setMsg(`Wrong pattern (${5 - f} tries left)`)
    setTimeout(() => setStatus('idle'), 700)
  }
  const forgot = () => {
    if (!confirm('Forgot pattern?\n\nThis removes the lock AND the data saved on this phone. Your data synced to Google Drive comes back after you reconnect Drive.\n\nContinue?')) return
    ;['kharcha_data_v1', 'kharcha_file_id', 'kharcha_last_sync'].forEach((k) => localStorage.removeItem(k))
    clearLock(); location.reload()
  }
  const secs = waitUntil ? Math.ceil((waitUntil - Date.now()) / 1000) : 0

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-between bg-gradient-to-br from-indigo-700 via-violet-700 to-fuchsia-700 px-6 py-12 text-white">
      <div className="text-center">
        <img src="./pwa-192.png" alt="" className="mx-auto h-16 w-16 rounded-2xl shadow-xl ring-2 ring-white/40" />
        <h2 className="mt-3 text-2xl font-extrabold">Kharcha</h2>
        <p className={`mt-1 text-sm ${status === 'error' ? 'text-rose-200' : 'text-white/80'}`}>{secs ? `Try again in ${secs}s` : msg}</p>
      </div>
      <div className={`w-full ${waitUntil ? 'pointer-events-none opacity-40' : ''}`}>
        <PatternPad onDone={done} status={status} dark />
      </div>
      <div className="flex flex-col items-center gap-3">
        {lock.bioId && (
          <button onClick={bio} className="flex items-center gap-2 rounded-full bg-white/15 px-5 py-3 font-semibold ring-1 ring-white/30 active:scale-95">
            <span className="text-2xl">👆</span> Use fingerprint
          </button>
        )}
        <button onClick={forgot} className="text-xs text-white/60 underline">Forgot pattern?</button>
      </div>
    </div>
  )
}

// ---------- Settings sheet ----------
export function LockSettings({ open, onClose, flash }) {
  const [lock, setL] = useState(getLock())
  const [step, setStep] = useState('menu') // menu | draw | confirm
  const [first, setFirst] = useState(null)
  const [status, setStatus] = useState('idle')
  const [hint, setHint] = useState('')
  const [bioOk, setBioOk] = useState(false)

  useEffect(() => { if (open) { setL(getLock()); setStep('menu'); setHint(''); bioAvailable().then(setBioOk) } }, [open])
  const refresh = () => setL(getLock())

  const onDraw = async (p) => {
    if (p.length < 4) { setStatus('error'); setHint('Connect at least 4 dots'); setTimeout(() => setStatus('idle'), 700); return }
    if (step === 'draw') { setFirst(p); setStep('confirm'); setHint('Draw the same pattern again to confirm'); return }
    if (p.join() !== first.join()) { setStatus('error'); setHint("Patterns don't match – start again"); setTimeout(() => { setStatus('idle'); setStep('draw') }, 800); return }
    await setPattern(p); setStatus('ok'); refresh()
    setTimeout(() => { setStatus('idle'); setStep('menu'); flash('Pattern lock ON 🔒') }, 500)
  }
  const toggleBio = async () => {
    if (lock.bioId) { disableBio(); refresh(); flash('Fingerprint OFF'); return }
    try { await enableBio(); refresh(); flash('Fingerprint ON 👆') } catch (e) { flash('⚠️ Fingerprint not set: ' + (e.message || 'cancelled')) }
  }
  const turnOff = () => { if (confirm('Turn off app lock?')) { clearLock(); refresh(); flash('App lock OFF') } }

  return (
    <Sheet open={open} onClose={onClose} title="App lock">
      {step === 'menu' ? (
        <div className="space-y-3">
          <div className="rounded-2xl bg-indigo-50 p-3 text-sm text-indigo-900 dark:bg-indigo-500/15 dark:text-indigo-200">
            App asks for pattern / fingerprint every time you open it (and after 30 sec in background). Lock settings stay only on this phone.
          </div>
          <Btn className="w-full" onClick={() => { setStep('draw'); setHint('Draw an unlock pattern (min 4 dots)') }}>
            🔢 {lock.enabled ? 'Change pattern' : 'Set pattern lock'}
          </Btn>
          {lock.enabled && (
            bioOk ? (
              <div className="flex items-center justify-between rounded-2xl bg-slate-100 px-4 py-3 text-sm dark:bg-slate-800 dark:text-slate-200">
                <span>👆 Unlock with fingerprint</span>
                <input type="checkbox" className="h-5 w-5 accent-indigo-600" checked={!!lock.bioId} onChange={toggleBio} />
              </div>
            ) : <p className="text-xs text-slate-500">Fingerprint is not available in this browser. Install the app from Chrome and set a fingerprint in phone Settings.</p>
          )}
          {lock.enabled && <Btn variant="danger" className="w-full" onClick={turnOff}>Turn off app lock</Btn>}
        </div>
      ) : (
        <div className="space-y-3 text-center">
          <p className={`text-sm font-medium ${status === 'error' ? 'text-rose-500' : 'text-slate-600 dark:text-slate-300'}`}>{hint}</p>
          <PatternPad onDone={onDraw} status={status} />
          <Btn variant="ghost" className="w-full" onClick={() => setStep('menu')}>Cancel</Btn>
        </div>
      )}
    </Sheet>
  )
}
