// Hands a signed-in admin a short-lived link into Pulse (the uptime dashboard,
// gogurtsitepulse). Pulse refuses every API call without a token signed with
// the shared PULSE_SECRET, so this endpoint is the only way in.

const PULSE_URL = 'https://gogurtsitepulse.elmorelandan.workers.dev'
const TTL = 12 * 60 * 60 * 1000

function json(data, init = {}) {
  const headers = new Headers(init.headers)
  headers.set('content-type', 'application/json; charset=utf-8')
  headers.set('cache-control', 'no-store')
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

async function sign(secret, expiry) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`pulse:${expiry}`)))
  return btoa(String.fromCharCode(...sig)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export async function onRequestGet({ request, env }) {
  const secret = env.SESSION_SECRET
  if (!secret || !await verifySession(request, secret)) {
    return json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!env.PULSE_SECRET) return json({ error: 'PULSE_SECRET is not set' }, { status: 503 })

  const expiry = Date.now() + TTL
  const token = `${expiry}.${await sign(env.PULSE_SECRET, expiry)}`
  return json({ url: `${PULSE_URL}/#t=${token}`, expiry })
}
