// Tema personalizado: lo que el usuario elige. El resto de tonos se deriva en CSS.
const HEX = /^#[0-9a-f]{6}$/i
const num = (v, min, max, d) => {
  const n = Number(v)
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : d
}

export const DEFAULT_COLORS = {
  accent: '#2a78d6',
  bg: '#0d0d0d',
  card: '#1a1a19',
  text: '#f0efec',
  text2: '#b4b2a8',
}

export const DEFAULT_CUSTOM = {
  ...DEFAULT_COLORS,
  font: null, // "bundled:Nombre" | "user:id" | null (predeterminada)
  bgImage: false, // la imagen en sí vive en IndexedDB
  bgOpacity: 40,
  bgBlur: 0,
  cardOpacity: 100,
  cardBlur: 0,
}

export function normalizeCustom(c) {
  const out = { ...DEFAULT_CUSTOM }
  for (const k of Object.keys(DEFAULT_COLORS)) if (HEX.test(c?.[k])) out[k] = c[k].toLowerCase()
  out.font = typeof c?.font === 'string' && /^(bundled|user):/.test(c.font) ? c.font : null
  out.bgImage = Boolean(c?.bgImage)
  out.bgOpacity = num(c?.bgOpacity, 0, 100, DEFAULT_CUSTOM.bgOpacity)
  out.bgBlur = num(c?.bgBlur, 0, 40, DEFAULT_CUSTOM.bgBlur)
  out.cardOpacity = num(c?.cardOpacity, 10, 100, DEFAULT_CUSTOM.cardOpacity)
  out.cardBlur = num(c?.cardBlur, 0, 40, DEFAULT_CUSTOM.cardBlur)
  return out
}

export function luminance(hex) {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

// Texto legible sobre un color (blanco o casi negro)
export const onColor = (hex) => (luminance(hex) > 0.179 ? '#0b0b0b' : '#ffffff')

// Nombre de familia CSS estable para cada fuente
export const fontFamily = (id) => 'dt_' + id.replace(/[^a-zA-Z0-9]+/g, '_')

const VARS = { '--bg': 'bg', '--surface': 'card', '--ink': 'text', '--ink-2': 'text2', '--accent': 'accent' }
const EXTRA = ['--on-accent', '--card-alpha', '--card-blur', '--font']

export function applyTheme(theme, custom) {
  const root = document.documentElement
  if (theme === 'custom') {
    root.dataset.theme = 'custom'
    root.dataset.tone = luminance(custom.bg) < 0.18 ? 'dark' : 'light'
    for (const [v, k] of Object.entries(VARS)) root.style.setProperty(v, custom[k])
    root.style.setProperty('--on-accent', onColor(custom.accent))
    root.style.setProperty('--card-alpha', `${custom.cardOpacity}%`)
    root.style.setProperty('--card-blur', `${custom.cardBlur}px`)
    if (custom.font) {
      root.style.setProperty('--font', `"${fontFamily(custom.font)}", system-ui, -apple-system, 'Segoe UI', sans-serif`)
    } else root.style.removeProperty('--font')
  } else {
    if (theme) root.dataset.theme = theme
    else delete root.dataset.theme
    delete root.dataset.tone
    for (const v of [...Object.keys(VARS), ...EXTRA]) root.style.removeProperty(v)
  }
}
