import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { handleRedirect } from './lib/drive'

// finish Google login if we just came back from accounts.google.com
window.__authResult = handleRedirect()

// Capture Chrome's install prompt so the app can show its own "Install" button
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  window.__installEvt = e
  window.dispatchEvent(new Event('kh-install-ready'))
})

ReactDOM.createRoot(document.getElementById('root')).render(<App />)
