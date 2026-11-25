import { useEffect, useMemo, useRef, useState } from 'react'
import { evalExpr, fmtInt } from './math.js'
import { analyze, chartsFor, load, newProject, normalize, save } from './store.js'
import { DEFAULT_COLORS, applyTheme } from './theme.js'
import { useAssets } from './useAssets.js'
import { CumulativeChart, ExpectedChart, LuckChart, TimelineChart } from './components/Charts.jsx'
import { CountersSection, ItemsSection } from './components/Items.jsx'
import { Appearance } from './components/Appearance.jsx'
import { ProjectDialog } from './components/ProjectDialog.jsx'
import { Confirm, Icon, IconButton, IntInput } from './components/ui.jsx'

// Imágenes
import logo from './assets/icon.png'

function RunsPanel({ runs, onChange }) {
  const [extra, setExtra] = useState('')
  const addExtra = (e) => {
    e.preventDefault()
    const n = evalExpr(extra, 0)
    if (n != null && n > 0) onChange(runs + n)
    setExtra('')
  }

  // Atajo: Espacio o + suman una run, - resta una (fuera de campos y diálogos)
  useEffect(() => {
    const onKey = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return
      if (e.target.closest?.('input, textarea, select, [contenteditable], dialog')) return
      if (document.querySelector('dialog[open]')) return
      if (e.key === ' ' && !e.target.closest?.('button, a')) {
        e.preventDefault()
        onChange(runs + 1)
      } else if (e.key === '+') {
        onChange(runs + 1)
      } else if (e.key === '-') {
        onChange(Math.max(0, runs - 1))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [runs, onChange])
  return (
    <section className="card runs">
      <div className="runs-main">
        <span className="runs-label">Runs</span>
        <IntInput className="runs-input" value={runs} ariaLabel="Runs" onCommit={onChange} />
      </div>
      <div className="runs-actions">
        <button type="button" className="btn btn-lg" disabled={runs === 0} onClick={() => onChange(Math.max(0, runs - 1))}>
          <Icon name="minus" /> 1
        </button>
        <button type="button" className="btn btn-lg btn-primary" onClick={() => onChange(runs + 1)}>
          <Icon name="plus" /> 1
        </button>
        <form className="add-n" onSubmit={addExtra}>
          <input
            inputMode="numeric"
            placeholder="N"
            value={extra}
            onChange={(e) => setExtra(e.target.value.replace(/[^\d+\-*/x×÷().,\s]/gi, ''))}
            aria-label="Runs a añadir"
          />
          <button type="submit" className="btn" disabled={!extra}>
            Añadir
          </button>
        </form>
      </div>
    </section>
  )
}

function ProjectView({ project, onChange, onEdit, onReset, onDelete, confirm }) {
  const rows = useMemo(() => analyze(project), [project])
  const independent = project.mode === 'independent'
  const available = chartsFor(project.mode).map((c) => c.id)
  const has = (id) => project.charts.includes(id) && available.includes(id)
  const toggleLine = (id) =>
    onChange((pr) => ({
      ...pr,
      hiddenLines: pr.hiddenLines.includes(id) ? pr.hiddenLines.filter((x) => x !== id) : [...pr.hiddenLines, id],
    }))

  return (
    <div className="project">
      <header className="project-head">
        <h1>{project.name}</h1>
        <div className="row-actions">
          <IconButton icon="edit" label="Editar proyecto" onClick={onEdit} />
          <IconButton icon="reset" label="Reiniciar progreso" onClick={onReset} />
          <IconButton icon="trash" label="Eliminar proyecto" danger onClick={onDelete} />
        </div>
      </header>

      {!independent && <RunsPanel runs={project.runs} onChange={(v) => onChange((pr) => ({ ...pr, runs: v }))} />}
      <ItemsSection project={project} rows={rows} onChange={onChange} confirm={confirm} />
      <CountersSection project={project} onChange={onChange} confirm={confirm} />

      {available.some(has) && (
        <section className="section">
          <div className="section-head">
            <h2>Gráficos</h2>
          </div>
          <div className="charts">
            {has('cumulative') && (
              <div className="span-2">
                <CumulativeChart
                  rows={rows}
                  runs={project.runs}
                  independent={independent}
                  hidden={project.hiddenLines}
                  onToggle={toggleLine}
                  view={project.cumView}
                  onView={(v) => onChange((pr) => ({ ...pr, cumView: v }))}
                />
              </div>
            )}
            {has('expected') && <ExpectedChart rows={rows} />}
            {has('luck') && <LuckChart rows={rows} independent={independent} />}
            {has('timeline') && (
              <div className="span-2">
                <TimelineChart rows={rows} runs={project.runs} />
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  )
}

export default function App() {
  const [state, setState] = useState(load)
  const [dialog, setDialog] = useState(null) // 'create' | 'edit'
  const [confirmState, setConfirmState] = useState(null)
  const [appearance, setAppearance] = useState(false)
  const fileRef = useRef(null)

  useEffect(() => save(state), [state])
  useEffect(() => applyTheme(state.theme, state.custom), [state.theme, state.custom])

  const project = state.projects.find((p) => p.id === state.activeId) ?? null
  const confirm = (c) => setConfirmState(c)

  const patchProject = (id, fn) =>
    setState((s) => ({ ...s, projects: s.projects.map((p) => (p.id === id ? fn(p) : p)) }))

  const createProject = ({ name, charts, mode }) => {
    const p = newProject(name, charts, mode)
    setState((s) => ({ ...s, projects: [...s.projects, p], activeId: p.id }))
  }

  const deleteProject = (id) =>
    setState((s) => {
      const projects = s.projects.filter((p) => p.id !== id)
      return { ...s, projects, activeId: projects.some((p) => p.id === s.activeId) ? s.activeId : projects[0]?.id ?? null }
    })

  const setTheme = (theme) => setState((s) => ({ ...s, theme }))
  const patchCustom = (patch) => setState((s) => ({ ...s, custom: { ...s.custom, ...patch } }))
  const assets = useAssets(state.custom, patchCustom)

  const exportData = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `drop-tracker-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const importData = async (file) => {
    if (!file) return
    try {
      const next = normalize(JSON.parse(await file.text()))
      confirm({
        title: 'Importar datos',
        text: `Se reemplazarán los datos actuales por ${next.projects.length} proyecto(s).`,
        action: 'Importar',
        danger: false,
        onConfirm: () => setState((s) => ({ ...next, theme: s.theme, custom: s.custom })),
      })
    } catch {
      confirm({ title: 'Archivo no válido', action: 'Aceptar', danger: false, onConfirm: () => {} })
    }
  }

  return (
    <div className="app">
      {state.theme === 'custom' && assets.bgUrl && (
        <div
          className="backdrop"
          aria-hidden="true"
          style={{
            backgroundImage: `url(${assets.bgUrl})`,
            opacity: state.custom.bgOpacity / 100,
            filter: `blur(${state.custom.bgBlur}px)`,
          }}
        />
      )}
      <aside className="sidebar">
        <div className="brand">
          <img className="brand-mark"src={logo} alt="Logo"/>
          Drop Tracker
        </div>

        <nav className="projects" aria-label="Proyectos">
          {state.projects.map((p) => (
            <button
              key={p.id}
              type="button"
              className="project-link"
              aria-current={p.id === state.activeId ? 'page' : undefined}
              onClick={() => setState((s) => ({ ...s, activeId: p.id }))}
            >
              <span className="project-link-name">{p.name}</span>
              <span className="project-link-runs">
                {p.mode === 'independent'
                  ? p.items.length
                    ? `${p.items.filter((i) => i.history.length > 0).length}/${p.items.length}`
                    : ''
                  : fmtInt(p.runs)}
              </span>
            </button>
          ))}
          <button type="button" className="project-new" onClick={() => setDialog('create')}>
            <Icon name="plus" /> Nuevo proyecto
          </button>
        </nav>

        <div className="sidebar-foot">
          <IconButton icon="download" label="Exportar datos" onClick={exportData} />
          <IconButton icon="upload" label="Importar datos" onClick={() => fileRef.current?.click()} />
          <IconButton icon="palette" label="Apariencia" onClick={() => setAppearance((o) => !o)} />
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              importData(e.target.files?.[0])
              e.target.value = ''
            }}
          />
        </div>
      </aside>

      <main className="main">
        {project ? (
          <ProjectView
            key={project.id}
            project={project}
            onChange={(fn) => patchProject(project.id, fn)}
            onEdit={() => setDialog('edit')}
            confirm={confirm}
            onReset={() =>
              confirm({
                title: 'Reiniciar progreso',
                text: 'Las runs, los drops y los contadores volverán a cero. Los objetos se conservan.',
                action: 'Reiniciar',
                onConfirm: () =>
                  patchProject(project.id, (pr) => ({
                    ...pr,
                    runs: 0,
                    items: pr.items.map((i) => ({ ...i, drops: [], startRun: 0, runs: 0, history: [] })),
                    counters: pr.counters.map((c) => ({ ...c, count: 0 })),
                  })),
              })
            }
            onDelete={() =>
              confirm({
                title: `Eliminar «${project.name}»`,
                text: 'Se eliminará el proyecto con todos sus datos.',
                onConfirm: () => deleteProject(project.id),
              })
            }
          />
        ) : (
          <div className="welcome">
            <h1>Drop Tracker</h1>
            <button type="button" className="btn btn-primary btn-lg" onClick={() => setDialog('create')}>
              <Icon name="plus" /> Nuevo proyecto
            </button>
          </div>
        )}
      </main>

      {appearance && (
        <Appearance
          theme={state.theme}
          custom={state.custom}
          assets={assets}
          onTheme={setTheme}
          onCustom={patchCustom}
          onReset={() => patchCustom(DEFAULT_COLORS)}
          onClose={() => setAppearance(false)}
        />
      )}

      {dialog === 'create' && (
        <ProjectDialog onSave={createProject} onClose={() => setDialog(null)} />
      )}
      {dialog === 'edit' && project && (
        <ProjectDialog
          project={project}
          onSave={(p) => patchProject(project.id, (pr) => ({ ...pr, ...p }))}
          onClose={() => setDialog(null)}
        />
      )}
      {confirmState && <Confirm {...confirmState} onClose={() => setConfirmState(null)} />}
    </div>
  )
}
