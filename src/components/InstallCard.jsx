import { useEffect, useState } from 'react'

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
const ua = navigator.userAgent
const inAppBrowser = /; wv\)|FBAN|FBAV|Instagram|WhatsApp|Line\//i.test(ua)
const isAndroid = /Android/i.test(ua)

export default function InstallCard() {
  const [evt, setEvt] = useState(window.__installEvt || null)
  const [installed, setInstalled] = useState(isStandalone())
  const [help, setHelp] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const ready = () => setEvt(window.__installEvt)
    const done = () => setInstalled(true)
    window.addEventListener('kh-install-ready', ready)
    window.addEventListener('appinstalled', done)
    return () => { window.removeEventListener('kh-install-ready', ready); window.removeEventListener('appinstalled', done) }
  }, [])

  if (installed) return null

  const install = async () => {
    if (!evt) { setHelp(true); return }
    evt.prompt()
    const r = await evt.userChoice
    if (r.outcome === 'accepted') setInstalled(true)
    window.__installEvt = null
    setEvt(null)
  }
  const copy = async () => {
    try { await navigator.clipboard.writeText(location.href.split('?')[0]); setCopied(true) } catch { /* ignore */ }
  }

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-500 to-teal-500 p-4 text-white shadow-lg shadow-emerald-500/30">
      <div className="flex items-center gap-3">
        <img src="./pwa-192.png" alt="" className="h-12 w-12 rounded-2xl ring-2 ring-white/50" />
        <div className="flex-1">
          <div className="font-bold">Install Kharcha app</div>
          <div className="text-xs text-white/85">Icon on home screen · opens full-screen · works offline</div>
        </div>
        <button onClick={install} className="rounded-2xl bg-white px-4 py-2.5 text-sm font-bold text-emerald-700 shadow active:scale-95">
          📲 Install
        </button>
      </div>

      {help && (
        <div className="mt-3 rounded-2xl bg-white/15 p-3 text-sm leading-relaxed">
          {inAppBrowser ? (
            <>
              <b>Open this link in Google Chrome</b> (you are in another app's browser).
              <button onClick={copy} className="mt-2 block w-full rounded-xl bg-white py-2 font-semibold text-emerald-700">
                {copied ? '✅ Link copied – paste in Chrome' : '📋 Copy link'}
              </button>
            </>
          ) : isAndroid ? (
            <>
              <b>In Chrome:</b> tap <b>⋮</b> (top-right) → <b>Install app</b> (or <b>Add to Home screen</b> → <b>Install</b>).
              <div className="mt-1 text-xs text-white/80">If you don't see "Install", pull down to refresh the page, wait 5 seconds and try again.</div>
            </>
          ) : (
            <>Use Chrome menu → <b>Install app</b> / <b>Add to Home screen</b>.</>
          )}
        </div>
      )}
    </div>
  )
}
