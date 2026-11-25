import { useEffect, useRef, useState } from 'react'
import { evalExpr } from '../math.js'

const PATHS = {
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  edit: 'M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 12h10l1-12M9 7V4h6v3',
  download: 'M12 4v11M7 11l5 5 5-5M5 20h14',
  upload: 'M12 16V5M7 9l5-5 5 5M5 20h14',
  sun: 'M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
  moon: 'M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z',
  x: 'M6 6l12 12M18 6L6 18',
  check: 'M5 12l5 5 9-10',
  reset: 'M4 12a8 8 0 1 1 2.5 5.8M4 19v-5h5',
  image: 'M4 7h3l2-3h6l2 3h3v12H4zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  palette:
    'M12 3a9 9 0 1 0 0 18c1.1 0 1.6-.9 1.2-1.7-.4-1 .3-2.3 1.5-2.3H17a4 4 0 0 0 4-4c0-5-4-10-9-10zM7.5 12.5h.01M9.5 8h.01M14.5 8h.01',
}

export function Icon({ name, size = 16 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={PATHS[name]} />
    </svg>
  )
}

export function IconButton({ icon, label, onClick, danger, disabled, size }) {
  return (
    <button
      type="button"
      className={'icon-btn' + (danger ? ' danger' : '')}
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
    >
      <Icon name={icon} size={size} />
    </button>
  )
}

export function Modal({ title, onClose, children, width = 440 }) {
  const ref = useRef(null)
  useEffect(() => {
    const d = ref.current
    if (d && !d.open) d.showModal()
  }, [])
  return (
    <dialog
      ref={ref}
      className="modal"
      style={{ maxWidth: width }}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
    >
      <div className="modal-inner">
        <div className="modal-head">
          <h2>{title}</h2>
          <IconButton icon="x" label="Cerrar" onClick={onClose} />
        </div>
        {children}
      </div>
    </dialog>
  )
}

export function Confirm({ title, text, action = 'Eliminar', danger = true, onConfirm, onClose }) {
  return (
    <Modal title={title} onClose={onClose} width={400}>
      {text && <p className="modal-text">{text}</p>}
      <div className="modal-actions">
        <button type="button" className="btn" onClick={onClose}>
          Cancelar
        </button>
        <button
          type="button"
          className={'btn ' + (danger ? 'btn-danger' : 'btn-primary')}
          onClick={() => {
            onConfirm()
            onClose()
          }}
        >
          {action}
        </button>
      </div>
    </Modal>
  )
}

// Entero editable: acepta texto parcial mientras se escribe y confirma al salir
export function IntInput({ value, onCommit, className, ariaLabel, min = 0, disabled }) {
  const [draft, setDraft] = useState(null)
  const commit = () => {
    if (draft == null) return
    const n = evalExpr(draft, value)
    if (n != null) onCommit(Math.max(min, n))
    setDraft(null)
  }
  return (
    <input
      className={className}
      inputMode="numeric"
      aria-label={ariaLabel}
      disabled={disabled}
      value={draft ?? String(value)}
      onFocus={(e) => e.target.select()}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur()
        if (e.key === 'Escape') setDraft(null)
      }}
    />
  )
}
