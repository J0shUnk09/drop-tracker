import { useState } from 'react'
import { CHARTS } from '../store.js'
import { Icon, Modal } from './ui.jsx'

export function ProjectDialog({ project, onSave, onClose }) {
  const [name, setName] = useState(project?.name ?? '')
  const [charts, setCharts] = useState(project?.charts ?? ['cumulative', 'expected'])

  const toggle = (id) => setCharts((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]))
  const submit = (e) => {
    e.preventDefault()
    if (!name.trim()) return
    // conserva el orden canónico de los gráficos
    onSave({ name: name.trim(), charts: CHARTS.map((c) => c.id).filter((id) => charts.includes(id)) })
    onClose()
  }

  return (
    <Modal title={project ? 'Editar proyecto' : 'Nuevo proyecto'} onClose={onClose}>
      <form onSubmit={submit} className="form">
        <label className="field">
          <span>Nombre</span>
          <input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </label>
        <div className="field">
          <span>Gráficos</span>
          <div className="checks">
            {CHARTS.map((c) => (
              <label key={c.id} className="check">
                <input type="checkbox" checked={charts.includes(c.id)} onChange={() => toggle(c.id)} />
                <span className="check-box">
                  <Icon name="check" size={12} />
                </span>
                {c.label}
              </label>
            ))}
          </div>
        </div>
        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary" disabled={!name.trim()}>
            {project ? 'Guardar' : 'Crear'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
