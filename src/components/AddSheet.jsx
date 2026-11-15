import { useEffect, useMemo, useState } from 'react'
import { Sheet, Seg, Btn, Chip } from './ui'
import { METHODS, today, ymd, addDays, uid, now, money } from '../lib/store'
import { t, getLang } from '../lib/i18n'
import { listen, parseVoice, voiceSupported } from '../features/voice'
import { compress, putPhoto, getPhoto } from '../lib/photos'
import * as drive from '../lib/drive'

// safe calculator: numbers with + − × ÷ (no eval)
function calc(expr) {
  const s = expr.replace(/[+\-×÷]$/, '')
  if (!s) return 0
  const terms = s.split(/(?=[+-])/)
  let total = 0
  for (const term of terms) {
    const sign = term[0] === '-' ? -1 : 1
    const parts = term.replace(/^[+-]/, '').split(/([×÷])/)
    let v = parseFloat(parts[0]) || 0
    for (let i = 1; i < parts.length; i += 2) {
      const n = parseFloat(parts[i + 1]) || 0
      v = parts[i] === '×' ? v * n : n ? v / n : v
    }
    total += sign * v
  }
  return Math.round(total * 100) / 100
}

const KEYS = ['7', '8', '9', '÷', '4', '5', '6', '×', '1', '2', '3', '−', '.', '0', '⌫', '+']

