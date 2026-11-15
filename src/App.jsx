import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Home from './components/Home'
import History from './components/History'
const Reports = lazy(() => import('./components/Reports'))
import More from './components/More'
import AddSheet from './components/AddSheet'
import { loadData, saveData, mergeData, uid, now, today } from './lib/store'
import * as drive from './lib/drive'
import { LockScreen } from './components/Lock'
import { getLock } from './lib/lock'

const TABS = [
  { id: 'home', label: 'Home', icon: (a) => <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" fill={a ? 'currentColor' : 'none'} /> },
  { id: 'history', label: 'History', icon: () => <><rect x="4" y="3" width="16" height="18" rx="3" /><path d="M8 8h8M8 12h8M8 16h5" /></> },
  { id: 'add' },
  { id: 'reports', label: 'Reports', icon: () => <><path d="M12 3a9 9 0 1 0 9 9h-9z" /><path d="M15 3.5A9 9 0 0 1 20.5 9H15z" /></> },
  { id: 'more', label: 'More', icon: () => <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></> },
]
const TITLES = { home: 'Kharcha', history: 'History', reports: 'Reports', more: 'Settings' }

export default function App() {
  const [data, setData] = useState(loadData)
  const [tab, setTab] = useState('home')
  const [section, setSection] = useState(null)
  const [sheet, setSheet] = useState({ open: false, editing: null, type: null })
  const [toast, setToast] = useState('')
  const [sync, setSync] = useState({
    connected: drive.wasConnected(), tokenOk: drive.hasValidToken(), status: 'idle', error: '',
    last: +localStorage.getItem('kharcha_last_sync') || 0,
    lastBackup: localStorage.getItem('kharcha_last_backup') || '',
    backupScope: drive.hasBackupScope(),
  })
  const [locked, setLocked] = useState(() => getLock().enabled)
  const hiddenAt = useRef(0)
  const dataRef = useRef(data)
  const fileId = useRef(localStorage.getItem('kharcha_file_id') || null)
  const dirty = useRef(false)
  const timer = useRef()
  const toastT = useRef()

  useEffect(() => { dataRef.current = data; saveData(data) }, [data])

  // warm up the Reports chunk when the phone is idle, so the tab opens instantly
  useEffect(() => {
    const idle = window.requestIdleCallback || ((f) => setTimeout(f, 1500))
    idle(() => import('./components/Reports'))
  }, [])

  // theme
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const dark = data.settings.theme === 'dark' || (data.settings.theme === 'system' && mq.matches)
      document.documentElement.classList.toggle('dark', dark)
      document.querySelector('meta[name=theme-color]')?.setAttribute('content', dark ? '#020617' : '#6366f1')
    }
    apply(); mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [data.settings.theme])

  const flash = (m) => { setToast(m); clearTimeout(toastT.current); toastT.current = setTimeout(() => setToast(''), 2200) }

  // ---------- Google Drive sync ----------
  const doSync = useCallback(async (silent = false) => {
    if (!drive.hasValidToken()) { setSync((s) => ({ ...s, tokenOk: false })); return }
    if (!navigator.onLine) { setSync((s) => ({ ...s, error: 'Offline – will sync later' })); return }
    setSync((s) => ({ ...s, status: 'syncing', error: '' }))
    try {
      const wasDirty = dirty.current
      dirty.current = false
      const { id, data: remote } = await drive.pull()
      const merged = mergeData(dataRef.current, remote)
      const newId = await drive.push(merged, id || null)
      fileId.current = newId; localStorage.setItem('kharcha_file_id', newId)
      setData((cur) => mergeData(cur, merged))
      const t = Date.now(); localStorage.setItem('kharcha_last_sync', t)
      setSync((s) => ({ ...s, status: 'idle', last: t, tokenOk: true, connected: true, backupScope: drive.hasBackupScope() }))
      // automatic daily + monthly backup copy (visible "Kharcha Backups" folder)
      drive.dailyBackup(merged, today()).then((done) => { if (done) setSync((s) => ({ ...s, lastBackup: today() })) }).catch(() => {})
      if (!silent) flash(wasDirty || remote ? 'Synced with Google Drive ✅' : 'Up to date ✅')
    } catch (e) {
      dirty.current = true
      setSync((s) => ({ ...s, status: 'idle', error: e.message, tokenOk: drive.hasValidToken() }))
      if (!silent) flash('⚠️ ' + e.message)
    }
  }, [])

  const connect = async () => {
    try {
      await drive.signIn()
      setSync((s) => ({ ...s, connected: true, tokenOk: true, error: '', backupScope: drive.hasBackupScope() }))
      await doSync()
    } catch (e) { flash('⚠️ ' + e.message) }
  }
  const disconnect = () => { drive.signOut(); localStorage.removeItem('kharcha_file_id'); setSync((s) => ({ ...s, connected: false, tokenOk: false })); flash('Disconnected') }

  useEffect(() => {
    if (drive.hasValidToken()) doSync(true)
    const on = () => { if (dirty.current && drive.hasValidToken()) doSync(true) }
    const vis = () => {
      if (document.visibilityState === 'hidden') { hiddenAt.current = Date.now(); return }
      setSync((s) => ({ ...s, tokenOk: drive.hasValidToken() }))
      if (getLock().enabled && hiddenAt.current && Date.now() - hiddenAt.current > 30000) setLocked(true)
    }
    window.addEventListener('online', on); document.addEventListener('visibilitychange', vis)
    return () => { window.removeEventListener('online', on); document.removeEventListener('visibilitychange', vis) }
  }, [doSync])

  // user change => save locally + schedule auto sync
  const update = useCallback((fn) => {
    setData((d) => fn(d))
    dirty.current = true
    clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      if (dataRef.current.settings.autoSync && drive.hasValidToken()) doSync(true)
      else setSync((s) => ({ ...s, tokenOk: drive.hasValidToken() }))
    }, 2000)
  }, [doSync])

  // ---------- entries ----------
  const saveTxn = (t) => {
    update((d) => ({ ...d, txns: d.txns.some((x) => x.id === t.id) ? d.txns.map((x) => (x.id === t.id ? t : x)) : [...d.txns, t] }))
    flash(t.type === 'expense' ? 'Expense saved 💸' : 'Income added 💰')
  }
  const delTxn = (t) => { update((d) => ({ ...d, txns: d.txns.map((x) => (x.id === t.id ? { ...x, deleted: true, updatedAt: now() } : x)) })); flash('Deleted – restore from More → Recently deleted') }
  const addSalary = () => saveTxn({ id: uid(), type: 'income', amount: +data.settings.salary, catId: 'salary', method: 'Bank', date: today(), note: 'Salary', createdAt: now(), updatedAt: now() })

  const restoreTxn = (t) => { update((d) => ({ ...d, txns: d.txns.map((x) => (x.id === t.id ? { ...x, deleted: false, updatedAt: now() } : x)) })); flash('Entry restored ✅') }
  const backupNow = async (name) => {
    if (!drive.hasValidToken() || !drive.hasBackupScope()) throw new Error('Connect Google Drive first (tap Reconnect)')
    await drive.writeBackup(name || `kharcha-manual-${today()}-${Date.now().toString().slice(-5)}.json`, dataRef.current)
    localStorage.setItem('kharcha_last_backup', today()); setSync((s) => ({ ...s, lastBackup: today() }))
  }
  const clearAll = async () => {
    try { await backupNow(`kharcha-before-clear-${today()}-${Date.now().toString().slice(-5)}.json`); flash('Backup saved in Drive, clearing…') }
    catch {
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(dataRef.current)], { type: 'application/json' }))
      a.download = `kharcha-before-clear-${today()}.json`; a.click(); flash('Backup file downloaded, clearing…')
    }
    update((d) => ({ ...d, txns: d.txns.map((t) => (t.deleted ? t : { ...t, deleted: true, updatedAt: now() })) }))
  }
  const restoreBackup = async (id) => {
    const b = await drive.readBackup(id)
    const t = now()
    const bump = (arr = []) => arr.filter((x) => !x.deleted).map((x) => ({ ...x, updatedAt: t }))
    update((d) => mergeData(d, { settings: d.settings, categories: bump(b.categories), txns: bump(b.txns) }))
    flash('Backup restored ✅')
  }

  const catMap = useMemo(() => Object.fromEntries(data.categories.map((c) => [c.id, c])), [data.categories])
  const goto = (t, sec = null) => { setTab(t); setSection(sec); window.scrollTo({ top: 0 }) }
  const edit = (t) => setSheet({ open: true, editing: t, type: null })
  const pending = sync.connected && (!sync.tokenOk || sync.error || !sync.backupScope)

  return (
    <div className="mx-auto min-h-full max-w-md bg-slate-100 dark:bg-slate-950">
      <header className="sticky top-0 z-30 flex items-center justify-between bg-slate-100/85 px-5 pb-3 pt-[max(14px,env(safe-area-inset-top))] backdrop-blur dark:bg-slate-950/85">
        <div className="flex items-center gap-2">
          <img src="./pwa-192.png" alt="" className="h-8 w-8 rounded-xl" />
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">{TITLES[tab]}</h1>
        </div>
        <button onClick={() => (sync.connected ? (sync.tokenOk && sync.backupScope ? doSync() : connect()) : goto('more'))}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ${pending ? 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/30' : sync.connected ? 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/30' : 'bg-white text-slate-500 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800'}`}>
          <svg viewBox="0 0 24 24" className={`h-4 w-4 ${sync.status === 'syncing' ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            {sync.status === 'syncing' ? <path d="M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5" /> : <path d="M7 18a4.5 4.5 0 0 1-.6-9A6 6 0 0 1 18 8a4 4 0 0 1 0 8H7z" />}
          </svg>
          {sync.status === 'syncing' ? 'Syncing' : !sync.connected ? 'Connect Drive' : pending ? 'Tap to sync' : 'Synced'}
        </button>
      </header>

      <main className="px-4 pb-32">
        {tab === 'home' && <Home data={data} catMap={catMap} onEdit={edit} onAddSalary={addSalary} goto={goto} />}
        {tab === 'history' && <History data={data} catMap={catMap} onEdit={edit} />}
        {tab === 'reports' && (
          <Suspense fallback={<div className="py-20 text-center text-sm text-slate-400">Loading reports…</div>}>
            <Reports data={data} catMap={catMap} />
          </Suspense>
        )}
        {tab === 'more' && <More data={data} update={update} sync={sync} onConnect={connect} onSync={() => doSync()} onDisconnect={disconnect} section={section} flash={flash}
          onBackupNow={backupNow} onListBackups={drive.listBackups} onRestoreBackup={restoreBackup} onClearAll={clearAll} onRestoreTxn={restoreTxn}
          setTheme={(v) => update((d) => ({ ...d, settings: { ...d.settings, theme: v, updatedAt: now() } }))} />}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-md safe-bottom">
        <div className="mx-3 mb-3 flex items-center justify-around rounded-[26px] bg-white/90 px-2 py-2 shadow-2xl shadow-slate-900/10 ring-1 ring-slate-200 backdrop-blur dark:bg-slate-900/90 dark:ring-slate-800">
          {TABS.map((t) => t.id === 'add' ? (
            <button key="add" aria-label="Add expense" onClick={() => setSheet({ open: true, editing: null, type: 'expense' })}
              className="-mt-9 grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 text-white shadow-xl shadow-indigo-500/40 ring-4 ring-slate-100 transition active:scale-95 dark:ring-slate-950">
              <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
            </button>
          ) : (
            <button key={t.id} onClick={() => goto(t.id)} className={`flex w-16 flex-col items-center gap-0.5 rounded-2xl py-1 text-[11px] font-semibold transition ${tab === t.id ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`}>
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">{t.icon(tab === t.id)}</svg>
              {t.label}
            </button>
          ))}
        </div>
      </nav>

      <AddSheet open={sheet.open} editing={sheet.editing} presetType={sheet.type} data={data}
        onClose={() => setSheet({ open: false, editing: null, type: null })} onSave={saveTxn} onDelete={delTxn} />

      {locked && <LockScreen onUnlock={() => setLocked(false)} />}

      {toast && (
        <div className="fixed inset-x-0 bottom-28 z-[60] flex justify-center px-6 anim-pop">
          <div className="rounded-full bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-xl dark:bg-white dark:text-slate-900">{toast}</div>
        </div>
      )}
    </div>
  )
}
