import { useEffect, useRef, useState } from 'react'
import { Card, Sheet, Input, Btn, Seg, Chip } from './ui'
import { COLORS, METHODS, uid, now, money, toCSV, download, today, mergeData } from '../lib/store'
import { getClientId, setClientId } from '../lib/drive'

const EMOJIS = ['🍔', '☕', '🍕', '🛒', '🥦', '🚕', '🚌', '🚆', '✈️', '⛽', '🛵', '⚡', '📱', '💡', '🏠', '🛍️', '👕', '💊', '🏥', '📚', '🎓', '🎬', '🎮', '🎵', '🏦', '💳', '👨‍👩‍👧', '🎁', '💼', '💰', '🐶', '💇', '🏋️', '🧾', '🔧', '🙏', '📦', '🍺', '🚬', '🧴']

function Row({ icon, title, sub, onClick, right }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 px-4 py-3.5 text-left active:bg-slate-50 dark:active:bg-slate-800/60">
      <div className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-100 text-xl dark:bg-slate-800">{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="font-semibold text-slate-800 dark:text-slate-100">{title}</div>
        {sub && <div className="truncate text-xs text-slate-500">{sub}</div>}
      </div>
      {right ?? <span className="text-slate-300">›</span>}
    </button>
  )
}

function CatEditor({ open, onClose, cat, onSave, onDelete }) {
  const [c, setC] = useState(cat)
  useEffect(() => setC(cat), [cat])
  if (!c) return null
  return (
    <Sheet open={open} onClose={onClose} title={cat?.name ? 'Edit category' : 'New category'}>
      <div className="space-y-4">
        <Seg value={c.kind} onChange={(v) => setC({ ...c, kind: v })} options={[{ value: 'expense', label: 'Expense' }, { value: 'income', label: 'Income' }]} />
        <div className="flex items-center gap-3">
          <div className="grid h-14 w-14 place-items-center rounded-2xl text-3xl" style={{ background: c.color + '22' }}>{c.icon}</div>
          <div className="flex-1"><Input placeholder="Category name" value={c.name} onChange={(e) => setC({ ...c, name: e.target.value })} /></div>
        </div>
        <div className="grid grid-cols-8 gap-1.5">
          {EMOJIS.map((e) => <button key={e} onClick={() => setC({ ...c, icon: e })} className={`rounded-xl p-1.5 text-xl ${c.icon === e ? 'bg-indigo-100 dark:bg-indigo-500/25' : ''}`}>{e}</button>)}
        </div>
        <div className="flex flex-wrap gap-2">
          {COLORS.map((col) => <button key={col} onClick={() => setC({ ...c, color: col })} className={`h-8 w-8 rounded-full ${c.color === col ? 'ring-4 ring-offset-2 dark:ring-offset-slate-900' : ''}`} style={{ background: col, '--tw-ring-color': col + '66' }} />)}
        </div>
        {c.kind === 'expense' && <Input label="Monthly budget (0 = none)" inputMode="numeric" value={c.budget || ''} onChange={(e) => setC({ ...c, budget: +e.target.value.replace(/\D/g, '') || 0 })} />}
        <div className="flex gap-2">
          {cat?.name && <Btn variant="danger" onClick={() => { if (confirm('Delete category? Old entries stay.')) { onDelete(c); onClose() } }}>Delete</Btn>}
          <Btn className="flex-1" disabled={!c.name.trim()} onClick={() => { onSave({ ...c, name: c.name.trim(), updatedAt: now() }); onClose() }}>Save</Btn>
        </div>
      </div>
    </Sheet>
  )
}

