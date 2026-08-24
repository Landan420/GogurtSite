export const R2_EXPIRY_MS = 14 * 24 * 60 * 60 * 1000

export function mimeType(ext) {
  const map = {
    lua: 'text/plain', txt: 'text/plain', md: 'text/plain',
    json: 'application/json', js: 'text/javascript', ts: 'text/plain',
    css: 'text/css', html: 'text/html', xml: 'text/xml',
    png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
    gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml',
    mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg',
    flac: 'audio/flac', m4a: 'audio/mp4',
    mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime',
    mkv: 'video/x-matroska', avi: 'video/x-msvideo',
    pdf: 'application/pdf', zip: 'application/zip', '7z': 'application/x-7z-compressed',
    rar: 'application/vnd.rar',
  }
  return map[ext] || 'application/octet-stream'
}

export function previewKind(ext) {
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) return 'image'
  if (['mp4', 'webm', 'mov'].includes(ext)) return 'video'
  if (['mp3', 'wav', 'ogg', 'flac', 'm4a'].includes(ext)) return 'audio'
  if (['lua', 'txt', 'md', 'json', 'js', 'ts', 'css', 'html', 'xml', 'yaml', 'yml', 'sh', 'py', 'rb', 'go', 'rs', 'c', 'cpp', 'h', 'java'].includes(ext)) return 'text'
  return 'file'
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function formatBytes(n) {
  if (n < 1024) return `${n}B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)}KB`
  return `${(n / (1024 * 1024)).toFixed(1)}MB`
}

export const CORS = { 'access-control-allow-origin': '*' }

export async function findRowByName(db, name) {
  return db.prepare(
    'SELECT id, name, ext, data, size, created_at FROM uploads WHERE name = ? ORDER BY created_at DESC LIMIT 1'
  ).bind(name).first()
}

// Serve the file bytes (R2-backed or legacy D1 data URL), with range + download support.
export async function serveRaw({ row, env, request, download = false }) {
  const ct = mimeType(row.ext)
  const isText = ct.startsWith('text/') || ct === 'application/json'
  const contentType = isText ? ct + '; charset=utf-8' : ct
  const disposition = download
    ? { 'content-disposition': `attachment; filename="${row.name.replace(/"/g, '')}"` }
    : {}

  if (row.data.startsWith('r2:')) {
    const bucket = env.UPLOADS_R2
    if (!bucket) return new Response('Not found', { status: 404 })
    const r2Key = row.data.slice(3)
    const rangeHeader = request.headers.get('range')
    const opts = {}
    let rangeStart = null
    let rangeEnd = null
    if (rangeHeader) {
      const m = rangeHeader.match(/bytes=(\d*)-(\d*)/)
      if (m && (m[1] || m[2])) {
        if (m[1]) {
          rangeStart = parseInt(m[1], 10)
          if (m[2]) rangeEnd = parseInt(m[2], 10)
          opts.range = rangeEnd != null
            ? { offset: rangeStart, length: rangeEnd - rangeStart + 1 }
            : { offset: rangeStart }
        } else {
          opts.range = { suffix: parseInt(m[2], 10) }
        }
      }
    }
    const obj = await bucket.get(r2Key, opts)
    if (!obj) return new Response('Not found', { status: 404 })

    const headers = {
      ...CORS,
      ...disposition,
      'content-type': contentType,
      'accept-ranges': 'bytes',
      'cache-control': 'public, max-age=31536000, immutable',
      etag: obj.httpEtag,
    }
    if (opts.range) {
      const total = obj.size
      let start, end
      if (opts.range.suffix != null) {
        start = total - opts.range.suffix
        end = total - 1
      } else {
        start = opts.range.offset
        end = rangeEnd != null ? Math.min(rangeEnd, total - 1) : total - 1
      }
      headers['content-range'] = `bytes ${start}-${end}/${total}`
      headers['content-length'] = String(end - start + 1)
      return new Response(obj.body, { status: 206, headers })
    }
    headers['content-length'] = String(obj.size)
    return new Response(obj.body, { headers })
  }

  // Legacy D1 data-URL upload
  const comma = row.data.indexOf(',')
  const payload = comma === -1 ? row.data : row.data.slice(comma + 1)
  const isBase64 = comma !== -1 && row.data.slice(0, comma).includes('base64')
  let body
  if (isBase64) {
    const binary = atob(payload)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    body = bytes
  } else {
    body = decodeURIComponent(payload)
  }
  return new Response(body, {
    headers: {
      ...CORS,
      ...disposition,
      'content-type': contentType,
      'cache-control': 'no-store',
    },
  })
}

