import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import { clamp, fmtInt, fmtNum, fmtPct, hitProb, niceTicks } from '../math.js'

const color = (slot) => (typeof slot === 'string' ? slot : `var(--s${(slot % 8) + 1})`)

/* Caja de gráfico: mide el ancho y gestiona el tooltip */
function useBox() {
  const ref = useRef(null)
  const [w, setW] = useState(0)
  const [tip, setTip] = useState(null)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setW(Math.floor(e.contentRect.width)))
    ro.observe(el)
    setW(Math.floor(el.getBoundingClientRect().width))
    return () => ro.disconnect()
  }, [])

  const show = useCallback((e, content, y) => {
    const r = ref.current.getBoundingClientRect()
    const x = e.clientX - r.left
    setTip({ x, y: y ?? e.clientY - r.top, flip: x > r.width * 0.6, content })
  }, [])
  const hide = useCallback(() => setTip(null), [])

  const node = tip ? (
    <div className="tip" data-flip={tip.flip} style={{ left: tip.x, top: tip.y }}>
      {tip.content}
    </div>
  ) : null

  return { ref, w, show, hide, node }
}

export function ChartCard({ title, legend, children }) {
  return (
    <section className="card chart">
      <header className="chart-head">
        <h3>{title}</h3>
        {legend}
      </header>
      {children}
    </section>
  )
}

const Empty = ({ children = 'Sin datos' }) => <div className="chart-empty">{children}</div>

/* ---------- Probabilidad acumulada (líneas) ---------- */

export function CumulativeChart({ rows, runs, independent, hidden, onToggle, view, onView }) {
  const box = useBox()
  const [hover, setHover] = useState(null)
  const series = rows.filter((r) => r.eff != null)
  const shown = series.filter((r) => !hidden.includes(r.id))
  const streak = !independent && view === 'streak'

  const toggle = independent ? null : (
    <div className="seg seg-sm" role="group" aria-label="Vista">
      <button type="button" aria-pressed={!streak} onClick={() => onView('total')}>
        Desde el inicio
      </button>
      <button type="button" aria-pressed={streak} onClick={() => onView('streak')}>
        Desde el último drop
      </button>
    </div>
  )

  const legend =
    series.length > 1 ? (
      <div className="legend">
        {series.map((r) => (
          <button
            key={r.id}
            type="button"
            className="legend-item"
            aria-pressed={!hidden.includes(r.id)}
            onClick={() => onToggle(r.id)}
          >
            <i style={{ background: color(r.slot) }} />
            {r.name}
          </button>
        ))}
      </div>
    ) : null

  const h = 280
  const m = { t: 14, r: 18, b: 30, l: 44 }
  const w = box.w || 600
  const iw = Math.max(10, w - m.l - m.r)
  const ih = h - m.t - m.b

  const n90s = shown.map((r) => r.n90).filter(Number.isFinite)
  const reach = independent
    ? Math.max(0, ...shown.map((r) => r.n))
    : streak
      ? Math.max(0, ...shown.map((r) => r.dry))
      : runs
  const target = Math.max(reach * 1.3, n90s.length ? Math.min(...n90s) : 0, 10)
  const xt = niceTicks(target, 5)
  const xmax = xt[xt.length - 1]
  const X = (v) => m.l + (v / xmax) * iw
  const Y = (v) => m.t + (1 - v) * ih

  const path = (r) => {
    const N = 120
    let d = ''
    for (let i = 0; i <= N; i++) {
      const x = (xmax * i) / N
      d += (i ? 'L' : 'M') + X(x).toFixed(1) + ' ' + Y(hitProb(r.eff, x)).toFixed(1)
    }
    return d
  }

  const onMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const v = Math.round(clamp((e.clientX - rect.left) / rect.width, 0, 1) * xmax)
    setHover(v)
    box.show(
      e,
      <>
        <div className="tip-title">{streak ? 'Racha' : 'Run'} {fmtInt(v)}</div>
        {shown.map((r) => (
          <div className="tip-row" key={r.id}>
            <i style={{ background: color(r.slot) }} />
            <span>{r.name}</span>
            <b>{fmtPct(hitProb(r.eff, v))}</b>
          </div>
        ))}
      </>,
      m.t + 6,
    )
  }

  return (
    <ChartCard
      title="Probabilidad acumulada"
      legend={
      <div className="chart-tools">
      {toggle}
      {legend}
      </div>
      }
    >
      <div className="chart-body" ref={box.ref}>
        {!series.length && <Empty />}
        <svg
          width={w}
          height={h}
          style={series.length ? undefined : { display: 'none' }}
          role="img"
          aria-label="Probabilidad acumulada de obtener al menos un drop"
        >
          {[0, 0.25, 0.5, 0.75, 1].map((v) => (
            <g key={v}>
              <line className="grid" x1={m.l} x2={m.l + iw} y1={Y(v)} y2={Y(v)} />
              <text className="axis-label" x={m.l - 8} y={Y(v)} textAnchor="end" dominantBaseline="middle">
                {v * 100}%
              </text>
            </g>
          ))}
          <line className="baseline" x1={m.l} x2={m.l + iw} y1={Y(0)} y2={Y(0)} />
          {xt.map((v) => (
            <text key={v} className="axis-label" x={X(v)} y={h - 8} textAnchor="middle">
              {fmtInt(v)}
            </text>
          ))}
          {!independent && !streak && runs > 0 && runs <= xmax && (
            <line className="now-line" x1={X(runs)} x2={X(runs)} y1={m.t} y2={Y(0)} />
          )}
          {shown.map((r) => (
            <path
              key={r.id}
              d={path(r)}
              fill="none"
              stroke={color(r.slot)}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={r.known ? undefined : '6 4'}
            />
          ))}
          {hover != null && <line className="cross" x1={X(hover)} x2={X(hover)} y1={m.t} y2={Y(0)} />}
          {shown.map((r) => {
            const at = hover ?? (independent ? r.n : streak ? r.dry : runs)
            if (at > xmax) return null
            return (
              <circle
                key={r.id}
                cx={X(at)}
                cy={Y(hitProb(r.eff, at))}
                r="4.5"
                fill={color(r.slot)}
                className="dot-ring"
              />
            )
          })}
          <rect
            x={m.l}
            y={m.t}
            width={iw}
            height={ih}
            fill="transparent"
            onPointerMove={onMove}
            onPointerLeave={() => {
              setHover(null)
              box.hide()
            }}
          />
        </svg>
        {box.node}
      </div>
    </ChartCard>
  )
}

