import { CORS, findRowByName, serveRaw } from '../../_shared/uploads.js'

// Legacy path — new links are /<name> (viewer) and /raw/<name> (bytes).
// Keep serving bytes here so old copied/embedded links never break.
export async function onRequestGet({ params, env, request }) {
  const name = decodeURIComponent(params.name)
  const url = new URL(request.url)
  const wantsHtml = (request.headers.get('accept') || '').includes('text/html')

  // A person opening a legacy link in a browser lands on the pretty viewer
  if (wantsHtml && !url.searchParams.has('raw') && !url.searchParams.has('dl')) {
    return Response.redirect(`${url.origin}/${encodeURIComponent(name)}`, 302)
  }

  const db = env.VIEWS_DB
  if (!db) return new Response('Not found', { status: 404 })
  try {
    const row = await findRowByName(db, name)
    if (!row) return new Response('Not found', { status: 404 })
    return serveRaw({ row, env, request, download: url.searchParams.has('dl') })
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