export default function More({ data, update, sync, onConnect, onSync, onDisconnect, section, setTheme }) {
  const s = data.settings
  const [salaryOpen, setSalaryOpen] = useState(false)
  const [catsOpen, setCatsOpen] = useState(section === 'cats')
  const [driveOpen, setDriveOpen] = useState(false)
  const [editCat, setEditCat] = useState(null)
  const [form, setForm] = useState(s)
  const [cid, setCid] = useState(getClientId())
  const fileRef = useRef()
  useEffect(() => { if (section === 'cats') setCatsOpen(true) }, [section])

  const saveSettings = () => { update((d) => ({ ...d, settings: { ...d.settings, ...form, salary: +form.salary || 0, salaryDay: Math.min(28, Math.max(1, +form.salaryDay || 1)), openingBalance: +form.openingBalance || 0, monthlyBudget: +form.monthlyBudget || 0, updatedAt: now() } })); setSalaryOpen(false) }
  const saveCat = (c) => update((d) => ({ ...d, categories: d.categories.some((x) => x.id === c.id) ? d.categories.map((x) => (x.id === c.id ? c : x)) : [...d.categories, c] }))
  const delCat = (c) => update((d) => ({ ...d, categories: d.categories.map((x) => (x.id === c.id ? { ...x, deleted: true, updatedAt: now() } : x)) }))

  const importJson = (e) => {
    const f = e.target.files?.[0]; if (!f) return
    f.text().then((txt) => {
      try { const j = JSON.parse(txt); if (!j.txns) throw 0; update((d) => mergeData(d, j)); alert('Backup restored & merged ✅') } catch { alert('Invalid backup file') }
    })
    e.target.value = ''
  }
  const liveCats = data.categories.filter((c) => !c.deleted)
  const syncSub = sync.connected ? (sync.status === 'syncing' ? 'Syncing…' : sync.error ? '⚠️ ' + sync.error : sync.last ? 'Last synced ' + new Date(sync.last).toLocaleString('en-IN', { hour: 'numeric', minute: '2-digit', day: 'numeric', month: 'short' }) : 'Connected') : 'Not connected – data only on this phone'

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
        <Row icon="💼" title="Salary & balance" sub={`${money(s.salary)} on day ${s.salaryDay} · Opening ${money(s.openingBalance)}`} onClick={() => { setForm(s); setSalaryOpen(true) }} />
        <Row icon="🗂️" title="Categories & budgets" sub={`${liveCats.length} categories`} onClick={() => setCatsOpen(true)} />
        <Row icon="☁️" title="Google Drive sync" sub={syncSub} onClick={() => setDriveOpen(true)}
          right={<span className={`h-2.5 w-2.5 rounded-full ${sync.connected ? (sync.error ? 'bg-amber-500' : 'bg-emerald-500') : 'bg-slate-300'}`} />} />
      </Card>

      <Card className="p-4">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Appearance</div>
        <Seg value={s.theme} onChange={setTheme} options={[{ value: 'light', label: '☀️ Light' }, { value: 'dark', label: '🌙 Dark' }, { value: 'system', label: '📱 Auto' }]} />
        <div className="mt-4 mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Default payment method</div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {METHODS.map((m) => <Chip key={m.id} active={s.defaultMethod === m.id} onClick={() => update((d) => ({ ...d, settings: { ...d.settings, defaultMethod: m.id, updatedAt: now() } }))}>{m.icon} {m.id}</Chip>)}
        </div>
      </Card>

      <Card className="overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
        <Row icon="📊" title="Export to Excel (CSV)" sub="All entries – opens in Excel / Sheets" onClick={() => download(`kharcha-${today()}.csv`, toCSV(data.txns.filter((t) => !t.deleted), data.categories), 'text/csv')} />
        <Row icon="💾" title="Download backup (JSON)" sub="Full offline backup file" onClick={() => download(`kharcha-backup-${today()}.json`, JSON.stringify(data), 'application/json')} />
        <Row icon="📥" title="Restore backup" sub="Merge a JSON backup file" onClick={() => fileRef.current?.click()} />
        <input ref={fileRef} type="file" accept=".json,application/json" className="hidden" onChange={importJson} />
        <Row icon="🧹" title="Clear all entries" sub="Deletes every entry (also from Drive on next sync)" onClick={() => {
          if (confirm('Delete ALL entries? This cannot be undone.') && confirm('Are you sure?')) update((d) => ({ ...d, txns: d.txns.map((t) => ({ ...t, deleted: true, updatedAt: now() })) }))
        }} />
      </Card>
      <p className="text-center text-xs text-slate-400">Kharcha v1.0 · Your data stays on your phone + your own Google Drive</p>

      {/* Salary sheet */}
      <Sheet open={salaryOpen} onClose={() => setSalaryOpen(false)} title="Salary & balance">
        <div className="space-y-3">
          <Input label="Your name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input label="Monthly salary (₹)" inputMode="numeric" value={form.salary || ''} onChange={(e) => setForm({ ...form, salary: e.target.value.replace(/[^0-9.]/g, '') })} />
          <Input label="Salary credit day (1–28) – month cycle starts here" inputMode="numeric" value={form.salaryDay} onChange={(e) => setForm({ ...form, salaryDay: e.target.value.replace(/\D/g, '') })} />
          <Input label="Opening balance (money you have right now)" inputMode="numeric" value={form.openingBalance || ''} onChange={(e) => setForm({ ...form, openingBalance: e.target.value.replace(/[^0-9.-]/g, '') })} />
          <Input label="Monthly spending limit (optional, 0 = use salary)" inputMode="numeric" value={form.monthlyBudget || ''} onChange={(e) => setForm({ ...form, monthlyBudget: e.target.value.replace(/[^0-9.]/g, '') })} />
          <Btn className="w-full" onClick={saveSettings}>Save</Btn>
        </div>
      </Sheet>

      {/* Categories sheet */}
      <Sheet open={catsOpen} onClose={() => setCatsOpen(false)} title="Categories & budgets">
        {['expense', 'income'].map((k) => (
          <div key={k} className="mb-4">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{k}</div>
            <div className="grid grid-cols-2 gap-2">
              {liveCats.filter((c) => c.kind === k).map((c) => (
                <button key={c.id} onClick={() => setEditCat(c)} className="flex items-center gap-2 rounded-2xl p-2.5 text-left" style={{ background: c.color + '18' }}>
                  <span className="text-xl">{c.icon}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{c.name}</span>
                    {c.budget > 0 && <span className="block text-[11px] text-slate-500">Budget {money(c.budget)}</span>}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}
        <Btn className="w-full" onClick={() => setEditCat({ id: uid(), name: '', icon: '📦', color: COLORS[liveCats.length % COLORS.length], kind: 'expense', budget: 0 })}>+ New category</Btn>
      </Sheet>
      <CatEditor open={!!editCat} cat={editCat} onClose={() => setEditCat(null)} onSave={saveCat} onDelete={delCat} />

      {/* Drive sheet */}
      <Sheet open={driveOpen} onClose={() => setDriveOpen(false)} title="Google Drive sync">
        <div className="space-y-3">
          <div className="rounded-2xl bg-indigo-50 p-3 text-sm text-indigo-900 dark:bg-indigo-500/15 dark:text-indigo-200">
            Data is saved in a private hidden app folder of <b>your</b> Google Drive (<code>appDataFolder</code>). Works offline – syncs when internet is back.
          </div>
          {!import.meta.env.VITE_GOOGLE_CLIENT_ID && (
            <>
              <Input label="Google OAuth Client ID" placeholder="xxxx.apps.googleusercontent.com" value={cid} onChange={(e) => setCid(e.target.value)} className="text-xs" />
              <Btn variant="ghost" className="w-full text-sm" onClick={() => { setClientId(cid); alert('Saved ✅ Now tap Connect') }}>Save Client ID</Btn>
            </>
          )}
          <div className="rounded-2xl bg-slate-100 p-3 text-sm dark:bg-slate-800 dark:text-slate-200">Status: <b>{syncSub}</b></div>
          {!sync.connected || !sync.tokenOk
            ? <Btn className="w-full" onClick={onConnect}>🔗 {sync.connected ? 'Reconnect' : 'Connect'} Google Drive</Btn>
            : <Btn className="w-full" disabled={sync.status === 'syncing'} onClick={onSync}>🔄 Sync now</Btn>}
          {sync.connected && (
            <div className="flex items-center justify-between rounded-2xl bg-slate-100 px-4 py-3 text-sm dark:bg-slate-800 dark:text-slate-200">
              <span>Auto-sync after every change</span>
              <input type="checkbox" className="h-5 w-5 accent-indigo-600" checked={s.autoSync} onChange={(e) => update((d) => ({ ...d, settings: { ...d.settings, autoSync: e.target.checked, updatedAt: now() } }))} />
            </div>
          )}
          {sync.connected && <Btn variant="danger" className="w-full" onClick={onDisconnect}>Disconnect</Btn>}
        </div>
      </Sheet>
    </div>
  )
}
