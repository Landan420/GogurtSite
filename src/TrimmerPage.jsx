import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Download, Pause, Play, RefreshCw, Scissors, Upload, X } from 'lucide-react'
import { useAccentColor } from './presence'

const DISCORD_ID = '419739869229875211'

const FORMATS = [
  {
    label: 'MP4', ext: 'mp4', mime: 'video/mp4',
    args: (i, o) => ['-i', i, '-c:v', 'libx264', '-preset', 'fast', '-c:a', 'aac', '-movflags', '+faststart', o],
  },
  {
    label: 'WebM', ext: 'webm', mime: 'video/webm',
    args: (i, o) => ['-i', i, '-c:v', 'libvpx-vp9', '-b:v', '1M', '-c:a', 'libopus', o],
  },
  {
    label: 'GIF', ext: 'gif', mime: 'image/gif',
    args: (i, o) => ['-i', i, '-vf', 'fps=12,scale=480:-1:flags=lanczos', '-t', '30', o],
  },
  {
    label: 'MP3', ext: 'mp3', mime: 'audio/mpeg',
    args: (i, o) => ['-i', i, '-vn', '-codec:a', 'libmp3lame', '-q:a', '2', o],
  },
  {
    label: 'WAV', ext: 'wav', mime: 'audio/wav',
    args: (i, o) => ['-i', i, '-vn', '-codec:a', 'pcm_s16le', o],
  },
]

function pad(n) { return String(n).padStart(2, '0') }
function fmtTime(s) {
  if (!isFinite(s) || s < 0) return '0:00.0'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  const tenth = Math.floor((s % 1) * 10)
  return `${m}:${pad(sec)}.${tenth}`
}
function fileExt(name) {
  return name.match(/(\.[^.]+)$/)?.[1]?.toLowerCase() ?? '.mp4'
}

