import { binomLuck, estimateRate, geomLuck, hitProb, missProb, runsForChance } from './math.js'

const KEY = 'drop-tracker:v1'

export const CHARTS = [
  { id: 'cumulative', label: 'Probabilidad acumulada', modes: ['global', 'independent'] },
  { id: 'expected', label: 'Real vs. esperado', modes: ['global'] },
  { id: 'timeline', label: 'Línea de tiempo', modes: ['global'] },
  { id: 'luck', label: 'Suerte', modes: ['global', 'independent'] },
]

export const chartsFor = (mode) => CHARTS.filter((c) => c.modes.includes(mode))

export const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4)

export const newItem = (name, p, slot) => ({
  id: uid(),
  name,
  p,
  drops: [],
  startRun: 0,
  runs: 0,
  obtained: false,
  slot,
})

export const newProject = (name, charts, mode = 'global') => ({
  id: uid(),
  name,
  mode,
  runs: 0,
  charts,
  hiddenLines: [],
  items: [],
  counters: [],
  createdAt: Date.now(),
})

export const nextSlot = (items) => {
  const used = new Set(items.map((i) => i.slot))
  for (let s = 0; s < 8; s++) if (!used.has(s)) return s
  return items.length % 8
}

const int = (v, d = 0) => (Number.isFinite(Number(v)) ? Math.max(0, Math.floor(Number(v))) : d)

function normalizeProject(p) {
  if (!p || typeof p !== 'object') return null
  const items = Array.isArray(p.items) ? p.items : []
  return {
    id: String(p.id || uid()),
    name: String(p.name || 'Sin nombre'),
    mode: p.mode === 'independent' ? 'independent' : 'global',
    runs: int(p.runs),
    charts: Array.isArray(p.charts) ? p.charts.filter((c) => CHARTS.some((x) => x.id === c)) : ['cumulative'],
    hiddenLines: Array.isArray(p.hiddenLines) ? p.hiddenLines.map(String) : [],
    createdAt: Number(p.createdAt) || Date.now(),
    items: items
      .filter((i) => i && typeof i === 'object')
      .map((i, idx) => ({
        id: String(i.id || uid()),
        name: String(i.name || 'Objeto'),
        p: Number.isFinite(i.p) && i.p > 0 && i.p <= 1 ? i.p : null,
        drops: Array.isArray(i.drops) ? i.drops.map((d) => int(d)) : [],
        startRun: int(i.startRun),
        runs: int(i.runs),
        obtained: Boolean(i.obtained),
        slot: Number.isInteger(i.slot) ? i.slot % 8 : idx % 8,
      })),
    counters: (Array.isArray(p.counters) ? p.counters : [])
      .filter((c) => c && typeof c === 'object')
      .map((c) => ({ id: String(c.id || uid()), name: String(c.name || 'Contador'), count: int(c.count) })),
  }
}

export function normalize(s) {
  const projects = (Array.isArray(s?.projects) ? s.projects : []).map(normalizeProject).filter(Boolean)
  return {
    version: 1,
    theme: s?.theme === 'dark' || s?.theme === 'light' ? s.theme : null,
    activeId: projects.some((p) => p.id === s?.activeId) ? s.activeId : projects[0]?.id ?? null,
    projects,
  }
}

export function load() {
  try {
    const raw = localStorage.getItem(KEY)
    return normalize(raw ? JSON.parse(raw) : null)
  } catch {
    return normalize(null)
  }
}

export function save(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    /* almacenamiento no disponible */
  }
}

/* Estadísticas derivadas de cada objeto */
export function analyze(project) {
  const ind = project.mode === 'independent'
  const runs = project.runs
  return project.items.map((item) => {
    // Modo independiente: cada objeto tiene sus propias runs y un estado de obtenido
    const k = ind ? (item.obtained ? 1 : 0) : item.drops.length
    const n = ind ? item.runs : Math.max(0, runs - item.startRun)
    const known = item.p != null
    const est = known ? null : estimateRate(k, n)
    const eff = known ? item.p : est?.p ?? null
    const last = item.drops.reduce((a, b) => Math.max(a, b), item.startRun)
    const dry = Math.max(0, runs - last)

    let luck = null
    if (known) {
      if (!ind) luck = binomLuck(k, n, item.p)
      else if (n > 0) luck = { mid: item.obtained ? geomLuck(n, item.p) : 0.5 * missProb(item.p, n) }
    }

    return {
      id: item.id,
      name: item.name,
      slot: item.slot,
      drops: item.drops,
      obtained: item.obtained,
      known,
      p: item.p,
      est,
      eff,
      k,
      n,
      dry,
      dryProb: known && !ind ? missProb(item.p, dry) : null,
      hit: eff != null ? hitProb(eff, n) : null,
      n50: eff != null ? runsForChance(eff, 0.5) : null,
      n90: eff != null ? runsForChance(eff, 0.9) : null,
      expected: known && !ind ? n * item.p : null,
      luck,
    }
  })
}
