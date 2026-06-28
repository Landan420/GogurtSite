# gogurt.pages.dev

**[gogurt.pages.dev](https://gogurt.pages.dev)** — personal bio site built and designed by landan.

---

## what is it

a fully custom bio page that pulls live data from discord and spotify to show exactly what's happening in real time. the accent color of the entire site shifts to match whatever album art is playing. the top bar fades from rainbow to that color when music kicks in. everything reacts.

built on **react + vite**, deployed on **cloudflare pages**, backed by **cloudflare d1** for persistent content and file hosting.

---

## features

- **live discord presence** — status, current activity, and devices update every 5 seconds
- **spotify sync** — now playing card with album art, progress bar, and live color extraction that shifts the whole site's theme
- **dynamic accent system** — dominant hue pulled from album art via hue histogram, animated crossfade across the entire ui
- **melt name effect** — svg turbulence filter that makes the name morph and drift like liquid
- **profile badges** — developer, invited, server booster, self-hosted
- **view setup modal** — full pc and peripherals spec list with detail tooltips on hover
- **uploads page** — file hosting with shareable links, previews for images/video/audio/code/text
- **clip trimmer** — drop a video, see the waveform, drag in/out handles, trim and download. all local, nothing uploaded. also converts between mp4, webm, gif, mp3, wav
- **songs card** — top tracks from stats.fm, click any to load it in the media player
- **media player** — custom audio player with frequency visualizer
- **games card** — live steam library pulling recent playtime
- **web stamps** — collection of internet bookmarks
- **self-hosted** — cloudflare workers handle discord/spotify proxying, otp-based admin auth for content editing

---

## stack

| thing | what |
|---|---|
| react + vite | frontend |
| cloudflare pages | hosting + edge functions |
| cloudflare d1 | database |
| cloudflare r2 | file storage |
| ffmpeg.wasm | client-side video trimming |
| web audio api | waveform + visualizer |
| lucide-react | icons |

---

## running locally

```bash
npm install
npm run dev
```

deploy:

```bash
npm run deploy
```

---

made by **landan** — [gogurt.pages.dev](https://gogurt.pages.dev)
