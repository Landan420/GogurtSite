const FALLBACK_LASTFM_USER = 'Landanggrt'
const TRACK_LIMIT = 40

function json(data, init = {}) {
  const headers = new Headers(init.headers)
  headers.set('content-type', 'application/json; charset=utf-8')
  headers.set('cache-control', 'public, max-age=0, s-maxage=30')
  headers.set('access-control-allow-origin', '*')
  return new Response(JSON.stringify(data), { ...init, headers })
}

export async function onRequestGet(context) {
  const key = context.env.LASTFM_API_KEY
  if (!key) return json({ error: 'Last.fm API key not configured.' }, { status: 500 })

  const user = context.env.LASTFM_USER || FALLBACK_LASTFM_USER
  const url =
    `https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks` +
    `&user=${encodeURIComponent(user)}&api_key=${key}&format=json&limit=${TRACK_LIMIT}`

  let res
  try {
    res = await fetch(url)
  } catch {
    return json({ error: 'Last.fm unreachable.' }, { status: 502 })
  }

  if (!res.ok) {
    return json({ error: 'Last.fm request failed.', status: res.status }, { status: 502 })
  }

  const data = await res.json()
  const tracks = data.recenttracks?.track || []
  return json({ tracks })
}
