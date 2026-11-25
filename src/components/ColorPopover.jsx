import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

const SLOTS = [0, 1, 2, 3, 4, 5, 6, 7]

// Color real (hex) de una posición de la paleta, para precargar el selector nativo
function slotHex(slot) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(`--s${(slot % 8) + 1}`).trim()
  return /^#[0-9a-f]{6}$/i.test(v) ? v : '#2a78d6'
}

export function ColorPopover({ rect, item, onPick, onClose }) {
  const ref = useRef(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  const [pos, setPos] = useState({ top: rect.bottom + 6, left: rect.left })

  useLayoutEffect(() => {
    const el = ref.current
    const w = el.offsetWidth
    const h = el.offsetHeight
    const below = rect.bottom + 6
    setPos({
      left: Math.max(8, Math.min(rect.left, window.innerWidth - w - 8)),
      top: below + h > window.innerHeight - 8 ? Math.max(8, rect.top - h - 6) : below,
    })
  }, [rect])

  useEffect(() => {
    const down = (e) => {
      if (ref.current?.contains(e.target) || e.target.closest?.('[data-color-dot]')) return
      closeRef.current()
    }
    const key = (e) => e.key === 'Escape' && closeRef.current()
    const close = () => closeRef.current()
    document.addEventListener('pointerdown', down)
    document.addEventListener('keydown', key)
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    return () => {
      document.removeEventListener('pointerdown', down)
      document.removeEventListener('keydown', key)
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
    }
  }, [])

  const custom = item.color != null

  return createPortal(
    <div className="popover" ref={ref} style={pos} role="dialog" aria-label="Color del objeto">
      <div className="swatches">
        {SLOTS.map((s) => (
          <button
            key={s}
            type="button"
            className="swatch"
            style={{ background: `var(--s${s + 1})` }}
            aria-label={`Color ${s + 1}`}
            aria-pressed={!custom && item.slot % 8 === s}
            onClick={() => onPick({ slot: s })}
          />
        ))}
      </div>
      <label className="popover-action">
        <span
          className="swatch-mini"
          data-custom={custom}
          style={custom ? { background: item.color } : undefined}
        >
          <input
            type="color"
            value={item.color ?? slotHex(item.slot)}
            onChange={(e) => onPick({ color: e.target.value })}
            aria-label="Color personalizado"
          />
        </span>
        Personalizado
      </label>
      <button type="button" className="popover-action" onClick={() => onPick({ auto: true })}>
        <span className="swatch-mini auto" />
        Automático
      </button>
    </div>,
    document.body,
  )
}
