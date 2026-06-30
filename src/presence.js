import { useEffect, useRef } from 'react'

export const DEFAULT_ACCENT = [143, 216, 255]

// ── color math helpers ────────────────────────────
function rgbToHsv(r, g, b) {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min
  const v = max
  const s = max === 0 ? 0 : d / max
  let h = 0
  if (d > 0) {
    if      (max === r) h = ((g - b) / d % 6 + 6) % 6
    else if (max === g) h = (b - r) / d + 2
    else                h = (r - g) / d + 4
    h *= 60
  }
  return [h, s, v]
}

function hslToRgb(h, s, l) {
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs((h / 60) % 2 - 1))
  const m = l - c / 2
  let r = 0, g = 0, b = 0
  if      (h < 60)  { r = c; g = x }
  else if (h < 120) { r = x; g = c }
  else if (h < 180) { g = c; b = x }
  else if (h < 240) { g = x; b = c }
  else if (h < 300) { r = x; b = c }
  else              { r = c; b = x }
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)]
}

// ── dominant color via hue histogram ─────────────
// Works in hue-space so red stays red, blue stays blue.
// Frequency-weighted: the color covering the most area wins.
// Outputs a pastel at fixed lightness so every hue looks equally vivid on the site.
const _colorCache = new Map()

export function extractDominantColor(url) {
  if (_colorCache.has(url)) return Promise.resolve(_colorCache.get(url))
  return new Promise(resolve => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        const S = 80
        const cv = document.createElement('canvas')
        cv.width = cv.height = S
        const ctx = cv.getContext('2d')
        ctx.drawImage(img, 0, 0, S, S)
        const { data } = ctx.getImageData(0, 0, S, S)

        // 36 hue bins × 10° each
        const BINS = 36
        const hist = new Float32Array(BINS)
        let totalWeight = 0

        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] < 128) continue
          const [h, s, v] = rgbToHsv(data[i], data[i + 1], data[i + 2])
          // Skip near-black, near-white, and grays — they have no real hue
          if (s < 0.18 || v < 0.10 || v > 0.97) continue
          // Weight by saturation × value: vivid, visible pixels vote harder
          const w = s * v
          hist[Math.floor(h / 10) % BINS] += w
          totalWeight += w
        }

        // Fewer than 3% colored pixels → grayscale image → return near-white
        if (totalWeight < S * S * 0.03) {
          const fallback = [215, 220, 245]
          _colorCache.set(url, fallback)
          resolve(fallback)
          return
        }

        // Smooth across neighbors to handle bin-edge splits (red at 0°/360°, etc.)
        const smooth = new Float32Array(BINS)
        for (let i = 0; i < BINS; i++) {
          smooth[i] = hist[(i - 1 + BINS) % BINS] * 0.2
                    + hist[i]                       * 0.6
                    + hist[(i + 1) % BINS]          * 0.2
        }

        // Peak bin = dominant hue
        let peak = 0
        for (let i = 1; i < BINS; i++) if (smooth[i] > smooth[peak]) peak = i
        const hue = (peak + 0.5) * 10

        // Output a pastel at the dominant hue — matches the site's light-accent style
        const result = hslToRgb(hue, 0.90, 0.76)
        _colorCache.set(url, result)
        resolve(result)
      } catch { resolve(null) }
    }
    img.onerror = () => resolve(null)
    img.src = url
  })
}

export function animateAccent(from, to, duration = 900) {
  const start = performance.now()
  function tick(now) {
    const raw = Math.min(1, (now - start) / duration)
    const t = raw < 0.5 ? 2 * raw * raw : -1 + (4 - 2 * raw) * raw
    const [r, g, b] = from.map((c, i) => Math.round(c + (to[i] - c) * t))
    document.documentElement.style.setProperty('--accent-r', r)
    document.documentElement.style.setProperty('--accent-g', g)
    document.documentElement.style.setProperty('--accent-b', b)
    document.documentElement.style.setProperty('--accent-rgb', `${r}, ${g}, ${b}`)
    if (raw < 1) requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}

export function useAccentColor(albumArtUrl) {
  const currentRef = useRef(DEFAULT_ACCENT)
  useEffect(() => {
    async function apply() {
      const color = albumArtUrl ? await extractDominantColor(albumArtUrl) : null
      const resolved = color ?? DEFAULT_ACCENT
      animateAccent(currentRef.current, resolved)
      currentRef.current = resolved
    }
    apply()
  }, [albumArtUrl])
}
