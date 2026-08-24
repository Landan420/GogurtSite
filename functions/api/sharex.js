function json(data, init = {}) {
  const headers = new Headers(init.headers)
  headers.set('content-type', 'application/json; charset=utf-8')
  headers.set('access-control-allow-origin', '*')
  return new Response(JSON.stringify(data), { ...init, headers })
}

function sanitizeName(name) {
  return name.replace(/[^a-zA-Z0-9._ ()-]/g, '_').replace(/\s+/g, ' ').trim().slice(0, 120) || 'file'
}

async function initTable(db) {
  await db.prepare(
    'CREATE TABLE IF NOT EXISTS uploads (id TEXT PRIMARY KEY, name TEXT NOT NULL, ext TEXT NOT NULL, description TEXT DEFAULT \'\', data TEXT NOT NULL, size INTEGER NOT NULL, created_at INTEGER NOT NULL)'
  ).run()
}

export async function onRequestPost({ request, env }) {
  try {
    const key = env.SHAREX_KEY
    const auth = (request.headers.get('Authorization') || '').replace('Bearer ', '').trim()
    if (!key || auth !== key) return json({ error: 'Unauthorized' }, { status: 401 })

    const bucket = env.UPLOADS_R2
    const db = env.VIEWS_DB
    if (!bucket || !db) return json({ error: 'Storage not configured' }, { status: 503 })

    const form = await request.formData()
    const file = form.get('file')
    if (!file || typeof file === 'string') return json({ error: 'No file' }, { status: 400 })

    const id = crypto.randomUUID()
    let name = sanitizeName(file.name || 'file')
    const ext = (name.includes('.') ? name.split('.').pop() : '').toLowerCase()

    await initTable(db)

    // expire old ShareX uploads (14 days) so the bucket stays inside the free tier
    try {
      const cutoff = Date.now() - 14 * 24 * 60 * 60 * 1000
      const { results } = await db.prepare(
        "SELECT data FROM uploads WHERE data LIKE 'r2:%' AND created_at < ?"
      ).bind(cutoff).all()
      for (const row of results || []) {
        try { await bucket.delete(row.data.slice(3)) } catch {}
      }
      if (results?.length) {
        await db.prepare("DELETE FROM uploads WHERE data LIKE 'r2:%' AND created_at < ?").bind(cutoff).run()
      }
    } catch {}

    const clash = await db.prepare('SELECT id FROM uploads WHERE name = ?').bind(name).first()
    if (clash) name = `${id.slice(0, 8)}-${name}`

    const r2Key = `${id}/${name}`
    await bucket.put(r2Key, file.stream(), {
      httpMetadata: { contentType: file.type || 'application/octet-stream' },
    })

    await db.prepare(
      'INSERT INTO uploads (id, name, ext, description, data, size, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(id, name, ext, '', `r2:${r2Key}`, file.size || 0, Date.now()).run()

    const url = new URL(request.url)
    return json({
      ok: true,
      id,
      url: `${url.origin}/api/raw/${encodeURIComponent(name)}`,
    })
  } catch (err) {
    return json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}

export async function onRequestOptions() {
  return new Response(null, { headers: { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'POST, OPTIONS', 'access-control-allow-headers': 'content-type, authorization' } })
}
