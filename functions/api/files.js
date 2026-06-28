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

export async function onRequestGet({ env }) {
  const db = env.VIEWS_DB
  if (!db) return json([])
  try {
    await initTable(db)
    const { results } = await db.prepare(
      'SELECT id, name, ext, description, data, size, created_at FROM uploads ORDER BY created_at DESC'
    ).all()
    return json(results || [], { headers: { 'cache-control': 'no-store' } })
  } catch { return json([]) }
}

export async function onRequestOptions() {
  return new Response(null, { headers: { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET, OPTIONS', 'access-control-allow-headers': 'content-type, authorization' } })
}
