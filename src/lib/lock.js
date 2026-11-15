// ---------- App lock: pattern + fingerprint (device screen lock via WebAuthn) ----------
// Stored only on this phone (never synced to Drive).
const KEY = 'kharcha_lock_v1'

export const getLock = () => {
  try { return JSON.parse(localStorage.getItem(KEY)) || { enabled: false } } catch { return { enabled: false } }
}
export const saveLock = (l) => localStorage.setItem(KEY, JSON.stringify(l))
export const clearLock = () => localStorage.removeItem(KEY)

const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)))
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0))

export async function hashPattern(pattern, salt) {
  const data = new TextEncoder().encode(salt + ':' + pattern.join('-'))
  return b64(await crypto.subtle.digest('SHA-256', data))
}

export async function setPattern(pattern) {
  const salt = b64(crypto.getRandomValues(new Uint8Array(16)))
  const l = getLock()
  saveLock({ ...l, enabled: true, salt, hash: await hashPattern(pattern, salt) })
}

export async function checkPattern(pattern) {
  const l = getLock()
  if (!l.hash) return false
  return (await hashPattern(pattern, l.salt)) === l.hash
}

export async function bioAvailable() {
  try {
    return !!(window.PublicKeyCredential && await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable())
  } catch { return false }
}

// Register fingerprint (Android shows fingerprint / face / screen lock)
export async function enableBio() {
  const cred = await navigator.credentials.create({
    publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      rp: { name: 'Kharcha' },
      user: { id: crypto.getRandomValues(new Uint8Array(16)), name: 'kharcha-user', displayName: 'Kharcha' },
      pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
      authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'discouraged' },
      timeout: 60000,
    },
  })
  saveLock({ ...getLock(), bioId: b64(cred.rawId) })
}

export async function verifyBio() {
  const l = getLock()
  if (!l.bioId) return false
  const r = await navigator.credentials.get({
    publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      allowCredentials: [{ type: 'public-key', id: unb64(l.bioId), transports: ['internal'] }],
      userVerification: 'required',
      timeout: 60000,
    },
  })
  return !!r
}

export const disableBio = () => { const l = getLock(); delete l.bioId; saveLock(l) }
