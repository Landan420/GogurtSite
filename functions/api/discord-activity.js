function json(data, init = {}) {
  const headers = new Headers(init.headers)
  headers.set('content-type', 'application/json; charset=utf-8')
  headers.set('cache-control', 'public, max-age=0, s-maxage=30')
  headers.set('access-control-allow-origin', '*')
  return new Response(JSON.stringify(data), { ...init, headers })
}

const STATUS_LABELS = {
  online: 'Online',
  idle: 'Idle',
  dnd: 'Do Not Disturb',
  offline: 'Offline',
}

function getActivityType(type) {
  if (type === 2) {
    return 'spotify'
  }

  if (type === 0) {
    return 'game'
  }

  if (type === 3) {
    return 'watching'
  }

  if (type === 5) {
    return 'competing'
  }

  return 'activity'
}

function normalizeActivity(activity) {
  return {
    id: activity.id ?? `${activity.type}-${activity.name}`,
    type: getActivityType(activity.type),
    name: activity.name,
    details: activity.details ?? null,
    state: activity.state ?? null,
    timestamps: activity.timestamps ?? null,
    assets: activity.assets ?? null,
  }
}

function normalizeWidgetActivity(member) {
  if (!member?.game?.name) {
    return []
  }

  return [
    {
      id: `widget-game-${member.game.name}`,
      type: 'game',
      name: member.game.name,
      details: null,
      state: null,
      timestamps: null,
      assets: null,
    },
  ]
}

function normalizeWidgetMember(id, member) {
  const status = member?.status ?? 'offline'

  return {
    id,
    status,
    statusLabel: STATUS_LABELS[status] ?? 'Offline',
    customStatus: null,
    activities: normalizeWidgetActivity(member),
    spotify: null,
    devices: [],
    source: 'discord_widget',
  }
}

function normalizeLanyardPayload(id, payload) {
  const data = payload?.data
  const status = data?.discord_status ?? 'offline'
  const spotify = data?.spotify
  const customStatus = Array.isArray(data?.activities)
    ? data.activities.find((activity) => activity.type === 4)?.state ?? null
    : null
  const activities = Array.isArray(data?.activities)
    ? data.activities
        .filter((activity) => activity.name && activity.name !== 'Custom Status')
        .map(normalizeActivity)
    : []

  return {
    id,
    status,
    statusLabel: STATUS_LABELS[status] ?? 'Offline',
    customStatus,
    activities,
    spotify: spotify
      ? {
          song: spotify.song,
          artist: spotify.artist,
          album: spotify.album,
          album_art_url: spotify.album_art_url,
          track_id: spotify.track_id,
          timestamps: spotify.timestamps,
        }
      : null,
    devices: [
      data?.active_on_discord_desktop ? 'desktop' : null,
      data?.active_on_discord_mobile ? 'mobile' : null,
      data?.active_on_discord_web ? 'web' : null,
    ].filter(Boolean),
    source: 'lanyard',
  }
}

function fallbackActivity(id) {
  return {
    id,
    status: 'offline',
    statusLabel: 'Offline',
    customStatus: null,
    activities: [],
    spotify: null,
    devices: [],
    source: 'fallback',
  }
}

export async function onRequestGet(context) {
  const url = new URL(context.request.url)
  const ids = [
    ...url.searchParams.getAll('id'),
    ...(url.searchParams.get('ids') ?? '').split(','),
  ]
    .map((id) => id.trim())
    .filter((id) => /^\d{17,20}$/.test(id))

  if (ids.length === 0) {
    return json({ activities: {} })
  }

  let widgetMembers = []

  try {
    const widgetResponse = await fetch(
      'https://discord.com/api/guilds/849004815110897685/widget.json',
    )
    if (widgetResponse.ok) {
      const widget = await widgetResponse.json()
      widgetMembers = Array.isArray(widget.members) ? widget.members : []
    }
  } catch {
    widgetMembers = []
  }

  const resolved = await Promise.all(
    [...new Set(ids)].map(async (id) => {
      try {
        const response = await fetch(`https://api.lanyard.rest/v1/users/${id}`)

        if (!response.ok) {
          throw new Error('Lanyard user unavailable.')
        }

        return [id, normalizeLanyardPayload(id, await response.json())]
      } catch {
        const preferredNames = [
          ...url.searchParams.getAll(`name_${id}`),
          url.searchParams.get(`label_${id}`),
        ]
          .filter(Boolean)
          .map((name) => name.toLowerCase())
        const widgetMember = widgetMembers.find((member) => {
          const username = String(member.username ?? '').toLowerCase()
          return preferredNames.includes(username)
        })

        if (widgetMember) {
          return [id, normalizeWidgetMember(id, widgetMember)]
        }

        return [id, fallbackActivity(id)]
      }
    }),
  )

  return json({ activities: Object.fromEntries(resolved) })
}
