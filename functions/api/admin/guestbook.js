/* Guestbook moderation — list everything, approve/unapprove, delete. */

function json(data, init = {}) {
  const headers = new Headers(init.headers)
  headers.set('content-type', 'application/json; charset=utf-8')
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

async function initGuestbook(db) {
  await db.exec("CREATE TABLE IF NOT EXISTS guestbook (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, message TEXT NOT NULL, media_url TEXT, status TEXT NOT NULL DEFAULT 'pending', created_at INTEGER NOT NULL, ip_hash TEXT)")
}

async function guard({ request, env }) {
  const secret = env.SESSION_SECRET
  if (!secret || !await verifySession(request, secret)) {
    return json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!env.VIEWS_DB) return json({ error: 'No database' }, { status: 503 })
  return null
}

export async function onRequestGet(ctx) {
  const denied = await guard(ctx)
  if (denied) return denied

  const db = ctx.env.VIEWS_DB
  await initGuestbook(db)
  const { results } = await db
    .prepare('SELECT id, name, message, media_url, status, created_at FROM guestbook ORDER BY id DESC LIMIT 300')
    .all()
  return json({ entries: results || [] }, { headers: { 'cache-control': 'no-store' } })
}

export async function onRequestPatch(ctx) {
  const denied = await guard(ctx)
  if (denied) return denied

  let body
  try { body = await ctx.request.json() } catch { return json({ error: 'Bad request' }, { status: 400 }) }

  const id = Number(body?.id)
  const status = body?.status === 'approved' ? 'approved' : 'pending'
  if (!Number.isInteger(id) || id <= 0) return json({ error: 'Bad id' }, { status: 400 })

  const db = ctx.env.VIEWS_DB
  await initGuestbook(db)
  await db.prepare('UPDATE guestbook SET status = ? WHERE id = ?').bind(status, id).run()
  return json({ ok: true, id, status })
}

export async function onRequestDelete(ctx) {
  const denied = await guard(ctx)
  if (denied) return denied

  const url = new URL(ctx.request.url)
  const id = Number(url.searchParams.get('id'))
  if (!Number.isInteger(id) || id <= 0) return json({ error: 'Bad id' }, { status: 400 })

  const db = ctx.env.VIEWS_DB
  await initGuestbook(db)
  await db.prepare('DELETE FROM guestbook WHERE id = ?').bind(id).run()
  return json({ ok: true, id })
}
