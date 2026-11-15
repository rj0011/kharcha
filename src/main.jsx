import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { handleRedirect } from './lib/drive'

// finish Google login if we just came back from accounts.google.com
window.__authResult = handleRedirect()

// when a new version of the app is installed by the service worker, reload once to use it
if ('serviceWorker' in navigator) {
  let reloaded = false
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (!reloaded) { reloaded = true; location.reload() } })
}
window.APP_VERSION = '1.4'

// Capture Chrome's install prompt so the app can show its own "Install" button
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  window.__installEvt = e
  window.dispatchEvent(new Event('kh-install-ready'))
})

ReactDOM.createRoot(document.getElementById('root')).render(<App />)