export default function TrimmerPage() {
  const [mode, setMode] = useState('trim')
  const [file, setFile] = useState(null)
  const [objectUrl, setObjectUrl] = useState(null)
  const [duration, setDuration] = useState(0)
  const [inPoint, setInPoint] = useState(0)
  const [outPoint, setOutPoint] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [waveform, setWaveform] = useState(null)  // Float32Array
  const [noAudio, setNoAudio] = useState(false)
  const [dragging, setDragging] = useState(null)
  const [ffmpegLoading, setFfmpegLoading] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [convertFmt, setConvertFmt] = useState(FORMATS[0])
  const [done, setDone] = useState(false)
  const [error, setError] = useState(null)

  const videoRef    = useRef(null)
  const canvasRef   = useRef(null)
  const timelineRef = useRef(null)
  const ffmpegRef   = useRef(null)
  const rafRef      = useRef(null)

  // ── dynamic accent (same system as main site) ─────
  const [accentUrl, setAccentUrl] = useState(null)
  useAccentColor(accentUrl)
  useEffect(() => {
    fetch(`/api/discord-activity?id=${DISCORD_ID}&name_${DISCORD_ID}=landan`)
      .then(r => r.json())
      .then(d => {
        const sp = d?.activities?.[DISCORD_ID]?.spotify
        setAccentUrl(sp?.album_art_url ?? null)
      })
      .catch(() => {})
  }, [])

  // ── spacebar = play / pause ────────────────────────
  useEffect(() => {
    function onKey(e) {
      if (e.code !== 'Space') return
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      e.preventDefault()
      if (!videoRef.current) return
      videoRef.current.paused ? videoRef.current.play() : videoRef.current.pause()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // ── file handling ─────────────────────────────────
  function loadFile(f) {
    if (!f) return
    if (objectUrl) URL.revokeObjectURL(objectUrl)
    setFile(f)
    setObjectUrl(URL.createObjectURL(f))
    setInPoint(0); setOutPoint(0); setDuration(0)
    setCurrentTime(0); setWaveform(null); setNoAudio(false)
    setDone(false); setError(null)
  }

  function clearFile() {
    if (objectUrl) URL.revokeObjectURL(objectUrl)
    setFile(null); setObjectUrl(null)
    setDuration(0); setWaveform(null); setNoAudio(false)
    setDone(false); setError(null)
  }

  function onDrop(e) {
    e.preventDefault()
    loadFile(e.dataTransfer.files?.[0])
  }

  // ── waveform decode ───────────────────────────────
  useEffect(() => {
    if (!file) return
    let cancelled = false
    ;(async () => {
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext
        const actx = new AudioCtx()
        const buf = await file.arrayBuffer()
        let decoded = null
        try { decoded = await actx.decodeAudioData(buf) } catch { /* silent */ }
        actx.close()
        if (cancelled) return
        if (!decoded) { setNoAudio(true); return }
        const ch = decoded.getChannelData(0)
        const N = 1200
        const block = Math.max(1, Math.floor(ch.length / N))
        const wave = new Float32Array(N)
        for (let i = 0; i < N; i++) {
          let rms = 0
          for (let j = 0; j < block; j++) rms += ch[i * block + j] ** 2
          wave[i] = Math.sqrt(rms / block)
        }
        const max = Math.max(...wave, 1e-6)
        for (let i = 0; i < N; i++) wave[i] /= max
        if (!cancelled) setWaveform(wave)
      } catch { if (!cancelled) setNoAudio(true) }
    })()
    return () => { cancelled = true }
  }, [file])

  // ── canvas draw ───────────────────────────────────
  // draw is a plain function, not useCallback — it reads state via refs below
  const stateRef = useRef({})
  stateRef.current = { waveform, noAudio, inPoint, outPoint, currentTime, duration }

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Sync canvas buffer width to actual CSS width
    const cssW = canvas.clientWidth || (canvas.parentElement?.clientWidth ?? 0)
    if (cssW > 0 && canvas.width !== cssW) canvas.width = cssW

    const W = canvas.width
    const H = canvas.height
    if (!W || !H) return

    const { waveform: wf, noAudio: na, inPoint: iP, outPoint: oP, currentTime: cT, duration: dur } =
      stateRef.current

    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, W, H)

    const ACCENT = getComputedStyle(document.documentElement).getPropertyValue('--accent-rgb').trim() || '143, 216, 255'
    const inX    = dur > 0 ? (iP / dur) * W : 0
    const outX   = dur > 0 ? (oP / dur) * W : W
    const playX  = dur > 0 ? (cT / dur) * W : 0

    // ── waveform bars ──────────────────────────────
    if (wf) {
      const barW = W / wf.length
      for (let i = 0; i < wf.length; i++) {
        const x = i * barW
        const barH = Math.max(2, wf[i] * H * 0.82)
        const y = (H - barH) / 2
        const inside = x + barW > inX && x < outX
        ctx.fillStyle = inside
          ? `rgba(${ACCENT}, 0.85)`
          : `rgba(${ACCENT}, 0.18)`
        ctx.fillRect(x + 0.5, y, Math.max(0.8, barW - 1), barH)
      }
    } else if (na) {
      // silent video — flat line
      ctx.fillStyle = `rgba(${ACCENT}, 0.2)`
      ctx.fillRect(0, H / 2 - 1, W, 2)
    } else {
      // loading placeholder
      for (let i = 0; i < 80; i++) {
        const x = (i / 80) * W
        const h = Math.max(4, 18 + Math.sin(i * 0.55) * 14)
        ctx.fillStyle = `rgba(${ACCENT}, 0.15)`
        ctx.fillRect(x + 0.5, (H - h) / 2, W / 80 - 1, h)
      }
    }

    // dim outside the selected region
    ctx.fillStyle = 'rgba(0,0,0,0.45)'
    ctx.fillRect(0, 0, inX, H)
    ctx.fillRect(outX, 0, W - outX, H)

    // selected region tint
    ctx.fillStyle = `rgba(${ACCENT}, 0.05)`
    ctx.fillRect(inX, 0, outX - inX, H)

    // ── in handle (cyan) ───────────────────────────
    ctx.strokeStyle = '#8fd8ff'
    ctx.lineWidth = 2.5
    ctx.shadowColor = 'rgba(143, 216, 255, 0.6)'
    ctx.shadowBlur = 4
    ctx.beginPath(); ctx.moveTo(inX, 0); ctx.lineTo(inX, H); ctx.stroke()
    ctx.fillStyle = '#8fd8ff'
    ctx.shadowBlur = 0
    ctx.beginPath(); ctx.moveTo(inX, 0); ctx.lineTo(inX + 13, 0); ctx.lineTo(inX, 15); ctx.closePath(); ctx.fill()

    // ── out handle (pink) ──────────────────────────
    ctx.strokeStyle = '#f7a1ff'
    ctx.lineWidth = 2.5
    ctx.shadowColor = 'rgba(247, 161, 255, 0.6)'
    ctx.shadowBlur = 4
    ctx.beginPath(); ctx.moveTo(outX, 0); ctx.lineTo(outX, H); ctx.stroke()
    ctx.fillStyle = '#f7a1ff'
    ctx.shadowBlur = 0
    ctx.beginPath(); ctx.moveTo(outX, 0); ctx.lineTo(outX - 13, 0); ctx.lineTo(outX, 15); ctx.closePath(); ctx.fill()

    // ── playhead ───────────────────────────────────
    ctx.shadowBlur = 0
    ctx.strokeStyle = 'rgba(255,255,255,0.8)'
    ctx.lineWidth = 1.5
    ctx.setLineDash([3, 3])
    ctx.beginPath(); ctx.moveTo(playX, 0); ctx.lineTo(playX, H); ctx.stroke()
    ctx.setLineDash([])
    ctx.fillStyle = '#fff'
    ctx.beginPath(); ctx.arc(playX, H / 2, 4, 0, Math.PI * 2); ctx.fill()
  }, []) // no deps — reads from stateRef

  // draw after every state change
  useLayoutEffect(() => {
    stateRef.current = { waveform, noAudio, inPoint, outPoint, currentTime, duration }
    drawCanvas()
  }, [drawCanvas, waveform, noAudio, inPoint, outPoint, currentTime, duration])

  // redraw on window resize
  useEffect(() => {
    window.addEventListener('resize', drawCanvas)
    return () => window.removeEventListener('resize', drawCanvas)
  }, [drawCanvas])

  // 60fps playhead via RAF while playing
  useEffect(() => {
    if (!playing) { cancelAnimationFrame(rafRef.current); return }
    function tick() {
      const ct = videoRef.current?.currentTime ?? 0
      stateRef.current.currentTime = ct
      drawCanvas()
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [playing, drawCanvas])

  // ── timeline interaction ───────────────────────────
  function getTimeAtX(clientX) {
    if (!timelineRef.current || !duration) return 0
    const rect = timelineRef.current.getBoundingClientRect()
    return Math.max(0, Math.min((clientX - rect.left) / rect.width, 1)) * duration
  }

  function onTimelineDown(e) {
    const t = getTimeAtX(e.clientX)
    if (duration > 0) {
      const threshold = duration * 0.03
      if (Math.abs(t - inPoint)  < threshold) { setDragging('in');  return }
      if (Math.abs(t - outPoint) < threshold) { setDragging('out'); return }
    }
    // anything else: scrub playhead
    setDragging('playhead')
    const clamped = Math.max(0, Math.min(t, duration || 0))
    stateRef.current.currentTime = clamped
    setCurrentTime(clamped)
    drawCanvas()
    if (videoRef.current) videoRef.current.currentTime = clamped
  }

  useEffect(() => {
    if (!dragging) return
    function onMove(e) {
      if (!timelineRef.current) return
      const rect = timelineRef.current.getBoundingClientRect()
      const t = Math.max(0, Math.min((e.clientX - rect.left) / rect.width, 1)) * duration
      if (dragging === 'in') {
        setInPoint(Math.max(0, Math.min(t, outPoint - 0.05)))
      } else if (dragging === 'out') {
        setOutPoint(Math.min(duration, Math.max(t, inPoint + 0.05)))
      } else if (dragging === 'playhead') {
        const clamped = Math.max(0, Math.min(t, duration))
        stateRef.current.currentTime = clamped
        setCurrentTime(clamped)
        drawCanvas()
        if (videoRef.current) videoRef.current.currentTime = clamped
      }
    }
    function onUp() { setDragging(null) }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup',   onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup',   onUp)
    }
  }, [dragging, inPoint, outPoint, duration, drawCanvas])

  // ── ffmpeg ────────────────────────────────────────
  async function getFFmpeg() {
    if (ffmpegRef.current) return ffmpegRef.current
    const { FFmpeg }    = await import('@ffmpeg/ffmpeg')
    const { toBlobURL } = await import('@ffmpeg/util')
    const ff = new FFmpeg()
    ff.on('progress', ({ progress: p }) => setProgress(Math.round(p * 100)))
    setFfmpegLoading(true)
    const base = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm'
    await ff.load({
      coreURL: await toBlobURL(`${base}/ffmpeg-core.js`,   'text/javascript'),
      wasmURL: await toBlobURL(`${base}/ffmpeg-core.wasm`, 'application/wasm'),
    })
    setFfmpegLoading(false)
    ffmpegRef.current = ff
    return ff
  }

  function dlBlob(data, name, mime) {
    const blob = new Blob([data.buffer], { type: mime })
    const url  = URL.createObjectURL(blob)
    const a    = Object.assign(document.createElement('a'), { href: url, download: name })
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  async function doTrim() {
    if (!file || !duration) return
    setProcessing(true); setProgress(0); setDone(false); setError(null)
    try {
      const ff           = await getFFmpeg()
      const { fetchFile } = await import('@ffmpeg/util')
      const ext = fileExt(file.name)
      await ff.writeFile(`in${ext}`, await fetchFile(file))
      await ff.exec(['-i', `in${ext}`, '-ss', String(inPoint), '-to', String(outPoint), '-c', 'copy', `out${ext}`])
      const data = await ff.readFile(`out${ext}`)
      dlBlob(data, `trimmed_${file.name}`, file.type || 'video/mp4')
      setDone(true)
    } catch (e) {
      console.error(e)
      setError('trim failed — check console for details')
    }
    setProcessing(false)
  }

  async function doConvert() {
    if (!file) return
    setProcessing(true); setProgress(0); setDone(false); setError(null)
    try {
      const ff            = await getFFmpeg()
      const { fetchFile } = await import('@ffmpeg/util')
      const inExt  = fileExt(file.name)
      const outExt = `.${convertFmt.ext}`
      await ff.writeFile(`in${inExt}`, await fetchFile(file))
      await ff.exec(convertFmt.args(`in${inExt}`, `out${outExt}`))
      const data    = await ff.readFile(`out${outExt}`)
      const base    = file.name.replace(/\.[^.]+$/, '')
      dlBlob(data, `${base}.${convertFmt.ext}`, convertFmt.mime)
      setDone(true)
    } catch (e) {
      console.error(e)
      setError('convert failed — check console for details')
    }
    setProcessing(false)
  }

  const busy    = processing || ffmpegLoading
  const hasFile = Boolean(file)
  const isVideo = file?.type?.startsWith('video/')

  return (
    <main className="bio-shell trimmer-shell">
      <div className="top-rainbow-bar" aria-hidden="true" />
      <div className="page-backdrop" />
      <a href="/" className="uploads-back">← back</a>

      <div className="trimmer-page">
        <h1 className="uploads-page-title">trimmer</h1>
        <p className="uploads-page-sub">
          trim clips &amp; convert files — processed locally, nothing leaves your browser
        </p>

        <div className="trimmer-tabs">
          <button className={`trimmer-tab${mode === 'trim'    ? ' active' : ''}`} onClick={() => setMode('trim')}>
            <Scissors size={12} /> trim
          </button>
          <button className={`trimmer-tab${mode === 'convert' ? ' active' : ''}`} onClick={() => setMode('convert')}>
            <RefreshCw size={12} /> convert
          </button>
        </div>

        {!hasFile ? (
          <label
            className="trimmer-drop"
            onDragOver={e => e.preventDefault()}
            onDrop={onDrop}
          >
            <Upload size={30} />
            <span>drop a {mode === 'trim' ? 'video' : 'video or audio'} file here</span>
            <small>or click to browse</small>
            <input
              type="file"
              accept={mode === 'trim' ? 'video/*' : 'video/*,audio/*'}
              style={{ display: 'none' }}
              onChange={e => loadFile(e.target.files?.[0])}
            />
          </label>
        ) : (
          <div className="trimmer-workspace">

            <div className="trimmer-file-bar">
              <span className="trimmer-file-name">{file.name}</span>
              <button className="trimmer-clear-btn" onClick={clearFile}><X size={14} /></button>
            </div>

            {isVideo && (
              <>
                <video
                  ref={videoRef}
                  src={objectUrl}
                  className="trimmer-video"
                  onLoadedMetadata={e => {
                    setDuration(e.target.duration)
                    setOutPoint(e.target.duration)
                  }}
                  onTimeUpdate={e => setCurrentTime(e.target.currentTime)}
                  onPlay={() => setPlaying(true)}
                  onPause={() => setPlaying(false)}
                  playsInline
                />
                {duration > 0 && (
                  <div className="trimmer-controls">
                    <button
                      className="trimmer-play-btn"
                      onClick={() => playing ? videoRef.current?.pause() : videoRef.current?.play()}
                    >
                      {playing ? <Pause size={15} /> : <Play size={15} />}
                    </button>
                    <span className="trimmer-timecode">{fmtTime(currentTime)}</span>
                    <span className="trimmer-timecode-sep">/</span>
                    <span className="trimmer-timecode">{fmtTime(duration)}</span>
                  </div>
                )}
              </>
            )}

            {mode === 'trim' && (
              <div className="trimmer-timeline-wrap">
                <div
                  ref={timelineRef}
                  className="trimmer-timeline"
                  onMouseDown={onTimelineDown}
                  style={{ cursor: dragging === 'playhead' ? 'grabbing' : dragging ? 'ew-resize' : 'pointer' }}
                >
                  <canvas ref={canvasRef} className="trimmer-waveform" height={90} />
                  {noAudio && (
                    <span className="trimmer-no-audio">no audio track detected</span>
                  )}
                </div>

                <div className="trimmer-points">
                  <span className="tp-in">▶ in &nbsp;{fmtTime(inPoint)}</span>
                  <span className="tp-dur">⟷ {fmtTime(Math.max(0, outPoint - inPoint))}</span>
                  <span className="tp-out">out {fmtTime(outPoint)} ■</span>
                </div>
              </div>
            )}

            {mode === 'convert' && (
              <div className="trimmer-formats">
                <p className="trimmer-format-label">output format</p>
                <div className="trimmer-format-row">
                  {FORMATS.map(f => (
                    <button
                      key={f.ext}
                      className={`trimmer-fmt-btn${convertFmt.ext === f.ext ? ' active' : ''}`}
                      onClick={() => setConvertFmt(f)}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
                {convertFmt.ext === 'gif' && (
                  <p className="trimmer-format-note">GIF is capped at 30s · 480px wide · 12fps</p>
                )}
              </div>
            )}

            {busy && (
              <div className="trimmer-progress-wrap">
                <div className="trimmer-progress-track">
                  <div
                    className="trimmer-progress-fill"
                    style={{ width: ffmpegLoading ? '45%' : `${progress}%` }}
                  />
                </div>
                <span className="trimmer-progress-label">
                  {ffmpegLoading ? 'loading engine…' : `${progress}%`}
                </span>
              </div>
            )}

            {error && <p className="trimmer-error">{error}</p>}

            <div className="trimmer-actions">
              {mode === 'trim' ? (
                <button className="trimmer-btn" onClick={doTrim} disabled={busy || !duration}>
                  <Scissors size={13} />
                  {busy ? (ffmpegLoading ? 'loading…' : 'trimming…') : 'trim & download'}
                </button>
              ) : (
                <button className="trimmer-btn" onClick={doConvert} disabled={busy}>
                  <Download size={13} />
                  {busy ? (ffmpegLoading ? 'loading…' : 'converting…') : `convert to .${convertFmt.ext}`}
                </button>
              )}
              {done && !busy && <span className="trimmer-done">✓ saved</span>}
            </div>

          </div>
        )}
      </div>

      <span className="dev-tag">made by landan</span>
    </main>
  )
}
