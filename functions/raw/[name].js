import { CORS, findRowByName, serveRaw, notFoundPage } from '../_shared/uploads.js'

export async function onRequestGet({ params, env, request }) {
  const name = decodeURIComponent(params.name)
  const db = env.VIEWS_DB
  const url = new URL(request.url)
  const wantsHtml = (request.headers.get('accept') || '').includes('text/html')
  const notFound = () => wantsHtml
    ? new Response(notFoundPage(), { status: 404, headers: { 'content-type': 'text/html; charset=utf-8' } })
    : new Response('Not found', { status: 404 })

  if (!db) return notFound()
  try {
    const row = await findRowByName(db, name)
    if (!row) return notFound()
    return serveRaw({ row, env, request, download: url.searchParams.has('dl') })
  } catch {
    return notFound()
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
