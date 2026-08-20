<div align="center">

# gogurt.pages.dev

**a bio site that reacts to whatever i'm doing.**

live discord presence · spotify-driven theming · steam library · guestbook

[![live](https://img.shields.io/badge/live-gogurt.pages.dev-9fd8ff?style=flat-square)](https://gogurt.pages.dev)
[![react](https://img.shields.io/badge/react-19-61dafb?style=flat-square&logo=react&logoColor=white)](https://react.dev)
[![vite](https://img.shields.io/badge/vite-8-646cff?style=flat-square&logo=vite&logoColor=white)](https://vite.dev)
[![cloudflare pages](https://img.shields.io/badge/cloudflare-pages-f38020?style=flat-square&logo=cloudflare&logoColor=white)](https://pages.cloudflare.com)

</div>

---

## what is it

a fully custom bio page that pulls live data from discord, spotify, stats.fm and steam to show exactly what's happening in real time.

the part i'm proudest of: **the whole site recolors itself to match the album art that's playing.** the dominant hue gets pulled out of the cover, crossfaded into a css variable, and every border, glow, bar and highlight follows it. the top bar shifts from rainbow to that color when music kicks in. stop the music and it drifts back.

react + vite on the front, cloudflare pages functions on the back, d1 for anything that needs to persist.

---

## features

### live data
- **discord presence** — status, custom status, activities and devices, polled every 5s
- **spotify sync** — now playing with album art, live progress bar, and the accent extraction that drives the site theme
- **stats.fm + last.fm** — recent tracks, top tracks, artists and genres, with a last.fm fallback when stats.fm is down
- **steam library** — recently played as a tile grid, or a ranked view that draws lifetime hours as bars with each game's capsule art inside them
- **server stats** — live member count for [.gg/gogurt](https://discord.gg/gogurt)

### on the page
- **guestbook** — visitors sign the wall and can attach a gif from imgur, tenor, giphy, discord, instagram, reddit or twitter. everything is held for approval before it appears
- **site dock** — the other sites i've built, tucked into a launcher in the bottom-left corner
- **setup modal** — full pc and peripheral spec list with per-part detail on hover
- **uploads** — file hosting with shareable raw links and inline previews for images, video, audio, code and text
- **clip trimmer** — drop a video, see its waveform, drag the in/out handles, trim and download. runs entirely in your browser, nothing gets uploaded. also converts between mp4, webm, gif, mp3 and wav
- **scroll reveal** — cards below the fold arrive as you reach them, staggered across the row

### behind the scenes
- **admin panel** — otp-over-email login, then edit the bio, name, avatar, banner, socials and status live. separate tabs for uploads and guestbook moderation
- **15 name styles** — neon, holo, glitch, chrome, blood, void, melt, fire, ice, plasma, gold, matrix, aurora, toxic, plain
- **8 particle backdrops** — dots, stars, sparkles, snow, fireflies, matrix, aurora, or none
- **border glow** — cards light up along the edge nearest your cursor, tracked on a raf loop

---

## stack

| thing | what for |
|---|---|
| react 19 + vite | frontend |
| cloudflare pages | hosting + edge functions |
| cloudflare d1 | site content, uploads, guestbook |
| ffmpeg.wasm | client-side trimming and conversion |
| web audio api | waveform rendering in the trimmer |
| dompurify | sanitising admin-authored bio html |
| lucide-react | icons |
| resend | admin login codes |

---

## layout

```
src/
  App.jsx          everything except the trimmer
  App.css          all site styling
  presence.js      album-art color extraction + accent animation
  BorderGlow.jsx   cursor-tracking edge glow used by every card
  TrimmerPage.jsx  ffmpeg.wasm trimmer / converter
functions/api/
  discord-*.js     presence, activity, server stats
  steam-games.js   recently played + playtime
  lastfm-recent.js stats.fm fallback
  guestbook.js     public read + submit
  files.js         upload listing
  raw/[name].js    direct file serving
  admin/           otp, login, content, files, guestbook moderation
```

---

## running locally

```bash
npm install
```

```bash
npm run dev
```

that gives you the ui, but **every api route will 500** — vite doesn't run the pages functions, and even under wrangler the functions need secrets that aren't in the repo. for the full thing:

```bash
npm run build && npx wrangler pages dev dist
```

then create a `.dev.vars` in the project root (it's gitignored) with the values below. without it, steam and last.fm return 500 and their cards sit empty — that's expected locally, not a bug.

### environment variables

set these as secrets on the cloudflare pages project, and in `.dev.vars` for local work.

| var | what it does |
|---|---|
| `STEAM_API_KEY` | steam web api key |
| `STEAM_ID` | steam id64 to read the library from |
| `LASTFM_API_KEY` | last.fm api key |
| `LASTFM_USER` | last.fm username |
| `DISCORD_BOT_TOKEN` | reads presence and server stats |
| `SESSION_SECRET` | signs admin sessions, salts guestbook ip hashes |
| `RESEND_API_KEY` | sends the admin login code |
| `RESEND_FROM` | address that code is sent from |
| `ADMIN_EMAIL_1..3` | addresses allowed to request a login code |
| `DISCORD_PULLS_WEBHOOK_URL` | webhook the cs2 pulls form posts to |

`VIEWS_DB` is a d1 binding, not a secret — it's declared in `wrangler.toml`. tables are created on first request, so there's no migration step.

---

## deploy

```bash
npm run deploy
```

builds and ships to cloudflare pages. pushing to github does **not** deploy — the two are separate steps.

---

<div align="center">

made by **landan** — [gogurt.pages.dev](https://gogurt.pages.dev) · [.gg/gogurt](https://discord.gg/gogurt)

</div>
