/* Public guestbook — GET approved entries, POST a new (pending) entry. */

const NAME_MAX = 24
const MESSAGE_MAX = 200
const LIST_LIMIT = 60

/* Registrable domains we let people hotlink gifs/images from. */
const ALLOWED_MEDIA_DOMAINS = [
  'imgur.com',
  'tenor.com',
  'giphy.com',
  'discordapp.com',
  'discordapp.net',
  'instagram.com',
  'cdninstagram.com',
  'redd.it',
  'redditmedia.com',
  'twimg.com',
  'tumblr.com',
  'pinimg.com',
  'ytimg.com',
  'catbox.moe',
  'gyazo.com',
  'postimg.cc',
  'ibb.co',
  'githubusercontent.com',
  'steamstatic.com',
]

/* Hosts that serve media without a file extension in the path. */
const EXTENSIONLESS_DOMAINS = ['cdninstagram.com', 'instagram.com', 'tenor.com']

const MEDIA_EXT_RE = /\.(gif|gifv|png|jpe?g|webp|apng|avif)$/i

function json(data, init = {}) {
  const headers = new Headers(init.headers)
  headers.set('content-type', 'application/json; charset=utf-8')
  return new Response(JSON.stringify(data), { ...init, headers })
}

async function initGuestbook(db) {
  await db.exec("CREATE TABLE IF NOT EXISTS guestbook (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, message TEXT NOT NULL, media_url TEXT, status TEXT NOT NULL DEFAULT 'pending', created_at INTEGER NOT NULL, ip_hash TEXT)")
}

async function hashIp(ip, salt) {
  const raw = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${salt || 'gogurt'}:${ip}`))
  return [...new Uint8Array(raw)].slice(0, 12).map(b => b.toString(16).padStart(2, '0')).join('')
}

/* Strips tags/control chars and collapses runaway whitespace. */
function clean(value, max) {
  return String(value ?? '')
    .replace(/<[^>]*>/g, '')
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x08\x0b-\x1f\x7f]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, max)
}

function domainOf(host) {
  return ALLOWED_MEDIA_DOMAINS.find(d => host === d || host.endsWith(`.${d}`))
}

/* Returns a normalized direct-media URL, '' for none, or null if not allowed. */
function normalizeMediaUrl(raw) {
  const input = String(raw ?? '').trim()
  if (!input) return ''

  let url
  try { url = new URL(input) } catch { return null }
  if (url.protocol !== 'https:') return null

  const host = url.hostname.toLowerCase()
  const domain = domainOf(host)
  if (!domain) return null

  /* imgur's .gifv is a video page wrapper — the .gif beside it is the real file. */
  if (/\.gifv$/i.test(url.pathname)) url.pathname = url.pathname.replace(/\.gifv$/i, '.gif')

  /* imgur album/page links point at HTML, not an image. */
  if (domain === 'imgur.com' && host !== 'i.imgur.com') return null

  const hasExt = MEDIA_EXT_RE.test(url.pathname)
  const extensionless = EXTENSIONLESS_DOMAINS.includes(domain)
  if (!hasExt && !extensionless) return null

  /* tenor share pages (/view/...) are HTML; only the media CDN serves real files. */
  if (domain === 'tenor.com' && !hasExt && !/^(media|c)/.test(host)) return null

  url.hash = ''
  return url.toString()
}

export async function onRequestGet({ env }) {
  const db = env.VIEWS_DB
  if (!db) return json({ entries: [] })
  try {
    await initGuestbook(db)
    const { results } = await db
      .prepare('SELECT id, name, message, media_url, created_at FROM guestbook WHERE status = ? ORDER BY id DESC LIMIT ?')
      .bind('approved', LIST_LIMIT)
      .all()
    return json({ entries: results || [] }, { headers: { 'cache-control': 'no-store' } })
  } catch { return json({ entries: [] }) }
}

export async function onRequestPost({ request, env }) {
  const db = env.VIEWS_DB
  if (!db) return json({ error: 'Guestbook is offline right now.' }, { status: 503 })

  let body
  try { body = await request.json() } catch { return json({ error: 'Bad request' }, { status: 400 }) }

  const name = clean(body?.name, NAME_MAX)
  const message = clean(body?.message, MESSAGE_MAX)
  if (name.length < 2) return json({ error: 'Name needs at least 2 characters.' }, { status: 400 })
  if (message.length < 2) return json({ error: 'Say a little more than that.' }, { status: 400 })

  const mediaUrl = normalizeMediaUrl(body?.media_url)
  if (mediaUrl === null) {
    return json({
      error: 'That link is not a direct image. Right-click the gif, "copy image address" — imgur, tenor, giphy, discord, instagram, reddit and twitter all work.',
    }, { status: 400 })
  }

  await initGuestbook(db)

  const ip = request.headers.get('cf-connecting-ip') || '0.0.0.0'
  const ipHash = await hashIp(ip, env.SESSION_SECRET)
  const now = Date.now()

  const recent = await db
    .prepare('SELECT created_at FROM guestbook WHERE ip_hash = ? ORDER BY id DESC LIMIT 3')
    .bind(ipHash)
    .all()
  const stamps = (recent.results || []).map(r => r.created_at)
  if (stamps.length && now - stamps[0] < 30_000) {
    return json({ error: 'Slow down a sec.' }, { status: 429 })
  }
  if (stamps.length >= 3 && now - stamps[2] < 60 * 60 * 1000) {
    return json({ error: 'That is enough signatures for one hour.' }, { status: 429 })
  }

  await db
    .prepare('INSERT INTO guestbook (name, message, media_url, status, created_at, ip_hash) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(name, message, mediaUrl || null, 'pending', now, ipHash)
    .run()

  return json({ ok: true, pending: true })
}