/* ---------- Real vs. esperado (barras) ---------- */

export function ExpectedChart({ rows }) {
  const box = useBox()
  const data = rows.filter((r) => r.known)
  const max = Math.max(1, ...data.map((r) => Math.max(r.k, r.expected ?? 0)))

  const legend = (
    <div className="legend static">
      <span className="legend-item">
        <i className="sw-fill" /> Real
      </span>
      <span className="legend-item">
        <i className="sw-line" /> Esperado
      </span>
    </div>
  )

  return (
    <ChartCard title="Real vs. esperado" legend={legend}>
      {!data.length ? (
        <Empty />
      ) : (
        <div className="hbars" ref={box.ref} onPointerLeave={box.hide}>
          {data.map((r) => {
            const real = (r.k / max) * 100
            const exp = ((r.expected ?? 0) / max) * 100
            return (
              <div
                className="hbar-row"
                key={r.id}
                onPointerMove={(e) =>
                  box.show(
                    e,
                    <>
                      <div className="tip-title">{r.name}</div>
                      <div className="tip-row">
                        <span>Real</span>
                        <b>{fmtInt(r.k)}</b>
                      </div>
                      <div className="tip-row">
                        <span>Esperado</span>
                        <b>{fmtNum(r.expected)}</b>
                      </div>
                    </>,
                  )
                }
              >
                <div className="hbar-label" title={r.name}>
                  <i style={{ background: color(r.slot) }} />
                  <span>{r.name}</span>
                </div>
                <div className="hbar-track">
                  <div className="hbar-line">
                    <div
                      className="bar bar-fill"
                      style={{ width: `max(${real}%, ${r.k ? 3 : 0}px)`, background: color(r.slot) }}
                    />
                    <span className="bar-value">{fmtInt(r.k)}</span>
                  </div>
                  <div className="hbar-line">
                    <div
                      className="bar bar-outline"
                      style={{ width: `max(${exp}%, 3px)`, borderColor: color(r.slot) }}
                    />
                    <span className="bar-value">{fmtNum(r.expected)}</span>
                  </div>
                </div>
              </div>
            )
          })}
          {box.node}
        </div>
      )}
    </ChartCard>
  )
}

/* ---------- Línea de tiempo de drops ---------- */

