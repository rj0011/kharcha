import { useState } from 'react'
import { Sheet, Btn } from '../components/ui'
import { cycleRange, parseYmd, inRange, sum, money, fmtDate, addDays, ymd, daysBetween } from '../lib/store'
import { t } from '../lib/i18n'

// ---- minimal PDF writer: each page = one JPEG image (no library, Hindi text works) ----
function makePdf(pages) {
  const enc = new TextEncoder()
  const parts = [], offsets = []
  let len = 0
  const push = (x) => { const b = typeof x === 'string' ? enc.encode(x) : x; parts.push(b); len += b.length }
  const obj = (n, body) => { offsets[n] = len; push(`${n} 0 obj\n`); body(); push('\nendobj\n') }
  push('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n')
  const W = 595, H = 842, n = pages.length
  const kids = pages.map((_, i) => `${3 + i * 3} 0 R`).join(' ')
  obj(1, () => push('<< /Type /Catalog /Pages 2 0 R >>'))
  obj(2, () => push(`<< /Type /Pages /Kids [${kids}] /Count ${n} >>`))
  pages.forEach((p, i) => {
    const pg = 3 + i * 3, im = pg + 1, ct = pg + 2
    obj(pg, () => push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /XObject << /Im${i} ${im} 0 R >> >> /Contents ${ct} 0 R >>`))
    obj(im, () => { push(`<< /Type /XObject /Subtype /Image /Width ${p.w} /Height ${p.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.jpg.length} >>\nstream\n`); push(p.jpg); push('\nendstream') })
    const cs = `q ${W} 0 0 ${H} 0 0 cm /Im${i} Do Q`
    obj(ct, () => push(`<< /Length ${cs.length} >>\nstream\n${cs}\nendstream`))
  })
  const xref = len, total = 3 + n * 3
  push(`xref\n0 ${total}\n0000000000 65535 f \n`)
  for (let i = 1; i < total; i++) push(String(offsets[i]).padStart(10, '0') + ' 00000 n \n')
  push(`trailer\n<< /Size ${total} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`)
  return new Blob(parts, { type: 'application/pdf' })
}

const PW = 1240, PH = 1754, M = 80
const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans", "Noto Sans Devanagari", sans-serif'

async function canvasToPage(c) {
  const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.88))
  return { w: c.width, h: c.height, jpg: new Uint8Array(await blob.arrayBuffer()) }
}
function newPage() {
  const c = document.createElement('canvas'); c.width = PW; c.height = PH
  const x = c.getContext('2d'); x.fillStyle = '#ffffff'; x.fillRect(0, 0, PW, PH); x.textBaseline = 'alphabetic'
  return [c, x]
}
const font = (x, size, weight = 400) => { x.font = `${weight} ${size}px ${FONT}` }
const rr = (x, X, Y, w, h, r) => { x.beginPath(); x.roundRect(X, Y, w, h, r) }

async function buildReport(data, catMap, range, label) {
  const inr = (n) => '₹' + Math.round(n).toLocaleString('en-IN')
  const tx = data.txns.filter((t) => !t.deleted && inRange(t.date, range)).sort((a, b) => a.date.localeCompare(b.date))
  const exp = tx.filter((t) => t.type === 'expense'), inc = tx.filter((t) => t.type === 'income')
  const spent = sum(exp), income = sum(inc)
  const byCat = {}; for (const t of exp) byCat[t.catId] = (byCat[t.catId] || 0) + t.amount
  const cats = Object.entries(byCat).sort((a, b) => b[1] - a[1])
  const byMethod = {}; for (const t of exp) byMethod[t.method] = (byMethod[t.method] || 0) + t.amount
  const pages = []

  // ---- page 1: summary ----
  let [c, x] = newPage()
  const g = x.createLinearGradient(0, 0, PW, 300); g.addColorStop(0, '#4f46e5'); g.addColorStop(0.6, '#7c3aed'); g.addColorStop(1, '#c026d3')
  x.fillStyle = g; x.fillRect(0, 0, PW, 300)
  x.fillStyle = '#fff'; font(x, 34, 600); x.fillText('KHARCHA · Monthly Report', M, 90)
  font(x, 64, 800); x.fillText(label, M, 175)
  font(x, 28); x.fillStyle = 'rgba(255,255,255,.85)'; x.fillText(`${data.settings.name || ''}${data.settings.name ? ' · ' : ''}${fmtDate(range.start, { day: 'numeric', month: 'short', year: 'numeric' })} – ${fmtDate(range.end, { day: 'numeric', month: 'short', year: 'numeric' })}`, M, 230)

  const boxes = [['Income', inr(income), '#059669'], ['Spent', inr(spent), '#e11d48'], [income - spent >= 0 ? 'Saved' : 'Overspent', inr(Math.abs(income - spent)), income - spent >= 0 ? '#4f46e5' : '#e11d48']]
  const bw = (PW - M * 2 - 40) / 3
  boxes.forEach(([k, v, col], i) => {
    const X = M + i * (bw + 20), Y = 340
    x.fillStyle = '#f8fafc'; rr(x, X, Y, bw, 150, 24); x.fill()
    x.fillStyle = '#64748b'; font(x, 26, 600); x.fillText(k.toUpperCase(), X + 28, Y + 52)
    x.fillStyle = col; font(x, 48, 800); x.fillText(v, X + 28, Y + 115)
  })
  const days = Math.max(1, daysBetween(range.start, range.end < ymd(new Date()) ? range.end : ymd(new Date())))
  x.fillStyle = '#334155'; font(x, 28)
  x.fillText(`${exp.length} expenses · average ${inr(spent / days)} per day · biggest ${exp.length ? inr(Math.max(...exp.map((e) => e.amount))) : '—'}`, M, 550)

  // categories
  x.fillStyle = '#0f172a'; font(x, 38, 800); x.fillText('Where the money went', M, 640)
  let Y = 680
  for (const [id, v] of cats.slice(0, 9)) {
    const cat = catMap[id] || { name: id, icon: '📦', color: '#64748b' }
    font(x, 30, 600); x.fillStyle = '#1e293b'; x.fillText(`${cat.icon}  ${cat.name}`, M, Y + 30)
    font(x, 30, 700); x.textAlign = 'right'; x.fillText(`${inr(v)}  ·  ${Math.round((v / spent) * 100)}%`, PW - M, Y + 30); x.textAlign = 'left'
    x.fillStyle = '#eef2ff'; rr(x, M, Y + 46, PW - M * 2, 16, 8); x.fill()
    x.fillStyle = cat.color || '#6366f1'; rr(x, M, Y + 46, Math.max(16, (PW - M * 2) * (v / cats[0][1])), 16, 8); x.fill()
    Y += 92
  }
  if (!cats.length) { font(x, 28); x.fillStyle = '#94a3b8'; x.fillText('No expenses in this period', M, Y + 30); Y += 60 }

  // daily bars
  Y = Math.max(Y + 30, 1290)
  x.fillStyle = '#0f172a'; font(x, 38, 800); x.fillText('Daily spending', M, Y)
  const dayVals = []; for (let d = parseYmd(range.start); ymd(d) <= range.end; d = addDays(d, 1)) { const s = ymd(d); dayVals.push([s, sum(exp.filter((e) => e.date === s))]) }
  const mx = Math.max(1, ...dayVals.map((d) => d[1])), chH = 230, base = Y + 40 + chH, bwid = (PW - M * 2) / dayVals.length
  dayVals.forEach(([s, v], i) => {
    const h = (v / mx) * chH
    x.fillStyle = v === mx && v > 0 ? '#db2777' : '#6366f1'; rr(x, M + i * bwid + 3, base - h, Math.max(4, bwid - 6), Math.max(2, h), 5); x.fill()
    if (i % 5 === 0) { font(x, 20); x.fillStyle = '#94a3b8'; x.fillText(String(+s.slice(8)), M + i * bwid + 2, base + 28) }
  })
  const methods = Object.entries(byMethod).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${inr(v)}`).join('   ·   ')
  font(x, 26); x.fillStyle = '#475569'; x.fillText('Paid via:  ' + (methods || '—'), M, base + 80)
  font(x, 22); x.fillStyle = '#94a3b8'; x.fillText('Generated by Kharcha · Designed by Manish Shukla', M, PH - 50)
  pages.push(await canvasToPage(c))

  // ---- entries pages ----
  const rows = tx, perPage = 34
  for (let p = 0; p < Math.ceil(rows.length / perPage); p++) {
    ;[c, x] = newPage()
    x.fillStyle = '#0f172a'; font(x, 40, 800); x.fillText(`All entries · ${label}`, M, 110)
    font(x, 24, 700); x.fillStyle = '#64748b'
    x.fillText('DATE', M, 180); x.fillText('CATEGORY / NOTE', M + 200, 180); x.fillText('VIA', M + 760, 180); x.textAlign = 'right'; x.fillText('AMOUNT', PW - M, 180); x.textAlign = 'left'
    let y = 230
    rows.slice(p * perPage, (p + 1) * perPage).forEach((r, i) => {
      if (i % 2 === 0) { x.fillStyle = '#f8fafc'; x.fillRect(M - 16, y - 34, PW - M * 2 + 32, 44) }
      const cat = catMap[r.catId] || { name: r.catId, icon: '' }
      font(x, 24); x.fillStyle = '#334155'; x.fillText(fmtDate(r.date, { day: '2-digit', month: 'short' }), M, y)
      let label2 = `${cat.icon} ${cat.name}${r.note ? ' – ' + r.note : ''}`
      while (x.measureText(label2).width > 540 && label2.length > 4) label2 = label2.slice(0, -2)
      x.fillText(label2, M + 200, y); x.fillStyle = '#64748b'; x.fillText(r.method || '', M + 760, y)
      font(x, 26, 700); x.fillStyle = r.type === 'income' ? '#059669' : '#0f172a'; x.textAlign = 'right'
      x.fillText((r.type === 'income' ? '+' : '−') + inr(r.amount), PW - M, y); x.textAlign = 'left'
      y += 44
    })
    font(x, 22); x.fillStyle = '#94a3b8'; x.fillText(`Page ${p + 2}`, M, PH - 50)
    pages.push(await canvasToPage(c))
  }
  return makePdf(pages)
}

export default function ReportPage({ open, onClose, data, catMap, flash }) {
  const [off, setOff] = useState(0)
  const [busy, setBusy] = useState(false)
  const sd = data.settings.salaryDay
  const cur = parseYmd(cycleRange(new Date(), sd).start)
  const range = cycleRange(new Date(cur.getFullYear(), cur.getMonth() + off, cur.getDate()), sd)
  const label = +sd === 1 ? parseYmd(range.start).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) : `${fmtDate(range.start)} – ${fmtDate(range.end)}`
  const tx = data.txns.filter((x) => !x.deleted && inRange(x.date, range))

  const make = async (share) => {
    setBusy(true)
    try {
      const pdf = await buildReport(data, catMap, range, label)
      const file = new File([pdf], `Kharcha-${range.start.slice(0, 7)}.pdf`, { type: 'application/pdf' })
      if (share && navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title: 'Kharcha report ' + label }) }
      else { const a = document.createElement('a'); a.href = URL.createObjectURL(file); a.download = file.name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 3000); flash('📄 PDF downloaded') }
    } catch (e) { if (e.name !== 'AbortError') flash('⚠️ ' + e.message) }
    setBusy(false)
  }

  return (
    <Sheet open={open} onClose={onClose} title={`📊 ${t('Monthly PDF report')}`}>
      <div className="flex items-center justify-between">
        <button onClick={() => setOff(off - 1)} className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-xl dark:bg-slate-800 dark:text-white">‹</button>
        <div className="text-center"><div className="font-bold text-slate-900 dark:text-white">{label}</div><div className="text-xs text-slate-500">{tx.length} entries · spent {money(sum(tx.filter((x) => x.type === 'expense')))}</div></div>
        <button disabled={off >= 0} onClick={() => setOff(off + 1)} className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-xl disabled:opacity-30 dark:bg-slate-800 dark:text-white">›</button>
      </div>
      <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">
        PDF includes: income / spent / saved, category breakdown, daily chart, payment methods and every entry.
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Btn variant="soft" disabled={busy} onClick={() => make(false)}>⬇️ Download</Btn>
        <Btn disabled={busy} onClick={() => make(true)}>{busy ? 'Creating…' : '📤 ' + t('Share')}</Btn>
      </div>
    </Sheet>
  )
}
