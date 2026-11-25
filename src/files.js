import { uid } from './store.js'
import { fontFamily } from './theme.js'

/* ---------- Almacén local (IndexedDB) para fuentes e imagen de fondo ---------- */

function open() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('drop-tracker-files', 1)
    req.onupgradeneeded = () => req.result.createObjectStore('files', { keyPath: 'id' })
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function tx(mode, run) {
  const db = await open()
  return new Promise((resolve, reject) => {
    const t = db.transaction('files', mode)
    const req = run(t.objectStore('files'))
    t.oncomplete = () => resolve(req?.result)
    t.onerror = t.onabort = () => reject(t.error)
  })
}

const fileGet = (id) => tx('readonly', (s) => s.get(id))
const fileAll = () => tx('readonly', (s) => s.getAll())
const filePut = (rec) => tx('readwrite', (s) => s.put(rec))
const fileDelete = (id) => tx('readwrite', (s) => s.delete(id))

/* ---------- Fuentes ---------- */

export const FONT_EXT = /\.(woff2|ttf|otf)$/i
const fontLabel = (name) =>
  name.replace(/^.*\//, '').replace(FONT_EXT, '').replace(/[-_]+/g, ' ').trim()

// Las que se colocan en src/assets/fonts aparecen solas (.woff2, .ttf, .otf)
const bundled = import.meta.glob('./assets/fonts/*.{woff2,ttf,otf}', {
  eager: true,
  query: '?url',
  import: 'default',
})

export const BUNDLED_FONTS = Object.entries(bundled)
  .map(([path, url]) => {
    const label = fontLabel(path)
    return { id: `bundled:${label}`, label, source: 'bundled', url }
  })
  .sort((a, b) => a.label.localeCompare(b.label))

const registered = new Set()

async function registerFont(id, src) {
  if (registered.has(id)) return
  registered.add(id)
  try {
    const face = new FontFace(fontFamily(id), typeof src === 'string' ? `url("${src}")` : src)
    await face.load()
    document.fonts.add(face)
  } catch (e) {
    registered.delete(id)
    throw e
  }
}

// Registra las fuentes de la carpeta y las cargadas por el usuario; devuelve la lista
export async function loadFonts() {
  const list = [...BUNDLED_FONTS]
  await Promise.all(BUNDLED_FONTS.map((f) => registerFont(f.id, f.url).catch(() => {})))
  const stored = (await fileAll().catch(() => [])).filter((r) => r.kind === 'font')
  for (const r of stored) {
    await registerFont(r.id, await r.blob.arrayBuffer()).catch(() => {})
    list.push({ id: r.id, label: r.name, source: 'user' })
  }
  return list
}

export async function addFont(file) {
  if (!FONT_EXT.test(file.name)) throw new Error('formato')
  const id = `user:${uid()}`
  await registerFont(id, await file.arrayBuffer()) // falla si no es una fuente válida
  const label = fontLabel(file.name)
  await filePut({ id, kind: 'font', name: label, blob: file })
  return { id, label, source: 'user' }
}

export const removeFont = (id) => fileDelete(id)

/* ---------- Imagen de fondo ---------- */

// Reduce la imagen a 2560 px como máximo y la guarda comprimida
export async function setBackground(file) {
  const bmp = await createImageBitmap(file)
  const scale = Math.min(1, 2560 / Math.max(bmp.width, bmp.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bmp.width * scale)
  canvas.height = Math.round(bmp.height * scale)
  canvas.getContext('2d').drawImage(bmp, 0, 0, canvas.width, canvas.height)
  bmp.close?.()
  const toBlob = (type, q) => new Promise((r) => canvas.toBlob(r, type, q))
  let blob = await toBlob('image/webp', 0.86)
  if (!blob || blob.type !== 'image/webp') blob = await toBlob('image/jpeg', 0.88)
  await filePut({ id: 'bg', kind: 'bg', name: file.name, blob })
  return blob
}

export const getBackground = async () => (await fileGet('bg'))?.blob ?? null
export const clearBackground = () => fileDelete('bg')
