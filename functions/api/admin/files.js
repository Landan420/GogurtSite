function json(data, init = {}) {
  const headers = new Headers(init.headers)
  headers.set('content-type', 'application/json; charset=utf-8')
  headers.set('access-control-allow-origin', '*')
  return new Response(JSON.stringify(data), { ...init, headers })
}

async function verifySession(request, secret) {
  try {
    const auth = request.headers.get('Authorization') || ''
    const token = auth.replace('Bearer ', '').trim()
    if (!token) return false
    const bytes = new Uint8Array(atob(token).split('').map(c => c.charCodeAt(0)))
    const iv = bytes.slice(0, 12)
    const ct = bytes.slice(12)
    const raw = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret))
    const key = await crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['decrypt'])
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct)
    const payload = JSON.parse(new TextDecoder().decode(pt))
    return Date.now() < payload.expiry
  } catch { return false }
}

async function initTable(db) {
  await db.prepare(
    'CREATE TABLE IF NOT EXISTS uploads (id TEXT PRIMARY KEY, name TEXT NOT NULL, ext TEXT NOT NULL, description TEXT DEFAULT \'\', data TEXT NOT NULL, size INTEGER NOT NULL, created_at INTEGER NOT NULL)'
  ).run()
}

export async function onRequestPost({ request, env }) {
  try {
    const secret = env.SESSION_SECRET
    if (!secret || !await verifySession(request, secret)) return json({ error: 'Unauthorized' }, { status: 401 })
    const db = env.VIEWS_DB
    if (!db) return json({ error: 'No database' }, { status: 503 })
    let body
    try { body = await request.json() } catch { return json({ error: 'Bad request' }, { status: 400 }) }
    const { name, ext, description = '', data, size } = body
    if (!name || !data) return json({ error: 'Missing fields' }, { status: 400 })
    await initTable(db)
    const id = crypto.randomUUID()
    await db.prepare(
      'INSERT INTO uploads (id, name, ext, description, data, size, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(id, name, ext || '', description, data, size || 0, Date.now()).run()
    return json({ ok: true, id })
  } catch (err) {
    return json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}

export async function onRequestDelete({ request, env }) {
  try {
    const secret = env.SESSION_SECRET
    if (!secret || !await verifySession(request, secret)) return json({ error: 'Unauthorized' }, { status: 401 })
    const db = env.VIEWS_DB
    if (!db) return json({ error: 'No database' }, { status: 503 })
    const url = new URL(request.url)
    const id = url.searchParams.get('id')
    if (!id) return json({ error: 'Missing id' }, { status: 400 })
    await initTable(db)
    await db.prepare('DELETE FROM uploads WHERE id = ?').bind(id).run()
    return json({ ok: true })
  } catch (err) {
    return json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}

export async function onRequestOptions() {
  return new Response(null, { headers: { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'POST, DELETE, OPTIONS', 'access-control-allow-headers': 'content-type, authorization' } })
}
