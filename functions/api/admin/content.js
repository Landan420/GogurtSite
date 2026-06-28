const ALLOWED_KEYS = [
  'custom_status', 'location', 'about_bio',
  'custom_name', 'custom_handle', 'ascii_comment', 'name_style',
  'custom_avatar_url', 'custom_banner_url',
]

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

async function initContent(db) {
  await db.exec('CREATE TABLE IF NOT EXISTS site_content (key TEXT PRIMARY KEY, value TEXT NOT NULL)')
}

export async function onRequestGet({ env }) {
  const db = env.VIEWS_DB
  if (!db) return json({})
  try {
    await initContent(db)
    const { results } = await db.prepare('SELECT key, value FROM site_content').all()
    const out = {}
    for (const row of results || []) out[row.key] = row.value
    return json(out, { headers: { 'cache-control': 'no-store' } })
  } catch { return json({}) }
}

export async function onRequestPut({ request, env }) {
  const secret = env.SESSION_SECRET
  if (!secret || !await verifySession(request, secret)) {
    return json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = env.VIEWS_DB
  if (!db) return json({ error: 'No database' }, { status: 503 })

  let body
  try { body = await request.json() } catch { return json({ error: 'Bad request' }, { status: 400 }) }

  await initContent(db)
  for (const [key, value] of Object.entries(body)) {
    if (!ALLOWED_KEYS.includes(key)) continue
    await db.prepare('INSERT OR REPLACE INTO site_content (key, value) VALUES (?, ?)').bind(key, String(value)).run()
  }

  return json({ ok: true })
}
