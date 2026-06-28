function json(data, init = {}) {
  const headers = new Headers(init.headers)
  headers.set('content-type', 'application/json; charset=utf-8')
  return new Response(JSON.stringify(data), { ...init, headers })
}

async function getKey(secret) {
  const raw = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret))
  return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt'])
}

async function encrypt(secret, data) {
  const key = await getKey(secret)
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
  let body
  try { body = await request.json() } catch { return json({ ok: true }) }

  const email = (body?.email || '').toLowerCase().trim()
  if (!email) return json({ ok: true })

  const adminEmails = [env.ADMIN_EMAIL_1, env.ADMIN_EMAIL_2, env.ADMIN_EMAIL_3]
    .filter(Boolean)
    .map(e => e.toLowerCase().trim())

  if (!adminEmails.includes(email)) return json({ ok: true })

  const code = String(Math.floor(100000 + Math.random() * 900000))
  const expiry = Date.now() + 5 * 60 * 1000

  const secret = env.SESSION_SECRET
  if (!secret) {
    console.error('[admin/otp] SESSION_SECRET is not set')
    return json({ ok: true })
  }

  let otpToken
  try {
    otpToken = await encrypt(secret, { email, code, expiry })
  } catch (e) {
    console.error('[admin/otp] Encrypt failed:', e)
    return json({ ok: true })
  }

  const apiKey = env.RESEND_API_KEY
  if (!apiKey) {
    console.error('[admin/otp] RESEND_API_KEY is not set')
    return json({ ok: true })
  }

  const to = env.RESEND_TO_OVERRIDE || email
  const from = env.RESEND_FROM || 'onboarding@resend.dev'

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to,
        subject: 'Login code',
        html: `<div style="font-family:monospace;background:#050608;color:#c8e8ff;padding:32px;border-radius:8px;max-width:400px"><p style="color:#4a7a9b;margin:0 0 12px;font-size:12px">gogurt.pages.dev</p><p style="margin:0 0 24px">your one-time login code:</p><div style="font-size:40px;font-weight:900;letter-spacing:10px;color:#8fd8ff;padding:16px 0">${code}</div><p style="margin:24px 0 0;color:#4a7a9b;font-size:11px">expires in 5 minutes · do not share</p></div>`,
      }),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      console.error(`[admin/otp] Resend error ${res.status}: ${text}`)
      return json({ ok: true })
    }
  } catch (e) {
    console.error('[admin/otp] Resend fetch threw:', e)
    return json({ ok: true })
  }

  return json({ ok: true, otpToken })
}
