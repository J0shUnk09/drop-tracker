/* ---------- Probabilidad ---------- */

// (1 - p)^n, estable para p muy pequeños
export function missProb(p, n) {
  if (n <= 0) return 1
  if (p >= 1) return 0
  if (p <= 0) return 1
  return Math.exp(n * Math.log1p(-p))
}

// Probabilidad de al menos un drop en n intentos
export function hitProb(p, n) {
  if (n <= 0) return 0
  if (p >= 1) return 1
  if (p <= 0) return 0
  return -Math.expm1(n * Math.log1p(-p))
}

// Intentos necesarios para alcanzar una probabilidad q de al menos un drop
export function runsForChance(p, q) {
  if (p <= 0) return Infinity
  if (p >= 1) return 1
  return Math.ceil(Math.log1p(-q) / Math.log1p(-p))
}

const LG = [
  0.99999999999980993, 676.5203681218851, -1259.1392167224028,
  771.32342877765313, -176.61502916214059, 12.507343278686905,
  -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
]

export function lgamma(z) {
  if (z < 0.5) return Math.log(Math.PI / Math.abs(Math.sin(Math.PI * z))) - lgamma(1 - z)
  z -= 1
  let x = LG[0]
  for (let i = 1; i < 9; i++) x += LG[i] / (z + i)
  const t = z + 7.5
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x)
}

function logPmf(i, n, p) {
  return (
    lgamma(n + 1) - lgamma(i + 1) - lgamma(n - i + 1) +
    i * Math.log(p) + (n - i) * Math.log1p(-p)
  )
}

// Suerte de haber obtenido k drops en n intentos con probabilidad p.
//  mid:     percentil (mid-p) de 0 a 1; 0,5 es lo esperado
//  atLeast: probabilidad de obtener k o más drops
export function binomLuck(k, n, p) {
  if (n <= 0 || p <= 0 || p >= 1) return null
  if (k > n) return { mid: 1, atLeast: 0 }
  const mean = n * p
  const eq = Math.exp(logPmf(k, n, p))
  let lt
  let atLeast
  if (k <= mean) {
    lt = 0
    for (let i = 0; i < k; i++) lt += Math.exp(logPmf(i, n, p))
    atLeast = Math.max(0, 1 - lt)
  } else {
    let up = 0
    for (let i = k, c = 0; i <= n && c < 2e6; i++, c++) {
      const t = Math.exp(logPmf(i, n, p))
      up += t
      if (t < up * 1e-16) break
    }
    atLeast = Math.min(1, up)
    lt = Math.max(0, 1 - up)
  }
  return { mid: Math.min(1, lt + eq / 2), atLeast }
}

// Suerte al obtener un objeto exactamente en el intento n (distribución geométrica):
// proporción de jugadores que habrían necesitado más intentos (mid-p).
export function geomLuck(n, p) {
  if (n <= 0 || p <= 0) return null
  return Math.min(1, missProb(p, n) + 0.5 * p * missProb(p, n - 1))
}

// Estima la probabilidad por intento a partir de k drops en n intentos.
// Intervalo de Wilson al 95 %. Sin drops solo hay una cota superior.
export function estimateRate(k, n) {
  if (n <= 0) return null
  if (k <= 0) {
    return { p: null, lo: 0, hi: 1 - Math.pow(0.05, 1 / n), confidence: 'nula' }
  }
  const z = 1.96
  const ph = Math.min(1, k / n)
  const d = 1 + (z * z) / n
  const c = (ph + (z * z) / (2 * n)) / d
  const h = (z * Math.sqrt((ph * (1 - ph)) / n + (z * z) / (4 * n * n))) / d
  return {
    p: ph,
    lo: Math.max(0, c - h),
    hi: Math.min(1, c + h),
    confidence: k < 3 ? 'baja' : k < 10 ? 'media' : 'alta',
  }
}

/* ---------- Entrada y formato ---------- */

const toNum = (s) => {
  s = s.replace(/\s/g, '')
  if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) s = s.replace(/,/g, '')
  else s = s.replace(',', '.')
  return s === '' ? NaN : Number(s)
}

// Acepta "1/128", "1 en 128", "0,78%", "0.0078" o "128" (= 1/128).
// Vacío significa probabilidad desconocida.
export function parseProb(raw) {
  const s = String(raw ?? '').trim().toLowerCase()
  if (!s) return { ok: true, p: null }
  let p = NaN
  let m
  if ((m = s.match(/^(.+?)\s*%$/))) p = toNum(m[1]) / 100
  else if ((m = s.match(/^(.+?)\s*(?:\/|:|en|in|de)\s*(.+)$/))) p = toNum(m[1]) / toNum(m[2])
  else {
    const v = toNum(s)
    p = v > 100 ? 1 / v : v / 100
  }
  return Number.isFinite(p) && p > 0 && p <= 1 ? { ok: true, p } : { ok: false }
}

export function probToInput(p) {
  if (p == null) return ''
  const N = 1 / p
  if (Math.abs(N - Math.round(N)) < 1e-6) return `1/${Math.round(N)}`
  return `${Number((p * 100).toPrecision(6))}%`
}

const nfs = {}
const nf = (d) => (nfs[d] ??= new Intl.NumberFormat('es-CR', { maximumFractionDigits: d }))

export const fmtInt = (n) => (n == null || !Number.isFinite(n) ? '—' : nf(0).format(Math.round(n)))
export const fmtNum = (n, d = 2) => (n == null || !Number.isFinite(n) ? '—' : nf(d).format(n))

export function fmtPct(p) {
  if (p == null || !Number.isFinite(p)) return '—'
  const v = p * 100
  if (v <= 0) return '0%'
  if (v < 0.01) return '<0,01%'
  if (v > 99.99 && v < 100) return '>99,99%'
  return nf(v >= 10 ? 1 : v >= 1 ? 2 : 3).format(v) + '%'
}

export function fmtOneIn(p) {
  if (p == null || p <= 0) return '—'
  const N = 1 / p
  const frac = N < 10 && Math.abs(N - Math.round(N)) > 1e-9
  return '1/' + (frac ? nf(1).format(N) : fmtInt(N))
}

/* ---------- Ejes ---------- */

export function niceTicks(max, target = 5) {
  if (!(max > 0)) return [0, 1]
  const raw = max / target
  const pow = 10 ** Math.floor(Math.log10(raw))
  const f = raw / pow
  const step = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * pow
  const out = []
  for (let v = 0; v <= Math.ceil(max / step) * step + step * 1e-9; v += step) {
    out.push(Math.round(v / step) * step)
  }
  return out
}

export const clamp = (v, a, b) => Math.min(b, Math.max(a, v))
