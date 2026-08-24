import { findRowByName, viewerPage, serveRaw } from './_shared/uploads.js'

// SPA routes and paths that must never be treated as upload names
const RESERVED = new Set(['uploads', 'trimmer', 'admin', 'raw', 'api', 'assets', 'index.html'])

// Link-preview crawlers get the raw file (Discord shows a plain inline image,
// no embed card); real browsers get the themed viewer page.
const BOT_RE = /discordbot|telegrambot|twitterbot|slackbot|slack-imgproxy|whatsapp|facebookexternalhit|linkedinbot|skypeuripreview|bot\b|crawler|spider|preview/i

export async function onRequestGet(context) {
  const { params, env, request, next } = context
  const name = decodeURIComponent(params.name)
  if (RESERVED.has(name.toLowerCase())) return next()

  const db = env.VIEWS_DB
  if (!db) return next()
  try {
    const row = await findRowByName(db, name)
    if (!row) return next()

    const ua = request.headers.get('user-agent') || ''
    const wantsHtml = (request.headers.get('accept') || '').includes('text/html')
    if (!wantsHtml || BOT_RE.test(ua)) {
      const res = await serveRaw({ row, env, request })
      const headers = new Headers(res.headers)
      headers.set('vary', 'accept, user-agent')
      return new Response(res.body, { status: res.status, headers })
    }

    const url = new URL(request.url)
    return new Response(viewerPage({ row, origin: url.origin }), {
      headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', vary: 'accept, user-agent' },
    })
  } catch {
    return next()
  }
}