// Agrupa los drops que cayeron en la misma run: [[run, cantidad], ...]
const groupDrops = (drops) => {
  const m = new Map()
  for (const d of drops) m.set(d, (m.get(d) ?? 0) + 1)
  return [...m]
}

export function TimelineChart({ rows, runs }) {
  const box = useBox()
  const xmax = Math.max(runs, 1)
  const ticks = niceTicks(xmax, 5).filter((t) => t <= xmax)
  const pos = (v) => `calc(8px + (100% - 16px) * ${v / xmax})`

  return (
    <ChartCard title="Línea de tiempo">
      {!rows.length ? (
        <Empty />
      ) : (
        <div className="strip" ref={box.ref} onPointerLeave={box.hide}>
          <div className="strip-labels">
            {rows.map((r) => (
              <div className="strip-label" key={r.id} title={r.name}>
                <i style={{ background: color(r.slot) }} />
                <span>{r.name}</span>
              </div>
            ))}
            <div className="strip-axis-spacer" />
          </div>
          <div className="strip-plot">
            <div className="strip-grid">
              {ticks.map((t) => (
                <span key={t} className="strip-gridline" style={{ left: pos(t) }} />
              ))}
            </div>
            {rows.map((r) => (
              <div className="strip-row" key={r.id}>
                <span className="strip-base" />
                {groupDrops(r.drops).map(([d, count]) => (
                  <button
                    type="button"
                    key={d}
                    className="strip-dot"
                    data-multi={count > 1}
                    style={{ left: pos(Math.min(d, xmax)), background: color(r.slot) }}
                    aria-label={`${r.name}, run ${d}`}
                    onPointerMove={(e) =>
                      box.show(
                        e,
                        <>
                          <div className="tip-title">{r.name}</div>
                          <div className="tip-row">
                            <span>Run</span>
                            <b>{fmtInt(d)}</b>
                          </div>
                          {count > 1 && (
                            <div className="tip-row">
                              <span>Drops</span>
                              <b>{count}</b>
                            </div>
                          )}
                        </>,
                      )
                    }
                  >
                    {count > 1 ? count : null}
                  </button>
                ))}
              </div>
            ))}
            <div className="strip-axis">
              {ticks.map((t) => (
                <span key={t} style={{ left: pos(t) }}>
                  {fmtInt(t)}
                </span>
              ))}
            </div>
          </div>
          {box.node}
        </div>
      )}
    </ChartCard>
  )
}

/* ---------- Suerte (percentil) ---------- */

export function LuckChart({ rows, independent }) {
  const box = useBox()
  const data = rows.filter((r) => r.luck)

  return (
    <ChartCard title="Suerte">
      {!data.length ? (
        <Empty />
      ) : (
        <div className="luck" ref={box.ref} onPointerLeave={box.hide}>
          {data.map((r) => (
            <div
              className="hbar-row"
              key={r.id}
              onPointerMove={(e) =>
                box.show(
                  e,
                  <>
                    <div className="tip-title">{r.name}</div>
                    <div className="tip-row">
                      <span>Más suerte que</span>
                      <b>{fmtPct(r.luck.mid)}</b>
                    </div>
                    {independent ? (
                      <>
                        <div className="tip-row">
                          <span>Obtenido</span>
                          <b>{fmtInt(r.k)}×</b>
                        </div>
                        <div className="tip-row">
                          <span>Runs totales</span>
                          <b>{fmtInt(r.total)}</b>
                        </div>
                      </>
                    ) : (
                      <div className="tip-row">
                        <span>Prob. de {fmtInt(r.k)} o más</span>
                        <b>{fmtPct(r.luck.atLeast)}</b>
                      </div>
                    )}
                  </>,
                )
              }
            >
              <div className="hbar-label" title={r.name}>
                <i style={{ background: color(r.slot) }} />
                <span>{r.name}</span>
              </div>
              <div className="hbar-track luck-track">
                <span className="luck-mid" />
                <div className="hbar-line">
                  <div
                    className="bar bar-fill"
                    style={{ width: `max(${r.luck.mid * 100}%, 3px)`, background: color(r.slot) }}
                  />
                  <span className="bar-value">{fmtPct(r.luck.mid)}</span>
                </div>
              </div>
            </div>
          ))}
          <div className="luck-axis">
            <span>0%</span>
            <span>50%</span>
            <span>100%</span>
          </div>
          {box.node}
        </div>
      )}
    </ChartCard>
  )
}
