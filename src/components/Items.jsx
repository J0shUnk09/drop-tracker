import { useState } from 'react'
import { fmtInt, fmtNum, fmtOneIn, fmtPct, parseProb, probToInput } from '../math.js'
import { newItem, nextSlot, uid } from '../store.js'
import { Icon, IconButton, IntInput, Modal } from './ui.jsx'

const color = (slot) => `var(--s${(slot % 8) + 1})`

function ProbCell({ r }) {
  if (r.known) {
    return (
      <>
        <div className="strong">{fmtOneIn(r.p)}</div>
        <div className="sub">{fmtPct(r.p)}</div>
      </>
    )
  }
  if (r.est?.p != null) {
    return (
      <>
        <div className="strong">
          ≈ {fmtOneIn(r.est.p)} <span className="tag">Est.</span>
        </div>
        <div className="sub">
          {fmtOneIn(r.est.hi)} – {fmtOneIn(r.est.lo)} · confianza {r.est.confidence}
        </div>
      </>
    )
  }
  return (
    <>
      <div className="strong">
        — <span className="tag">Est.</span>
      </div>
      <div className="sub">{r.est ? `Más raro que ${fmtOneIn(r.est.hi)}` : 'Sin intentos'}</div>
    </>
  )
}

function ItemDialog({ item, row, independent, onSave, onClose }) {
  const [name, setName] = useState(item.name)
  const [prob, setProb] = useState(probToInput(item.p))
  const [start, setStart] = useState(String(item.startRun))
  const [bad, setBad] = useState(false)

  const submit = (e) => {
    e.preventDefault()
    const r = parseProb(prob)
    if (!name.trim() || !r.ok) return setBad(!r.ok)
    onSave({
      name: name.trim(),
      p: r.p,
      ...(independent ? {} : { startRun: Math.max(0, Math.floor(Number(start)) || 0) }),
    })
    onClose()
  }

  return (
    <Modal title="Editar objeto" onClose={onClose}>
      <form onSubmit={submit} className="form">
        <label className="field">
          <span>Nombre</span>
          <input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </label>
        <label className="field">
          <span>Probabilidad</span>
          <input
            value={prob}
            onChange={(e) => {
              setProb(e.target.value)
              setBad(false)
            }}
            placeholder="1/128 · 0,78% · vacío = estimar"
            aria-invalid={bad}
          />
          {item.p == null && row?.est?.p != null && (
            <button type="button" className="link" onClick={() => setProb(probToInput(row.est.p))}>
              Usar estimación ({fmtOneIn(row.est.p)})
            </button>
          )}
        </label>
        {!independent && (
          <label className="field">
            <span>Contar desde la run</span>
            <input inputMode="numeric" value={start} onChange={(e) => setStart(e.target.value)} />
          </label>
        )}
        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary">
            Guardar
          </button>
        </div>
      </form>
    </Modal>
  )
}

