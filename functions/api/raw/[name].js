function mimeType(ext) {
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

const CORS = { 'access-control-allow-origin': '*' }

export async function onRequestGet({ params, env, request }) {
  const name = decodeURIComponent(params.name)
  const db = env.VIEWS_DB
  if (!db) return new Response('Not found', { status: 404 })
  try {
    const row = await db.prepare(
      'SELECT name, ext, data FROM uploads WHERE name = ? ORDER BY created_at DESC LIMIT 1'
    ).bind(name).first()
    if (!row) return new Response('Not found', { status: 404 })

    const ct = mimeType(row.ext)
    const isText = ct.startsWith('text/') || ct === 'application/json'
    const contentType = isText ? ct + '; charset=utf-8' : ct

    // R2-backed upload (ShareX etc.) — stream from the bucket with range support
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
        'content-type': contentType,
        'cache-control': 'no-store',
      },
    })
  } catch {
    return new Response('Not found', { status: 404 })
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      ...CORS,
      'access-control-allow-methods': 'GET, OPTIONS',
      'access-control-allow-headers': 'range',
    },
  })
}
