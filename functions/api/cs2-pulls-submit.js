function json(data, init = {}) {
  const headers = new Headers(init.headers)
  headers.set('content-type', 'application/json; charset=utf-8')
  headers.set('access-control-allow-origin', '*')
  return new Response(JSON.stringify(data), { ...init, headers })
}

function looksLikeIpv4(value) {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(value)
}

function hashStringToUint32(value) {
  let hash = 2166136261

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }

  return hash >>> 0
}

function toPseudoIpv4(value) {
  const hash = hashStringToUint32(value)
  const octet1 = 100
  const octet2 = (hash >>> 16) & 255
  const octet3 = (hash >>> 8) & 255
  const octet4 = hash & 255
  return `${octet1}.${octet2}.${octet3}.${octet4}`
}

function getClientIpInfo(request) {
  const realIp = request.headers.get('CF-Connecting-IP') || 'unknown'
  const pseudoIpv4Header = request.headers.get('CF-Pseudo-IPv4')

  if (pseudoIpv4Header && looksLikeIpv4(pseudoIpv4Header)) {
    return {
      rateLimitIp: realIp,
      displayIp: pseudoIpv4Header,
    }
  }

  if (looksLikeIpv4(realIp)) {
    return {
      rateLimitIp: realIp,
      displayIp: realIp,
    }
  }

  return {
    rateLimitIp: realIp,
    displayIp: toPseudoIpv4(realIp),
  }
}

function isValidUrl(value) {
  try {
    new URL(value)
    return true
  } catch {
    return false
  }
}

function validatePull(pull) {
  const requiredFields = [
    'weaponName',
    'skinName',
    'wear',
    'pattern',
    'float',
    'dateOpened',
    'steamInventoryLink',
    'discordUserId',
  ]

  for (const field of requiredFields) {
    if (!pull[field] || !String(pull[field]).trim()) {
      return `${field} is required.`
    }
  }

  if (!/^\d{17,20}$/.test(String(pull.discordUserId).trim())) {
    return 'Discord UserID must be a valid Discord snowflake.'
  }

  if (!isValidUrl(String(pull.steamInventoryLink).trim())) {
    return 'Steam inventory link must be a valid URL.'
  }

  if (pull.clipLink && !isValidUrl(String(pull.clipLink).trim())) {
    return 'Clip link must be a valid URL.'
  }

  return null
}

function buildEmbed(pull, index) {
  return {
    title: `${index + 1}. ${pull.weaponName} | ${pull.skinName}`,
    color: 0xf59e0b,
    fields: [
      {
        name: 'Pattern',
        value: String(pull.pattern),
        inline: true,
      },
      {
        name: 'Float',
        value: String(pull.float),
        inline: true,
      },
      {
        name: 'Date opened',
        value: String(pull.dateOpened),
        inline: true,
      },
      {
        name: 'Steam inventory',
        value: String(pull.steamInventoryLink),
      },
      {
        name: 'Discord UserID',
        value: String(pull.discordUserId),
        inline: true,
      },
      {
        name: 'Clip',
        value: pull.clipLink ? String(pull.clipLink) : 'No clip attached',
      },
    ],
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'POST, OPTIONS',
      'access-control-allow-headers': 'content-type',
    },
  })
}

export async function onRequestPost(context) {
  const { request, env } = context

  if (!env.DISCORD_PULLS_WEBHOOK_URL) {
    return json({ error: 'Missing DISCORD_PULLS_WEBHOOK_URL.' }, { status: 500 })
  }

  const { rateLimitIp, displayIp } = getClientIpInfo(request)
  const rateKeyUrl = new URL(request.url)
  rateKeyUrl.search = `?ip=${encodeURIComponent(rateLimitIp)}`
  const cache = caches.default
  const cacheKey = new Request(rateKeyUrl.toString(), { method: 'GET' })
  const existing = await cache.match(cacheKey)

  if (existing) {
    return json(
      { error: 'Slow down a bit before sending another pull.' },
      { status: 429 },
    )
  }

  let payload

  try {
    payload = await request.json()
  } catch {
    return json({ error: 'Invalid JSON payload.' }, { status: 400 })
  }

  const pulls = Array.isArray(payload.pulls) ? payload.pulls : []

  if (!pulls.length) {
    return json({ error: 'At least one skin is required.' }, { status: 400 })
  }

  if (pulls.length > 5) {
    return json({ error: 'Too many skins in one submission.' }, { status: 400 })
  }

  for (const pull of pulls) {
    const validationError = validatePull(pull)
    if (validationError) {
      return json({ error: validationError }, { status: 400 })
    }
  }

  const webhookResponse = await fetch(env.DISCORD_PULLS_WEBHOOK_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      content: `New CS2 pull submission from ${displayIp}`,
      embeds: pulls.map((pull, index) => buildEmbed(pull, index)),
      allowed_mentions: { parse: [] },
    }),
  })

  if (!webhookResponse.ok) {
    return json({ error: 'Webhook delivery failed.' }, { status: 502 })
  }

  const cooldownResponse = new Response('cooldown', {
    headers: {
      'cache-control': 'public, max-age=90',
    },
  })
  await cache.put(cacheKey, cooldownResponse)

  return json({ ok: true })
}
