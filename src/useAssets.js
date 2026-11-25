import { useEffect, useRef, useState } from 'react'
import { addFont, clearBackground, getBackground, loadFonts, removeFont, setBackground } from './files.js'

// Fuentes e imagen de fondo del tema personalizado
export function useAssets(custom, patchCustom) {
  const [fonts, setFonts] = useState([])
  const [bgUrl, setBgUrl] = useState(null)
  const [error, setError] = useState('')
  const urlRef = useRef(null)

  const showBg = (blob) => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current)
    urlRef.current = blob ? URL.createObjectURL(blob) : null
    setBgUrl(urlRef.current)
  }

  useEffect(() => {
    loadFonts().then(setFonts).catch(() => {})
    getBackground().then((b) => b && showBg(b)).catch(() => {})
  }, [])

  const addFonts = async (files) => {
    setError('')
    let last = null
    for (const f of files) {
      try {
        const font = await addFont(f)
        setFonts((l) => [...l, font])
        last = font
      } catch {
        setError('No se pudo cargar la fuente (usa .woff2, .ttf u .otf)')
      }
    }
    if (last) patchCustom({ font: last.id })
  }

  const dropFont = async (id) => {
    await removeFont(id)
    setFonts((l) => l.filter((f) => f.id !== id))
    if (custom.font === id) patchCustom({ font: null })
  }

  const setBg = async (file) => {
    setError('')
    try {
      showBg(await setBackground(file))
      // la primera vez, las tarjetas pasan a ser translúcidas para que se note el fondo
      patchCustom({ bgImage: true, ...(custom.cardOpacity === 100 ? { cardOpacity: 80, cardBlur: 12 } : {}) })
    } catch {
      setError('No se pudo leer la imagen')
    }
  }

  const dropBg = async () => {
    await clearBackground()
    showBg(null)
    patchCustom({ bgImage: false })
  }

  return { fonts, bgUrl, error, addFonts, dropFont, setBg, dropBg }
}