export function viewerPage({ row, origin }) {
  const name = esc(row.name)
  const kind = previewKind(row.ext)
  const encoded = encodeURIComponent(row.name)
  const rawUrl = `/raw/${encoded}`
  const dlUrl = `${rawUrl}?dl=1`
  const isR2 = row.data.startsWith('r2:')
  const expiresAt = isR2 ? row.created_at + R2_EXPIRY_MS : 0
  const sizeText = formatBytes(row.size || 0)

  let preview = ''
  if (kind === 'image') preview = `<img class="pv" src="${rawUrl}" alt="${name}">`
  else if (kind === 'video') preview = `<video class="pv" controls preload="metadata" src="${rawUrl}"></video>`
  else if (kind === 'audio') preview = `<audio class="pv pv-audio" controls src="${rawUrl}"></audio>`
  else if (kind === 'text') preview = `<pre class="pv pv-code"><code id="code">loading…</code></pre>`
  else preview = `<div class="pv pv-file">📁<span>no preview for .${esc(row.ext) || 'file'}</span></div>`

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${name} · gogurt</title>
<link rel="icon" href="/favicon.gif">
<meta name="theme-color" content="#8fd8ff">
<style>
:root{--bg:#050608;--surface:rgba(13,15,20,.78);--border:rgba(255,255,255,.11);--text:#eef3fb;--text-soft:#9aa6b8;--text-dim:#4d5668;--accent-rgb:143,216,255;--mono:'IBM Plex Mono',Consolas,monospace;--sans:'Inter','Segoe UI',sans-serif}
*{box-sizing:border-box}
html{color-scheme:dark}
body{margin:0;min-height:100vh;font:15px/1.55 var(--sans);color:var(--text);background:#050608;display:flex;align-items:center;justify-content:center;padding:48px 16px}
.backdrop{position:fixed;inset:0;z-index:0;background:radial-gradient(ellipse at 50% 62%,rgba(var(--accent-rgb),.28),transparent 55%),radial-gradient(circle at 10% 88%,rgba(var(--accent-rgb),.14),transparent 36%),radial-gradient(circle at 90% 10%,rgba(var(--accent-rgb),.10),transparent 28%),#050608}
.backdrop::before{content:'';position:absolute;inset:0;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='0.045'/%3E%3C/svg%3E");background-size:300px 300px;pointer-events:none}
.backdrop::after{content:'';position:absolute;inset:0;background-image:linear-gradient(rgba(var(--accent-rgb),.035) 1px,transparent 1px),linear-gradient(90deg,rgba(var(--accent-rgb),.035) 1px,transparent 1px);background-size:56px 56px;-webkit-mask-image:radial-gradient(ellipse at center,black,transparent 74%);mask-image:radial-gradient(ellipse at center,black,transparent 74%);pointer-events:none}
.rainbow{position:fixed;top:0;left:0;z-index:50;width:100%;height:2px;overflow:hidden;pointer-events:none;box-shadow:0 0 18px rgba(var(--accent-rgb),.55)}
.rainbow::before{content:'';position:absolute;inset:0 auto 0 0;width:200%;background:repeating-linear-gradient(90deg,#8fd8ff 0%,#f7a1ff 25%,#ffd28f 50%,#a1ffc4 75%,#8fd8ff 100%);animation:slide 9s linear infinite}
@keyframes slide{to{transform:translateX(-50%)}}
.wrap{position:relative;z-index:1;width:100%;max-width:720px}
.back{display:inline-block;margin:0 0 14px 2px;color:var(--text-soft);text-decoration:none;font-family:var(--mono);font-size:12px;letter-spacing:.06em;transition:color .18s}
.back:hover{color:rgb(var(--accent-rgb))}
.card{border:1px solid var(--border);border-radius:10px;background:var(--surface);backdrop-filter:blur(18px);box-shadow:0 22px 65px rgba(0,0,0,.34),0 0 40px rgba(var(--accent-rgb),.07);overflow:hidden}
.head{display:flex;align-items:center;gap:10px;padding:14px 18px;border-bottom:1px solid rgba(var(--accent-rgb),.08)}
.head .ico{font-size:20px}
.head .fn{font-family:var(--mono);font-size:14px;font-weight:600;word-break:break-all}
.pv{display:block;max-width:100%;max-height:60vh;margin:0 auto;object-fit:contain}
img.pv,video.pv{padding:14px}
.pv-audio{width:calc(100% - 36px);margin:18px}
.pv-code{max-height:52vh;overflow:auto;margin:0;padding:16px 18px;font-family:var(--mono);font-size:12.5px;line-height:1.6;color:#cfe3ff;white-space:pre-wrap;word-break:break-word}
.pv-file{display:flex;flex-direction:column;align-items:center;gap:8px;padding:44px 20px;font-size:34px;color:var(--text-soft)}
.pv-file span{font-size:13px;font-family:var(--mono)}
.meta{display:flex;flex-wrap:wrap;gap:8px 18px;padding:13px 18px;border-top:1px solid rgba(var(--accent-rgb),.08);font-family:var(--mono);font-size:11.5px;color:var(--text-soft)}
.meta b{color:var(--text);font-weight:600}
.meta .exp{color:#ffd28f}
.actions{display:flex;flex-wrap:wrap;gap:10px;padding:14px 18px;border-top:1px solid rgba(var(--accent-rgb),.08)}
.btn{display:inline-flex;align-items:center;gap:7px;padding:8px 15px;border-radius:7px;border:1px solid rgba(var(--accent-rgb),.35);background:rgba(var(--accent-rgb),.10);color:var(--text);font-family:var(--mono);font-size:12px;letter-spacing:.04em;text-decoration:none;cursor:pointer;transition:background .18s,border-color .18s,transform .18s}
.btn:hover{background:rgba(var(--accent-rgb),.22);border-color:rgba(var(--accent-rgb),.6);transform:translateY(-1px)}
.btn.ghost{border-color:var(--border);background:rgba(255,255,255,.04)}
.btn.ghost:hover{border-color:rgba(255,255,255,.3);background:rgba(255,255,255,.08)}
.toast{position:fixed;bottom:26px;left:50%;transform:translateX(-50%) translateY(6px);z-index:60;padding:8px 16px;border-radius:8px;border:1px solid rgba(var(--accent-rgb),.4);background:rgba(13,15,20,.92);font-family:var(--mono);font-size:12px;opacity:0;pointer-events:none;transition:opacity .25s,transform .25s}
.toast.show{opacity:1;transform:translateX(-50%) translateY(0)}
.foot{margin:16px 2px 0;font-family:var(--mono);font-size:11px;color:var(--text-dim)}
.foot a{color:var(--text-soft);text-decoration:none}
.foot a:hover{color:rgb(var(--accent-rgb))}
</style>
</head>
<body>
<div class="rainbow"></div>
<div class="backdrop"></div>
<div class="wrap">
<a class="back" href="/uploads">← all uploads</a>
<div class="card">
<div class="head"><span class="ico">${kind === 'image' ? '🖼' : kind === 'video' ? '🎬' : kind === 'audio' ? '🎵' : kind === 'text' ? '📜' : '📁'}</span><span class="fn">${name}</span></div>
${preview}
<div class="meta">
<span>size <b>${sizeText}</b></span>
<span>uploaded <b id="ts">…</b> <span id="rel"></span></span>
${expiresAt ? `<span class="exp" id="exp"></span>` : ''}
</div>
<div class="actions">
<a class="btn" href="${dlUrl}">↓ download</a>
<button class="btn" id="copy" type="button">⎘ copy link</button>
<a class="btn ghost" href="${rawUrl}" target="_blank" rel="noreferrer">raw</a>
<a class="btn ghost" href="/">landan's site →</a>
</div>
</div>
<p class="foot">hosted on <a href="/">gogurt.pages.dev</a> · made by landan</p>
</div>
<div class="toast" id="toast">link copied!</div>
<script>
const CREATED = ${row.created_at};
const EXPIRES = ${expiresAt};
const d = new Date(CREATED);
document.getElementById('ts').textContent = d.toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
const ago = Date.now() - CREATED;
const day = 86400000;
const rel = ago < 3600000 ? Math.max(1, Math.round(ago / 60000)) + 'm ago'
  : ago < day ? Math.round(ago / 3600000) + 'h ago'
  : Math.round(ago / day) + 'd ago';
document.getElementById('rel').textContent = '(' + rel + ')';
if (EXPIRES) {
  const left = EXPIRES - Date.now();
  const el = document.getElementById('exp');
  if (left > 0) {
    const days = Math.floor(left / day);
    const hrs = Math.floor((left % day) / 3600000);
    el.textContent = 'expires in ' + (days > 0 ? days + 'd ' + hrs + 'h' : hrs + 'h');
  } else { el.textContent = 'expiring soon'; }
}
document.getElementById('copy').addEventListener('click', () => {
  navigator.clipboard.writeText(${JSON.stringify(`${origin}/`)} + ${JSON.stringify(encoded)}).then(() => {
    const t = document.getElementById('toast');
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 1600);
  });
});
const codeEl = document.getElementById('code');
if (codeEl) {
  fetch(${JSON.stringify(rawUrl)}).then(r => r.text()).then(t => { codeEl.textContent = t; }).catch(() => { codeEl.textContent = 'failed to load preview'; });
}
</script>
</body>
</html>`
}

export function notFoundPage() {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>not found · gogurt</title><link rel="icon" href="/favicon.gif">
<style>body{margin:0;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;background:#050608;color:#eef3fb;font:15px/1.5 'Inter','Segoe UI',sans-serif}p{color:#9aa6b8;font-family:'IBM Plex Mono',Consolas,monospace;font-size:13px}a{color:#8fd8ff;font-family:'IBM Plex Mono',Consolas,monospace;font-size:13px}</style>
</head><body><div style="font-size:40px">🗑</div><p>this file doesn't exist (or expired)</p><a href="/uploads">← back to uploads</a></body></html>`
}
