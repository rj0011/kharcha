// ---------- Google Drive (appDataFolder) as database ----------
// Docs: https://developers.google.com/drive/api/guides/appdata
//       https://developers.google.com/identity/oauth2/web/guides/use-token-model
// drive.appdata = hidden app database file, drive.file = only files this app creates (Kharcha Backups folder)
const SCOPE = 'https://www.googleapis.com/auth/drive.appdata https://www.googleapis.com/auth/drive.file'
const SCOPE_VER = '2'
const FILE_NAME = 'kharcha-data.json'
const TOKEN_KEY = 'kharcha_gtoken'
const CID_KEY = 'kharcha_client_id'

export const getClientId = () => import.meta.env.VITE_GOOGLE_CLIENT_ID || localStorage.getItem(CID_KEY) || ''
export const setClientId = (v) => localStorage.setItem(CID_KEY, (v || '').trim())

function readToken() {
  try {
    const t = JSON.parse(localStorage.getItem(TOKEN_KEY) || 'null')
    if (t && t.exp > Date.now() + 60000) return t.token
  } catch { /* ignore */ }
  return null
}
export const hasValidToken = () => !!readToken()
export const wasConnected = () => !!localStorage.getItem(TOKEN_KEY)
export const hasBackupScope = () => localStorage.getItem('kharcha_scope_ver') === SCOPE_VER
export function signOut() {
  const t = readToken()
  if (t && window.google?.accounts?.oauth2) window.google.accounts.oauth2.revoke(t, () => {})
  localStorage.removeItem(TOKEN_KEY)
}

function waitForGis(ms = 8000) {
  return new Promise((res, rej) => {
    const start = Date.now()
    const tick = () => {
      if (window.google?.accounts?.oauth2) return res()
      if (Date.now() - start > ms) return rej(new Error('Google script load nahi hua. Internet check karein.'))
      setTimeout(tick, 150)
    }
    tick()
  })
}

// Must be called from a user tap (popup)
export async function signIn() {
  const client_id = getClientId()
  if (!client_id) throw new Error('Pehle Settings me Google Client ID daalein.')
  await waitForGis()
  return new Promise((resolve, reject) => {
    const tc = window.google.accounts.oauth2.initTokenClient({
      client_id,
      scope: SCOPE,
      callback: (r) => {
        if (r.error) return reject(new Error(r.error_description || r.error))
        localStorage.setItem(TOKEN_KEY, JSON.stringify({ token: r.access_token, exp: Date.now() + (r.expires_in || 3600) * 1000 }))
        if ((r.scope || '').includes('drive.file')) localStorage.setItem('kharcha_scope_ver', SCOPE_VER)
        resolve(r.access_token)
      },
      error_callback: (e) => reject(new Error(e?.message || 'Login popup band ho gaya')),
    })
    tc.requestAccessToken({ prompt: wasConnected() && hasBackupScope() ? '' : 'consent' })
  })
}

async function api(url, opts = {}) {
  const token = readToken()
  if (!token) throw Object.assign(new Error('Google login expire ho gaya – dobara Connect karein'), { code: 401 })
  const r = await fetch(url, { ...opts, headers: { Authorization: `Bearer ${token}`, ...(opts.headers || {}) } })
  if (r.status === 401) { localStorage.removeItem(TOKEN_KEY); throw Object.assign(new Error('Google login expire ho gaya – dobara Connect karein'), { code: 401 }) }
  if (!r.ok) throw new Error(`Drive error ${r.status}: ${(await r.text()).slice(0, 120)}`)
  return r
}

async function findFile() {
  const q = encodeURIComponent(`name='${FILE_NAME}' and trashed=false`)
  const r = await api(`https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=${q}&fields=files(id,modifiedTime)`)
  const j = await r.json()
  return j.files?.[0] || null
}

export async function pull() {
  const f = await findFile()
  if (!f) return { id: null, data: null }
  const r = await api(`https://www.googleapis.com/drive/v3/files/${f.id}?alt=media`)
  return { id: f.id, data: await r.json() }
}

export async function push(data, id) {
  const body = JSON.stringify(data)
  if (id) {
    await api(`https://www.googleapis.com/upload/drive/v3/files/${id}?uploadType=media`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body,
    })
    return id
  }
  const boundary = 'kharcha' + Date.now()
  const meta = { name: FILE_NAME, parents: ['appDataFolder'], mimeType: 'application/json' }
  const multipart = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n${body}\r\n--${boundary}--`
  const r = await api('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id', {
    method: 'POST', headers: { 'Content-Type': `multipart/related; boundary=${boundary}` }, body: multipart,
  })
  return (await r.json()).id
}

// ---------- Backups in a visible "Kharcha Backups" folder of My Drive ----------
const FOLDER = 'Kharcha Backups'
const FOLDER_KEY = 'kharcha_backup_folder'

async function ensureFolder() {
  const cached = localStorage.getItem(FOLDER_KEY)
  if (cached) {
    const r = await fetch(`https://www.googleapis.com/drive/v3/files/${cached}?fields=id,trashed`, { headers: { Authorization: `Bearer ${readToken()}` } })
    if (r.ok && !(await r.json()).trashed) return cached
  }
  const q = encodeURIComponent(`name='${FOLDER}' and mimeType='application/vnd.google-apps.folder' and trashed=false`)
  const found = (await (await api(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id)`)).json()).files?.[0]
  let id = found?.id
  if (!id) {
    const r = await api('https://www.googleapis.com/drive/v3/files?fields=id', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: FOLDER, mimeType: 'application/vnd.google-apps.folder' }),
    })
    id = (await r.json()).id
  }
  localStorage.setItem(FOLDER_KEY, id)
  return id
}

export async function listBackups() {
  const folder = await ensureFolder()
  const q = encodeURIComponent(`'${folder}' in parents and trashed=false`)
  const r = await api(`https://www.googleapis.com/drive/v3/files?q=${q}&orderBy=name desc&pageSize=200&fields=files(id,name,size,modifiedTime)`)
  return (await r.json()).files || []
}

// create or overwrite a backup file by name
export async function writeBackup(name, data) {
  const folder = await ensureFolder()
  const files = await listBackups()
  const existing = files.find((f) => f.name === name)
  if (existing) return push(data, existing.id)
  const boundary = 'kbk' + Date.now()
  const meta = { name, parents: [folder], mimeType: 'application/json' }
  const body = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(data)}\r\n--${boundary}--`
  const r = await api('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id', {
    method: 'POST', headers: { 'Content-Type': `multipart/related; boundary=${boundary}` }, body,
  })
  return (await r.json()).id
}

export async function readBackup(id) {
  return (await api(`https://www.googleapis.com/drive/v3/files/${id}?alt=media`)).json()
}

// Daily copy (last 30 kept) + one monthly copy kept forever
export async function dailyBackup(data, today) {
  if (!hasBackupScope()) return false
  if (localStorage.getItem('kharcha_last_backup') === today) return false
  await writeBackup(`kharcha-daily-${today}.json`, data)
  const month = today.slice(0, 7)
  const files = await listBackups()
  if (!files.some((f) => f.name === `kharcha-monthly-${month}.json`)) await writeBackup(`kharcha-monthly-${month}.json`, data)
  const cutoff = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)
  for (const f of files) {
    const m = f.name.match(/^kharcha-daily-(\d{4}-\d{2}-\d{2})\.json$/)
    if (m && m[1] < cutoff) await api(`https://www.googleapis.com/drive/v3/files/${f.id}`, { method: 'DELETE' }).catch(() => {})
  }
  localStorage.setItem('kharcha_last_backup', today)
  return true
}
