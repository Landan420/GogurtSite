function json(data, init = {}) {
  const headers = new Headers(init.headers)
  headers.set('content-type', 'application/json; charset=utf-8')
  headers.set('cache-control', 'public, max-age=0, s-maxage=300')
  headers.set('access-control-allow-origin', '*')
  return new Response(JSON.stringify(data), { ...init, headers })
}

const inviteCode = 'gogurt'

export async function onRequestGet() {
  const response = await fetch(
    `https://discord.com/api/v10/invites/${inviteCode}?with_counts=true&with_expiration=true`,
  )

  if (!response.ok) {
    return json(
      { error: 'Discord server lookup failed.', status: response.status },
      { status: 502 },
    )
  }

  const invite = await response.json()

  return json({
    code: invite.code,
    guildId: invite.guild?.id ?? invite.guild_id ?? null,
    guildName: invite.guild?.name ?? invite.profile?.name ?? 'Gogurt',
    memberCount:
      invite.approximate_member_count ?? invite.profile?.member_count ?? null,
    onlineCount:
      invite.approximate_presence_count ?? invite.profile?.online_count ?? null,
  })
}