export default function AddSheet({ open, onClose, data, editing, onSave, onDelete, presetType, preset, onSaveFav, flash }) {
  const [type, setType] = useState('expense')
  const [expr, setExpr] = useState('')
  const [catId, setCatId] = useState('')
  const [method, setMethod] = useState('Paytm')
  const [date, setDate] = useState(today())
  const [note, setNote] = useState('')
  const [photo, setPhoto] = useState(null) // idb key
  const [photoUrl, setPhotoUrl] = useState('')
  const [fav, setFav] = useState(false)
  const [listening, setListening] = useState(false)

  useEffect(() => {
    if (!open) return
    setFav(false); setPhotoUrl('')
    if (editing) {
      setType(editing.type); setExpr(String(editing.amount)); setCatId(editing.catId)
      setMethod(editing.method); setDate(editing.date); setNote(editing.note || ''); setPhoto(editing.photo || null)
      if (editing.photo) {
        getPhoto(editing.photo).then((b) => b || (editing.photoDrive && drive.hasValidToken() ? drive.downloadPhoto(editing.photoDrive) : null))
          .then((b) => b && setPhotoUrl(URL.createObjectURL(b))).catch(() => {})
      }
    } else if (preset) {
      setType(preset.type || 'expense'); setExpr(preset.amount ? String(preset.amount) : ''); setCatId(preset.catId || ''); setNote(preset.note || '')
      setDate(today()); setPhoto(null); setMethod(preset.type === 'income' ? 'Bank' : data.settings.defaultMethod || 'Paytm')
    } else {
      setPhoto(null)
      const t = presetType || 'expense'
      setType(t); setExpr(''); setNote(''); setDate(today())
      setMethod(t === 'income' ? 'Bank' : data.settings.defaultMethod || 'Paytm')
      setCatId(t === 'income' ? 'salary' : '')
    }
  }, [open, editing, presetType, preset, data.settings.defaultMethod])

  const press = (k) => {
    if (navigator.vibrate) navigator.vibrate(8)
    setExpr((e) => {
      if (k === '⌫') return e.slice(0, -1)
      const op = k === '−' ? '-' : k
      const isOp = /[+\-×÷]/.test(op)
      if (isOp) { if (!e) return e; return /[+\-×÷]$/.test(e) ? e.slice(0, -1) + op : e + op }
      if (k === '.') { const last = e.split(/[+\-×÷]/).pop(); if (last.includes('.')) return e; return e + (last === '' ? '0.' : '.') }
      const last = e.split(/[+\-×÷]/).pop()
      if (last.includes('.') && last.split('.')[1].length >= 2) return e
      if (e.length >= 24) return e
      return e === '0' ? k : e + k
    })
  }

  // physical keyboard support (computer)
  useEffect(() => {
    if (!open) return
    const h = (ev) => {
      if (ev.target.tagName === 'INPUT') return
      const map = { '*': '×', '/': '÷', '-': '−', Backspace: '⌫' }
      const k = map[ev.key] || ev.key
      if (KEYS.includes(k)) { ev.preventDefault(); press(k) }
      if (ev.key === 'Enter') document.getElementById('kh-save')?.click()
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open])

  const voice = async () => {
    setListening(true)
    try {
      const txt = await listen(getLang() === 'hi' ? 'hi-IN' : 'en-IN')
      const v = parseVoice(txt)
      setType(v.type); if (v.amount) setExpr(String(v.amount)); if (v.catId) setCatId(v.catId); if (v.note) setNote(v.note)
      if (v.type === 'income') setMethod('Bank')
      flash?.('🎤 "' + txt + '"')
    } catch (e) { flash?.('⚠️ ' + e.message) }
    setListening(false)
  }
  const pickPhoto = async (e) => {
    const f = e.target.files?.[0]; e.target.value = ''
    if (!f) return
    const blob = await compress(f)
    const key = 'ph_' + uid()
    await putPhoto(key, blob)
    setPhoto(key); setPhotoUrl(URL.createObjectURL(blob))
  }

  const amount = calc(expr)
  const hasOp = /[+\-×÷]/.test(expr.slice(1))
  const cats = useMemo(() => data.categories.filter((c) => !c.deleted && c.kind === type), [data.categories, type])
  const recentNotes = useMemo(() => {
    const s = new Set()
    for (const t of [...data.txns].filter((t) => !t.deleted && t.note && t.type === type && (!catId || t.catId === catId)).sort((a, b) => b.updatedAt - a.updatedAt)) {
      s.add(t.note); if (s.size >= 5) break
    }
    return [...s]
  }, [data.txns, type, catId])

  const valid = amount > 0 && catId
  const save = () => {
    if (!valid) return
    const keepDrive = editing && editing.photo === photo ? editing.photoDrive : undefined
    onSave({
      id: editing?.id || uid(), type, amount, catId, method, date,
      note: note.trim(), photo: photo || undefined, photoDrive: keepDrive, createdAt: editing?.createdAt || now(), updatedAt: now(),
    })
    if (fav && onSaveFav) onSaveFav({ id: uid(), name: note.trim() || data.categories.find((c) => c.id === catId)?.name || 'Quick', amount, catId, method, updatedAt: now() })
    onClose()
  }

  const y = ymd(addDays(new Date(), -1))
  const exp = type === 'expense'
  return (
    <Sheet open={open} onClose={onClose} title={editing ? t('Edit entry') : t('Add entry')}>
      <Seg value={type} onChange={(v) => { setType(v); setCatId(v === 'income' ? 'salary' : ''); setMethod(v === 'income' ? 'Bank' : data.settings.defaultMethod) }}
        options={[{ value: 'expense', label: t('− Expense') }, { value: 'income', label: t('+ Income') }]} />

      {/* amount display */}
      <div className={`mt-3 rounded-3xl px-4 py-3 text-center ${exp ? 'bg-rose-50 dark:bg-rose-500/10' : 'bg-emerald-50 dark:bg-emerald-500/10'}`}>
        <div className="flex items-baseline justify-center gap-1">
          <span className={`text-3xl font-bold ${exp ? 'text-rose-500' : 'text-emerald-500'}`}>₹</span>
          <span className={`max-w-full truncate font-extrabold tabular-nums text-slate-900 dark:text-white ${expr.length > 12 ? 'text-3xl' : 'text-5xl'}`}>{expr || '0'}</span>
          <span className="ml-0.5 h-9 w-0.5 animate-pulse self-center bg-indigo-500" />
        </div>
        <div className="h-4 text-xs font-semibold text-slate-500">{hasOp ? `= ${money(amount, true)}` : ''}</div>
      </div>
      {voiceSupported() && !editing && (
        <button onClick={voice} disabled={listening} className={`mx-auto -mt-5 flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white shadow-lg transition ${listening ? 'animate-pulse bg-rose-500' : 'bg-gradient-to-r from-indigo-600 to-violet-600'}`}>
          🎤 {listening ? t('Speak now…') : t('Voice')}
        </button>
      )}

      {/* categories – horizontal scroll */}
      <div className="no-scrollbar -mx-5 mt-3 flex gap-2 overflow-x-auto px-5 pb-1">
        {cats.map((c) => (
          <button key={c.id} onClick={() => setCatId(c.id)}
            className={`flex w-[70px] shrink-0 flex-col items-center gap-1 rounded-2xl p-2 transition active:scale-95 ${catId === c.id ? 'ring-2' : 'bg-slate-50 dark:bg-slate-800/60'}`}
            style={catId === c.id ? { background: c.color + '22', '--tw-ring-color': c.color } : {}}>
            <span className="text-2xl">{c.icon}</span>
            <span className="line-clamp-2 text-center text-[10px] font-medium leading-tight text-slate-600 dark:text-slate-300">{c.name}</span>
          </button>
        ))}
      </div>

      {/* method + date */}
      <div className="no-scrollbar -mx-5 mt-3 flex gap-2 overflow-x-auto px-5">
        {METHODS.map((m) => <Chip key={m.id} active={method === m.id} onClick={() => setMethod(m.id)}>{m.icon} {m.id}</Chip>)}
      </div>
      <div className="mt-2 flex items-center gap-2">
        <Chip active={date === today()} onClick={() => setDate(today())}>{t('Today')}</Chip>
        <Chip active={date === y} onClick={() => setDate(y)}>{t('Yesterday')}</Chip>
        <input type="date" value={date} max={today()} onChange={(e) => e.target.value && setDate(e.target.value)}
          className="ml-auto min-w-0 rounded-full bg-slate-100 px-3 py-1.5 text-sm text-slate-700 outline-none dark:bg-slate-800 dark:text-slate-200" />
      </div>

      <input placeholder={'📝 ' + t('Note (optional)')} value={note} onChange={(e) => setNote(e.target.value)}
        className="mt-3 w-full rounded-2xl bg-slate-100 px-4 py-2.5 text-sm text-slate-900 outline-none ring-indigo-500 focus:ring-2 dark:bg-slate-800 dark:text-white" />
      {recentNotes.length > 0 && (
        <div className="no-scrollbar mt-2 flex gap-2 overflow-x-auto">
          {recentNotes.map((n) => <button key={n} onClick={() => setNote(n)} className="shrink-0 rounded-full bg-indigo-50 px-3 py-1 text-xs text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">{n}</button>)}
        </div>
      )}

      <div className="mt-2 flex items-center gap-2">
        <label className="flex cursor-pointer items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
          📸 {t('Bill photo')}
          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={pickPhoto} />
        </label>
        {photoUrl && (
          <a href={photoUrl} target="_blank" rel="noreferrer" className="relative">
            <img src={photoUrl} alt="" className="h-9 w-9 rounded-lg object-cover ring-2 ring-indigo-400" />
          </a>
        )}
        {photo && <button onClick={() => { setPhoto(null); setPhotoUrl('') }} className="text-xs text-rose-500">✕</button>}
        {!editing && type === 'expense' && (
          <button onClick={() => setFav(!fav)} className={`ml-auto rounded-full px-3 py-1.5 text-xs font-semibold ${fav ? 'bg-amber-400 text-white' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'}`}>⭐ {t('Save as quick-add')}</button>
        )}
      </div>

      {/* calculator keypad */}
      <div className="mt-3 grid grid-cols-4 gap-2">
        {KEYS.map((k) => {
          const op = /[÷×−+]/.test(k)
          return (
            <button key={k} onClick={() => press(k)}
              className={`h-12 rounded-2xl text-xl font-semibold transition active:scale-95 ${op ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300' : k === '⌫' ? 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200' : 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white'}`}>
              {k}
            </button>
          )
        })}
      </div>

      <div className="mt-3 flex gap-2">
        {editing && <Btn variant="danger" onClick={() => { onDelete(editing); onClose() }}>{t('Delete')}</Btn>}
        <Btn id="kh-save" className="flex-1" disabled={!valid} onClick={save}>
          {valid ? `${t('Save')} ${money(amount, true)}` : amount > 0 ? t('Pick a category') : t('Enter amount')}
        </Btn>
      </div>
    </Sheet>
  )
}
