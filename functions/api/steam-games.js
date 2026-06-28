const FALLBACK_STEAM_ID = '76561198169143538'
const EXCLUDED_APPIDS = new Set([480]) // Spacewar + junk
const TARGET_COUNT = 8

function json(data, init = {}) {
  const headers = new Headers(init.headers)
  headers.set('content-type', 'application/json; charset=utf-8')
  headers.set('cache-control', 'public, max-age=0, s-maxage=120')
  headers.set('access-control-allow-origin', '*')
  return new Response(JSON.stringify(data), { ...init, headers })
}

async function fetchStoreImage(appid) {
  try {
    const r = await fetch(
      `https://store.steampowered.com/api/appdetails?appids=${appid}&filters=basic&cc=us&l=en`,
    )
    if (!r.ok) return null
    const d = await r.json()
    return d[String(appid)]?.success ? d[String(appid)]?.data?.header_image ?? null : null
  } catch {
    return null
  }
}

export async function onRequestGet(context) {
  const key = context.env.STEAM_API_KEY
  if (!key) return json({ error: 'Steam API key not configured.' }, { status: 500 })

  const steamId = context.env.STEAM_ID || FALLBACK_STEAM_ID

  let gamesRes
  try {
    gamesRes = await fetch(
      `https://api.steampowered.com/IPlayerService/GetRecentlyPlayedGames/v0001/?key=${key}&steamid=${steamId}&count=30&format=json`,
    )
  } catch {
    return json({ error: 'Steam API unreachable.' }, { status: 502 })
  }

  if (!gamesRes.ok) {
    return json({ error: 'Steam API failed.', status: gamesRes.status }, { status: 502 })
  }

  const gamesData = await gamesRes.json()
  const rawGames = (gamesData.response?.games || [])
    .filter((g) => !EXCLUDED_APPIDS.has(g.appid))
    .slice(0, TARGET_COUNT)

  if (rawGames.length === 0) return json({ games: [] })

  // Batch store call first
  const appids = rawGames.map((g) => g.appid).join(',')
  let storeDetails = {}
  try {
    const r = await fetch(
      `https://store.steampowered.com/api/appdetails?appids=${appids}&filters=basic&cc=us&l=en`,
    )
    if (r.ok) storeDetails = await r.json()
  } catch {}

  // For any game the batch missed, fire individual retries in parallel
  const missedIds = rawGames
    .map((g) => g.appid)
    .filter((id) => !storeDetails[String(id)]?.success)

  if (missedIds.length > 0) {
    const retries = await Promise.all(
      missedIds.map(async (id) => ({ id, url: await fetchStoreImage(id) })),
    )
    for (const { id, url } of retries) {
      if (url) storeDetails[String(id)] = { success: true, data: { header_image: url } }
    }
  }

  const games = rawGames.map((game) => {
    const detail = storeDetails[String(game.appid)]
    const headerUrl = detail?.success ? detail?.data?.header_image ?? null : null
    const iconUrl = game.img_icon_url
      ? `https://media.steampowered.com/steamcommunity/public/images/apps/${game.appid}/${game.img_icon_url}.jpg`
      : null

    return {
      appid: game.appid,
      name: game.name,
      hoursTotal: +(game.playtime_forever / 60).toFixed(1),
      hoursRecent: game.playtime_2weeks != null ? +(game.playtime_2weeks / 60).toFixed(1) : null,
      headerUrl,
      iconUrl,
    }
  })

  return json({ games })
}
