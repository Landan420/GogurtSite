function json(data, init = {}) {
  const headers = new Headers(init.headers)
  headers.set('content-type', 'application/json; charset=utf-8')
  headers.set('cache-control', 'public, max-age=0, s-maxage=300')
  headers.set('access-control-allow-origin', '*')
  return new Response(JSON.stringify(data), { ...init, headers })
}

const inviteCode = 'gogurt'

// Pages Functions responses aren't edge-cached by s-maxage, so cache the
// Discord lookup ourselves. The fresh copy keeps us under Discord's rate
// limit; the last-good copy is served if Discord errors (429s mostly).
const freshKey = `https://cache.internal/discord-invite/${inviteCode}`
const lastGoodKey = `${freshKey}/last-good`
const freshSeconds = 300
const lastGoodSeconds = 60 * 60 * 24

function cacheEntry(data, maxAge) {
  return new Response(JSON.stringify(data), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': `public, max-age=${maxAge}`,
    },
  })
}

async function lookupInvite() {
  const response = await fetch(
    `https://discord.com/api/v10/invites/${inviteCode}?with_counts=true&with_expiration=true`,
  )

  if (!response.ok) {
    return { status: response.status }
  }

  const invite = await response.json()

  return {
    data: {
      code: invite.code,
      guildId: invite.guild?.id ?? invite.guild_id ?? null,
      guildName: invite.guild?.name ?? invite.profile?.name ?? 'Gogurt',
      memberCount:
        invite.approximate_member_count ?? invite.profile?.member_count ?? null,
      onlineCount:
        invite.approximate_presence_count ?? invite.profile?.online_count ?? null,
    },
  }
}

export async function onRequestGet(context) {
  const cache = caches.default

  const fresh = await cache.match(freshKey)
  if (fresh) {
    return json(await fresh.json())
  }

  let result
  try {
    result = await lookupInvite()
  } catch {
    result = { status: 502 }
  }

  if (result.data) {
    context.waitUntil(
      Promise.all([
        cache.put(freshKey, cacheEntry(result.data, freshSeconds)),
        cache.put(lastGoodKey, cacheEntry(result.data, lastGoodSeconds)),
      ]),
    )
    return json(result.data)
  }

  const lastGood = await cache.match(lastGoodKey)
  if (lastGood) {
    return json(await lastGood.json())
  }

  return json(
    { error: 'Discord server lookup failed.', status: result.status },
    { status: 502 },
  )
}
