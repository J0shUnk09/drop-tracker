import { useEffect, useState } from 'react'
import { clamp } from '../math.js'
import { Icon, IconButton, IntInput } from './ui.jsx'

const THEMES = [
  { id: null, label: 'Automático' },
  { id: 'light', label: 'Claro' },
  { id: 'dark', label: 'Oscuro' },
  { id: 'custom', label: 'Personalizado' },
]

const COLORS = [
  { key: 'accent', label: 'Acento' },
  { key: 'bg', label: 'Fondo' },
  { key: 'card', label: 'Tarjetas' },
  { key: 'text', label: 'Texto' },
  { key: 'text2', label: 'Texto secundario' },
]

function ColorRow({ label, value, onChange }) {
  return (
    <label className="color-row">
      <span>{label}</span>
      <span className="color-chip">
        {value}
        <i style={{ background: value }} />
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} aria-label={label} />
      </span>
    </label>
  )
}

function SliderRow({ label, value, min = 0, max, unit, onChange }) {
  return (
    <div className="slider-row">
      <span>{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
      />
      <span className="slider-value">
        <IntInput
          className="slider-num"
          value={value}
          ariaLabel={`${label} (valor)`}
          onCommit={(v) => onChange(clamp(v, min, max))}
        />
        {unit}
      </span>
    </div>
  )
}

function BackgroundZone({ url, onFile }) {
  const [over, setOver] = useState(false)
  return (
    <label
      className="dropzone"
      data-over={over}
      data-has={Boolean(url)}
      style={url ? { backgroundImage: `linear-gradient(rgba(0,0,0,.5), rgba(0,0,0,.5)), url(${url})` } : undefined}
      onDragOver={(e) => {
        e.preventDefault()
        setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setOver(false)
        const f = e.dataTransfer.files?.[0]
        if (f) onFile(f)
      }}
    >
      <Icon name="image" size={26} />
      <span>{url ? 'Cambiar imagen' : 'Arrastra una imagen aquí o haz clic para elegir'}</span>
      <input
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          if (e.target.files?.[0]) onFile(e.target.files[0])
          e.target.value = ''
        }}
      />
    </label>
  )
}

export function Appearance({ theme, custom, assets, onTheme, onCustom, onReset, onClose }) {
  useEffect(() => {
    const key = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', key)
    return () => document.removeEventListener('keydown', key)
  }, [onClose])

  const bundled = assets.fonts.filter((f) => f.source === 'bundled')
  const loaded = assets.fonts.filter((f) => f.source === 'user')
  const selected = assets.fonts.find((f) => f.id === custom.font)

  return (
    <aside className="drawer" aria-label="Apariencia">
      <div className="drawer-head">
        <h2>Apariencia</h2>
        <IconButton icon="x" label="Cerrar" onClick={onClose} />
      </div>

      <section className="drawer-section">
        <h3>Tema</h3>
        <div className="seg" role="group" aria-label="Tema">
          {THEMES.map((t) => (
            <button key={String(t.id)} type="button" aria-pressed={theme === t.id} onClick={() => onTheme(t.id)}>
              {t.label}
            </button>
          ))}
        </div>
      </section>

      {theme === 'custom' && (
        <>
          <section className="drawer-section">
            <h3>Colores</h3>
            {COLORS.map((c) => (
              <ColorRow key={c.key} label={c.label} value={custom[c.key]} onChange={(v) => onCustom({ [c.key]: v })} />
            ))}
            <button type="button" className="btn" onClick={onReset}>
              Restablecer
            </button>
          </section>

          <section className="drawer-section">
            <h3>Fuente</h3>
            <select
              className="select"
              aria-label="Fuente"
              value={selected ? custom.font : ''}
              onChange={(e) => onCustom({ font: e.target.value || null })}
            >
              <option value="">Predeterminada</option>
              {bundled.length > 0 && (
                <optgroup label="Carpeta">
                  {bundled.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.label}
                    </option>
                  ))}
                </optgroup>
              )}
              {loaded.length > 0 && (
                <optgroup label="Cargadas">
                  {loaded.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.label}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
            <div className="font-actions">
              <label className="btn">
                Cargar fuente
                <input
                  type="file"
                  accept=".woff2,.ttf,.otf"
                  multiple
                  hidden
                  onChange={(e) => {
                    if (e.target.files?.length) assets.addFonts([...e.target.files])
                    e.target.value = ''
                  }}
                />
              </label>
              {selected?.source === 'user' && (
                <button type="button" className="btn" onClick={() => assets.dropFont(selected.id)}>
                  Quitar
                </button>
              )}
            </div>
          </section>

          <section className="drawer-section">
            <h3>Imagen de fondo</h3>
            <BackgroundZone url={assets.bgUrl} onFile={assets.setBg} />
            <SliderRow label="Opacidad" value={custom.bgOpacity} max={100} unit="%" onChange={(v) => onCustom({ bgOpacity: v })} />
            <SliderRow label="Desenfoque" value={custom.bgBlur} max={40} unit="px" onChange={(v) => onCustom({ bgBlur: v })} />
            {assets.bgUrl && (
              <button type="button" className="btn" onClick={assets.dropBg}>
                Quitar imagen
              </button>
            )}
          </section>

          <section className="drawer-section">
            <h3>Tarjetas</h3>
            <SliderRow label="Opacidad" value={custom.cardOpacity} min={10} max={100} unit="%" onChange={(v) => onCustom({ cardOpacity: v })} />
            <SliderRow label="Desenfoque" value={custom.cardBlur} max={40} unit="px" onChange={(v) => onCustom({ cardBlur: v })} />
          </section>

          {assets.error && <p className="form-error">{assets.error}</p>}
        </>
      )}
    </aside>
  )
}
