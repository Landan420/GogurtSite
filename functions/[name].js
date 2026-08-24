import { findRowByName, viewerPage } from './_shared/uploads.js'

// SPA routes and paths that must never be treated as upload names
const RESERVED = new Set(['uploads', 'trimmer', 'admin', 'raw', 'api', 'assets', 'index.html'])

export async function onRequestGet(context) {
  const { params, env, request, next } = context
  const name = decodeURIComponent(params.name)
  if (RESERVED.has(name.toLowerCase())) return next()

  const db = env.VIEWS_DB
  if (!db) return next()
  try {
    const row = await findRowByName(db, name)
    if (!row) return next()
    const url = new URL(request.url)
    return new Response(viewerPage({ row, origin: url.origin }), {
      headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' },
    })
  } catch {
    return next()
  }
}
