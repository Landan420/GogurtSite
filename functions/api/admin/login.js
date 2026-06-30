function json(data, init = {}) {
  const headers = new Headers(init.headers)
  headers.set('content-type', 'application/json; charset=utf-8')
  return new Response(JSON.stringify(data), { ...init, headers })
}

async function getKey(secret, usage) {
  const raw = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret))
  return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, [usage])
}

async function decrypt(secret, token) {
  try {
    const bytes = new Uint8Array(atob(token).split('').map(c => c.charCodeAt(0)))
    const iv = bytes.slice(0, 12)
    const ct = bytes.slice(12)
    const key = await getKey(secret, 'decrypt')
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct)
    return JSON.parse(new TextDecoder().decode(pt))
  } catch { return null }
}

async function encrypt(secret, data) {
  const key = await getKey(secret, 'encrypt')
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ct = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(JSON.stringify(data))
  )
  const combined = new Uint8Array(iv.byteLength + ct.byteLength)
  combined.set(iv, 0)
  combined.set(new Uint8Array(ct), iv.byteLength)
  return btoa(String.fromCharCode(...combined))
}

export async function onRequestPost({ request, env }) {
  const secret = env.SESSION_SECRET
  if (!secret) return json({ error: 'Server misconfigured' }, { status: 500 })

  let body
  try { body = await request.json() } catch { return json({ error: 'Bad request' }, { status: 400 }) }

  const email = (body?.email || '').toLowerCase().trim()
  const code = (body?.code || '').trim()
  const otpToken = (body?.otpToken || '').trim()

  if (!email || !code || !otpToken) return json({ error: 'Invalid request' }, { status: 400 })

  const payload = await decrypt(secret, otpToken)
  if (!payload) return json({ error: 'Invalid or expired code' }, { status: 401 })

  if (payload.email !== email) return json({ error: 'Invalid or expired code' }, { status: 401 })
  if (payload.code !== code) return json({ error: 'Invalid or expired code' }, { status: 401 })
  if (Date.now() > payload.expiry) return json({ error: 'Code expired' }, { status: 401 })

  const ttl = body.remember ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000
  const sessionToken = await encrypt(secret, { email, expiry: Date.now() + ttl })
  return json({ token: sessionToken })
}
