function json(data, init = {}) {
  const headers = new Headers(init.headers)
  headers.set('content-type', 'application/json; charset=utf-8')
  headers.set('cache-control', 'no-store')
  headers.set('access-control-allow-origin', '*')
  return new Response(JSON.stringify(data), { ...init, headers })
}

function getDefaultAvatarIndex(user) {
  if (user.discriminator && user.discriminator !== '0') {
    return Number(user.discriminator) % 5
  }

  return (Number(BigInt(user.id) >> 22n) % 6)
}

function getAvatarUrl(user) {
  if (user.avatar) {
    const extension = user.avatar.startsWith('a_') ? 'gif' : 'png'
    return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${extension}?size=128`
  }

  const index = getDefaultAvatarIndex(user)
  return `https://cdn.discordapp.com/embed/avatars/${index}.png`
}

function getBannerUrl(user) {
  if (!user.banner) {
    return null
  }

  const extension = user.banner.startsWith('a_') ? 'gif' : 'png'
  return `https://cdn.discordapp.com/banners/${user.id}/${user.banner}.${extension}?size=512`
}

function getDisplayName(user) {
  const displayName = typeof user.display_name === 'string' ? user.display_name.trim() : ''
  const globalName = typeof user.global_name === 'string' ? user.global_name.trim() : ''
  const username = typeof user.username === 'string' ? user.username.trim() : ''
  return displayName || globalName || username || user.username
}

async function getLanyardUser(id) {
  try {
    const response = await fetch(`https://api.lanyard.rest/v1/users/${id}`)

    if (!response.ok) {
      return null
    }

    const payload = await response.json()
    return payload?.data?.discord_user ?? null
  } catch {
    return null
  }
}

export async function onRequestGet(context) {
  const { request, env } = context
  const url = new URL(request.url)
  const id = url.searchParams.get('id')

  if (!id || !/^\d{17,20}$/.test(id)) {
    return json({ error: 'Invalid Discord user id.' }, { status: 400 })
  }

  const lanyardUser = await getLanyardUser(id)
  let user = lanyardUser
  let profile = null

  if (env.DISCORD_BOT_TOKEN) {
    const response = await fetch(`https://discord.com/api/v10/users/${id}`, {
      headers: {
        Authorization: `Bot ${env.DISCORD_BOT_TOKEN}`,
      },
    })

    if (response.ok) {
      user = await response.json()
    } else if (!lanyardUser) {
      return json(
        { error: 'Discord profile lookup failed.', status: response.status },
        { status: response.status === 404 ? 404 : 502 },
      )
    }

    const guildId = '849004815110897685'
    const profileResponse = await fetch(
      `https://discord.com/api/v10/users/${id}/profile?with_mutual_guilds=false&with_mutual_friends=false&with_mutual_friends_count=false&guild_id=${guildId}`,
      {
        headers: {
          Authorization: `Bot ${env.DISCORD_BOT_TOKEN}`,
        },
      },
    )

    if (profileResponse.ok) {
      profile = await profileResponse.json()
    }
  }

  if (!user) {
    return json(
      { error: 'Discord profile lookup failed.' },
      { status: 502 },
    )
  }

  const liveUser = lanyardUser?.id ? lanyardUser : user
  const profileUser = profile?.user ?? {}
  const bodyData = {
    id: liveUser.id,
    username: getDisplayName(liveUser),
    handle: liveUser.username,
    avatarUrl: getAvatarUrl(liveUser),
    bannerUrl: getBannerUrl(profileUser.id ? profileUser : user),
    globalName:
      liveUser.display_name ??
      profileUser.global_name ??
      liveUser.global_name ??
      user.global_name ??
      null,
    accentColor: profileUser.accent_color ?? liveUser.accent_color ?? user.accent_color ?? null,
    avatarDecoration:
      liveUser.avatar_decoration_data ??
      profileUser.avatar_decoration_data ??
      user.avatar_decoration_data ??
      null,
    collectibles: liveUser.collectibles ?? profileUser.collectibles ?? user.collectibles ?? null,
    primaryGuild: liveUser.primary_guild ?? profileUser.primary_guild ?? user.primary_guild ?? null,
    publicFlags: liveUser.public_flags ?? user.public_flags ?? 0,
    bio: profileUser.bio ?? null,
    premiumSince: profile?.premium_since ?? null,
    premiumGuildSince: profile?.premium_guild_since ?? null,
    source: lanyardUser?.id ? 'lanyard' : 'discord',
  }

  return json(bodyData)
}