export function ItemsSection({ project, rows, onChange, confirm }) {
  const independent = project.mode === 'independent'
  const cols = independent ? 8 : 9
  const [name, setName] = useState('')
  const [prob, setProb] = useState('')
  const [bad, setBad] = useState(false)
  const [editing, setEditing] = useState(null)

  const add = (e) => {
    e.preventDefault()
    const n = name.trim()
    const r = parseProb(prob)
    if (!r.ok) return setBad(true)
    if (!n) return
    onChange((pr) => ({ ...pr, items: [...pr.items, newItem(n, r.p, nextSlot(pr.items))] }))
    setName('')
    setProb('')
    setBad(false)
  }

  const patchItem = (id, fn) =>
    onChange((pr) => ({ ...pr, items: pr.items.map((i) => (i.id === id ? fn(i, pr) : i)) }))

  const editingItem = project.items.find((i) => i.id === editing)

  return (
    <section className="section">
      <div className="section-head">
        <h2>Objetos</h2>
      </div>

      <form className="add-row" onSubmit={add}>
        <input
          className="grow"
          placeholder="Nombre del objeto"
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-label="Nombre del objeto"
        />
        <input
          className="prob-input"
          placeholder="1/128 · 0,78% · vacío = estimar"
          value={prob}
          onChange={(e) => {
            setProb(e.target.value)
            setBad(false)
          }}
          aria-label="Probabilidad"
          aria-invalid={bad}
        />
        <button type="submit" className="btn btn-primary" disabled={!name.trim()}>
          <Icon name="plus" /> Añadir
        </button>
      </form>

      <div className="card table-wrap">
        <table className={'table' + (independent ? ' table-compact' : '')}>
          <thead>
            <tr>
              <th>Objeto</th>
              <th>Probabilidad</th>
              {independent ? (
                <>
                  <th>Runs</th>
                  <th>Estado</th>
                </>
              ) : (
                <>
                  <th>Drops</th>
                  <th title="Runs desde el último drop">Racha</th>
                </>
              )}
              <th title="Probabilidad de haber obtenido al menos uno">Acumulada</th>
              <th title="Runs necesarias para 50 % y 90 % de probabilidad">50% · 90%</th>
              {!independent && <th title="Drops esperados con las runs actuales">Esperados</th>}
              <th title="Porcentaje de jugadores con peor suerte que tú">Suerte</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={cols} className="table-empty">
                  Sin objetos
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id}>
                <td>
                  <div className="name-cell">
                    <i className="dot" style={{ background: color(r.slot) }} />
                    <span className="strong">{r.name}</span>
                  </div>
                </td>
                <td>
                  <ProbCell r={r} />
                </td>
                {independent ? (
                  <>
                    <td>
                      <div className="stepper">
                        <IconButton
                          icon="minus"
                          label="Restar run"
                          disabled={r.obtained || r.n === 0}
                          onClick={() => patchItem(r.id, (i) => ({ ...i, runs: Math.max(0, i.runs - 1) }))}
                        />
                        <IntInput
                          className="stepper-input"
                          value={r.n}
                          disabled={r.obtained}
                          ariaLabel={`Runs de ${r.name}`}
                          onCommit={(v) => patchItem(r.id, (i) => ({ ...i, runs: v }))}
                        />
                        <IconButton
                          icon="plus"
                          label="Sumar run"
                          disabled={r.obtained}
                          onClick={() => patchItem(r.id, (i) => ({ ...i, runs: i.runs + 1 }))}
                        />
                      </div>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="status-btn"
                        aria-pressed={r.obtained}
                        title={r.obtained ? 'Reabrir' : 'Marcar como obtenido'}
                        onClick={() =>
                          patchItem(r.id, (i) =>
                            i.obtained
                              ? { ...i, obtained: false }
                              : { ...i, obtained: true, runs: Math.max(1, i.runs) },
                          )
                        }
                      >
                        <span className="status-box">
                          <Icon name="check" size={11} />
                        </span>
                        Obtenido
                      </button>
                    </td>
                  </>
                ) : (
                  <>
                    <td>
                      <div className="stepper">
                        <IconButton
                          icon="minus"
                          label="Quitar drop"
                          disabled={r.k === 0}
                          onClick={() => patchItem(r.id, (i) => ({ ...i, drops: i.drops.slice(0, -1) }))}
                        />
                        <span className="stepper-value">{fmtInt(r.k)}</span>
                        <IconButton
                          icon="plus"
                          label="Registrar drop"
                          onClick={() => patchItem(r.id, (i, pr) => ({ ...i, drops: [...i.drops, pr.runs] }))}
                        />
                      </div>
                    </td>
                    <td>
                      <div className="strong">{fmtInt(r.dry)}</div>
                      {r.known && r.n > 0 && <div className="sub">{fmtPct(r.dryProb)}</div>}
                    </td>
                  </>
                )}
                <td>
                  <div className="strong">
                    {r.hit == null ? '—' : (r.known ? '' : '≈ ') + fmtPct(r.hit)}
                  </div>
                </td>
                <td>
                  <div className="strong">
                    {r.eff == null ? '—' : `${r.known ? '' : '≈ '}${fmtInt(r.n50)} · ${fmtInt(r.n90)}`}
                  </div>
                </td>
                {!independent && (
                  <td>
                    <div className="strong">{r.known ? fmtNum(r.expected) : '—'}</div>
                  </td>
                )}
                <td>
                  <div className="strong">{r.luck ? fmtPct(r.luck.mid) : '—'}</div>
                </td>
                <td>
                  <div className="row-actions">
                    <IconButton icon="edit" label="Editar" onClick={() => setEditing(r.id)} />
                    <IconButton
                      icon="trash"
                      label="Eliminar"
                      danger
                      onClick={() =>
                        confirm({
                          title: `Eliminar «${r.name}»`,
                          text: 'Se perderán sus drops registrados.',
                          onConfirm: () =>
                            onChange((pr) => ({
                              ...pr,
                              items: pr.items.filter((i) => i.id !== r.id),
                              hiddenLines: pr.hiddenLines.filter((x) => x !== r.id),
                            })),
                        })
                      }
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editingItem && (
        <ItemDialog
          item={editingItem}
          independent={independent}
          row={rows.find((r) => r.id === editingItem.id)}
          onClose={() => setEditing(null)}
          onSave={(patch) => patchItem(editingItem.id, (i) => ({ ...i, ...patch }))}
        />
      )}
    </section>
  )
}

