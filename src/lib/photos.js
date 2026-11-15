// Bill photos: compressed JPEG stored in IndexedDB (device) + uploaded to Drive
const DB = 'kharcha_photos', STORE = 'p'
const open = () => new Promise((res, rej) => {
  const r = indexedDB.open(DB, 1)
  r.onupgradeneeded = () => r.result.createObjectStore(STORE)
  r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error)
})
const tx = async (mode, fn) => { const db = await open(); return new Promise((res, rej) => { const t = db.transaction(STORE, mode); const out = fn(t.objectStore(STORE)); t.oncomplete = () => res(out?.result); t.onerror = () => rej(t.error) }) }
export const putPhoto = (key, blob) => tx('readwrite', (s) => s.put(blob, key))
export const getPhoto = (key) => tx('readonly', (s) => s.get(key))
export const delPhoto = (key) => tx('readwrite', (s) => s.delete(key))

// resize to max 1280px, JPEG ~70%
export async function compress(file) {
  const img = await createImageBitmap(file)
  const k = Math.min(1, 1280 / Math.max(img.width, img.height))
  const c = document.createElement('canvas')
  c.width = Math.round(img.width * k); c.height = Math.round(img.height * k)
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
  return new Promise((r) => c.toBlob(r, 'image/jpeg', 0.7))
}
