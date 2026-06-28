function mimeType(ext) {
  const map = {
    lua: 'text/plain', txt: 'text/plain', md: 'text/plain',
    json: 'application/json', js: 'text/javascript', ts: 'text/plain',
    css: 'text/css', html: 'text/html', xml: 'text/xml',
    png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
    gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml',
    mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg',
  }
  return map[ext] || 'application/octet-stream'
}

export async function onRequestGet({ params, env }) {
  const name = decodeURIComponent(params.name)
  const db = env.VIEWS_DB
  if (!db) return new Response('Not found', { status: 404 })
  try {
    const row = await db.prepare(
      'SELECT name, ext, data FROM uploads WHERE name = ? ORDER BY created_at DESC LIMIT 1'
    ).bind(name).first()
    if (!row) return new Response('Not found', { status: 404 })
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
    const ct = mimeType(row.ext)
    const isText = ct.startsWith('text/') || ct === 'application/json'
    return new Response(body, {
      headers: {
        'content-type': isText ? ct + '; charset=utf-8' : ct,
        'access-control-allow-origin': '*',
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
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET, OPTIONS',
    },
  })
}