/* ---------- Contadores sin probabilidad ---------- */

function CounterDialog({ counter, onSave, onClose }) {
  const [name, setName] = useState(counter.name)
  const [count, setCount] = useState(String(counter.count))
  const submit = (e) => {
    e.preventDefault()
    if (!name.trim()) return
    onSave({ name: name.trim(), count: Math.max(0, Math.floor(Number(count)) || 0) })
    onClose()
  }
  return (
    <Modal title="Editar contador" onClose={onClose}>
      <form onSubmit={submit} className="form">
        <label className="field">
          <span>Nombre</span>
          <input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </label>
        <label className="field">
          <span>Valor</span>
          <input inputMode="numeric" value={count} onChange={(e) => setCount(e.target.value)} />
        </label>
        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary">
            Guardar
          </button>
        </div>
      </form>
    </Modal>
  )
}

export function CountersSection({ project, onChange, confirm }) {
  const [name, setName] = useState('')
  const [editing, setEditing] = useState(null)

  const add = (e) => {
    e.preventDefault()
    const n = name.trim()
    if (!n) return
    onChange((pr) => ({ ...pr, counters: [...pr.counters, { id: uid(), name: n, count: 0 }] }))
    setName('')
  }
  const patch = (id, fn) =>
    onChange((pr) => ({ ...pr, counters: pr.counters.map((c) => (c.id === id ? fn(c) : c)) }))
  const editingCounter = project.counters.find((c) => c.id === editing)

  return (
    <section className="section">
      <div className="section-head">
        <h2>Contadores</h2>
      </div>

      <form className="add-row" onSubmit={add}>
        <input
          className="grow"
          placeholder="Nombre del contador"
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-label="Nombre del contador"
        />
        <button type="submit" className="btn btn-primary" disabled={!name.trim()}>
          <Icon name="plus" /> Añadir
        </button>
      </form>

      {project.counters.length === 0 ? (
        <div className="card empty-card">Sin contadores</div>
      ) : (
        <div className="counters">
          {project.counters.map((c) => (
            <div className="card counter" key={c.id}>
              <div className="counter-top">
                <span className="counter-name" title={c.name}>
                  {c.name}
                </span>
                <div className="row-actions">
                  <IconButton icon="edit" label="Editar" onClick={() => setEditing(c.id)} />
                  <IconButton
                    icon="trash"
                    label="Eliminar"
                    danger
                    onClick={() =>
                      confirm({
                        title: `Eliminar «${c.name}»`,
                        onConfirm: () => onChange((pr) => ({ ...pr, counters: pr.counters.filter((x) => x.id !== c.id) })),
                      })
                    }
                  />
                </div>
              </div>
              <div className="counter-body">
                <IconButton
                  icon="minus"
                  label="Restar"
                  disabled={c.count === 0}
                  onClick={() => patch(c.id, (x) => ({ ...x, count: Math.max(0, x.count - 1) }))}
                />
                <IntInput
                  className="counter-value"
                  value={c.count}
                  ariaLabel={`Valor de ${c.name}`}
                  onCommit={(v) => patch(c.id, (x) => ({ ...x, count: v }))}
                />
                <IconButton icon="plus" label="Sumar" onClick={() => patch(c.id, (x) => ({ ...x, count: x.count + 1 }))} />
              </div>
            </div>
          ))}
        </div>
      )}

      {editingCounter && (
        <CounterDialog
          counter={editingCounter}
          onClose={() => setEditing(null)}
          onSave={(p) => patch(editingCounter.id, (x) => ({ ...x, ...p }))}
        />
      )}
    </section>
  )
}
