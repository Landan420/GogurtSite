function json(data, init = {}) {
  const headers = new Headers(init.headers)
  headers.set('content-type', 'application/json; charset=utf-8')
  headers.set('access-control-allow-origin', '*')
  return new Response(JSON.stringify(data), { ...init, headers })
}

async function initTable(db) {
  await db.prepare(
    'CREATE TABLE IF NOT EXISTS uploads (id TEXT PRIMARY KEY, name TEXT NOT NULL, ext TEXT NOT NULL, description TEXT DEFAULT \'\', data TEXT NOT NULL, size INTEGER NOT NULL, created_at INTEGER NOT NULL)'
  ).run()
}

// ShareX/R2 uploads expire after 14 days (R2 lifecycle rule mops up at 15 as a backstop)
const R2_EXPIRY_MS = 14 * 24 * 60 * 60 * 1000

async function cleanupExpired(db, bucket) {
  const cutoff = Date.now() - R2_EXPIRY_MS
  const { results } = await db.prepare(
    "SELECT data FROM uploads WHERE data LIKE 'r2:%' AND created_at < ?"
  ).bind(cutoff).all()
  if (!results?.length) return
  if (bucket) {
    for (const row of results) {
      try { await bucket.delete(row.data.slice(3)) } catch {}
    }
  }
  await db.prepare("DELETE FROM uploads WHERE data LIKE 'r2:%' AND created_at < ?").bind(cutoff).run()
}

export async function onRequestGet({ env }) {
  const db = env.VIEWS_DB
  if (!db) return json([])
  try {
    await initTable(db)
    try { await cleanupExpired(db, env.UPLOADS_R2) } catch {}
    const { results } = await db.prepare(
      'SELECT id, name, ext, description, data, size, created_at FROM uploads ORDER BY created_at DESC'
    ).all()
    return json(results || [], { headers: { 'cache-control': 'no-store' } })
  } catch { return json([]) }
}

export async function onRequestOptions() {
  return new Response(null, { headers: { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET, OPTIONS', 'access-control-allow-headers': 'content-type, authorization' } })
}
