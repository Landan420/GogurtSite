import { useEffect, useMemo, useRef, useState } from 'react'
import DOMPurify from 'dompurify'
import TrimmerPage from './TrimmerPage'
import { DEFAULT_ACCENT, extractDominantColor, animateAccent, useAccentColor } from './presence'
import {
  Activity,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  CircuitBoard,
  Clock3,
  Code2,
  Cpu,
  Crown,
  Disc3,
  ExternalLink,
  Gamepad2,
  Gem,
  Globe2,
  HardDrive,
  Headphones,
  Keyboard,
  Link as LinkIcon,
  MemoryStick,
  Monitor,
  Mouse,
  Music2,
  Plus,
  RefreshCw,
  Search,
  Smartphone,
  Terminal,
  Ticket,
  Trash2,
  Upload,
  Volume2,
  X,
} from 'lucide-react'
import heroImage from './assets/hero.png'
import crewPhoto from './assets/gogurt-crew.webp'
import profileImage from './assets/profile.jpg'
import './App.css'
import BorderGlow from './BorderGlow'

const SPEC_SECTIONS = [
  {
    label: 'PC',
    items: [
      { category: 'CPU',     icon: Cpu,         name: 'Intel Core i7-13700K',              href: 'https://ark.intel.com/content/www/us/en/ark/products/230500/intel-core-i7-13700k-processor-30m-cache-up-to-5-40-ghz.html',  detail: '16 cores · 5.4 GHz boost · Raptor Lake' },
      { category: 'GPU',     icon: Gamepad2,    name: 'NVIDIA GeForce RTX 3060',           href: 'https://www.nvidia.com/en-us/geforce/graphics-cards/30-series/rtx-3060-3060ti/',                                                  detail: '3584 CUDA cores · 12GB GDDR6 · 1792 MHz' },
      { category: 'RAM',     icon: MemoryStick, name: 'G.Skill Trident Z5 32GB DDR5-6000', href: 'https://www.amazon.com/G-Skill-Trident-PC5-48000-CL36-36-36-96-F5-6000J3636F16GA2-TZ5RK/dp/B09PTGZM6Y',                         detail: '32GB · DDR5-6000 · CL36' },
      { category: 'MOBO',    icon: CircuitBoard,name: 'MSI PRO Z790-P WIFI',               href: 'https://www.msi.com/Motherboard/PRO-Z790-P-WIFI',                                                                                   detail: 'Z790 · WiFi 6E · DDR5' },
      { category: 'Drive',   icon: HardDrive,   name: 'Inland PCIe SSD 1TB',               href: 'https://www.microcenter.com/product/680085/inland-qn450-1tb-ssd-3d-qlc-nand-pcie-gen-4-x4-nvme-m2-2280-internal-solid-state-drive', detail: '1TB · PCIe Gen4 · NVMe' },
    ],
  },
  {
    label: 'Accessories',
    items: [
      { category: 'Main Monitor', icon: Monitor, name: 'Sceptre K27 27" 4K',               href: 'https://www.sceptre.com/U279W-4000RK-27-4K-UHD-Monitor-product1188.html',                                                     detail: '27" · 1920×1080 · 240Hz' },
      { category: '2nd Monitor', icon: Monitor, name: 'Acer Nitro XV240Y V 24" 165Hz',    href: 'https://www.acer.com/gb-en/monitors/gaming/nitro-xv0/pdp/UM.QX0EE.P07',                                                            detail: '24" · 1920×1080 · 165Hz' },
      { category: 'Mouse',   icon: Mouse,      name: 'Glorious Model O Pro',              href: 'https://gccgamers.com/global/product/glo-ms-ow-bl-forge',                                                                            detail: 'lightweight · wireless · optical' },
      { category: 'KB',      icon: Keyboard,   name: 'Aula F99',                          href: 'https://www.amazon.com/AULA-F99-Mechanical-Bluetooth-Swappable/dp/B0CLLHSWRL',                                                       detail: '75% · hot-swap · tri-mode' },
      { category: 'Headset', icon: Headphones, name: 'Logitech G Pro X Lightspeed',       href: 'https://www.amazon.com/Logitech-PRO-X-2-LIGHTSPEED-Wireless-Gaming-Headset/dp/B0B3F8V4JG',                                          detail: 'wireless · 50mm drivers · 20h battery' },
      { category: 'Mic',     icon: Volume2,    name: 'Shure MV7X',                        href: 'https://www.shure.com/en-US/products/microphones/mv7x?variant=MV7X',                                                                 detail: 'dynamic · XLR · cardioid' },
    ],
  },
]

function navigate(href) {
  window.location.href = href
}

const DISCORD_ID = '419739869229875211'
const BIRTHDAY    = new Date('2004-06-14T00:00:00-05:00')
const HOME_TIMEZONE = 'America/Chicago'
const SITE_LAUNCH_DATE = new Date(__SITE_LAUNCH_ISO__)
const SITE_DEPLOY_COUNT = __DEPLOY_COUNT__
const SITE_LOC_COUNT = __LOC_COUNT__
const SPOTIFY_PROFILE_URL = 'https://open.spotify.com/user/31egnorheofu6chyae74gd7tquou'
const STATS_FM_ID = 'landan420'
const STATUS_EMOJI_URL = 'https://cdn.discordapp.com/emojis/1130957016257540236.webp?size=48&quality=lossless'

const DEFAULT_BIO = `<div><h3>Who am I?</h3><p>i'm <span class="rainbow-text">Landan</span>, a hobby developer, gamer, and music enjoyer from the US.</p></div><div><h3>My Interests</h3><p>i like making sites, hanging in discord, playing CS2, collecting clips, and keeping a playlist running while i work.</p></div><div><h3>My Specs</h3></div>`

const fallbackProfile = {
  username: 'Landan',
  handle: 'landan',
  avatarUrl: profileImage,
  bannerUrl: crewPhoto,
  status: 'offline',
  customStatus: '.gg/gogurt',
  devices: [],
}

function SteamIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
      <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.605 0 11.979 0zM7.54 18.21l-1.473-.61c.262.543.714.999 1.314 1.25 1.297.539 2.793-.076 3.332-1.375.263-.63.264-1.319.005-1.949s-.75-1.121-1.377-1.383c-.624-.26-1.29-.249-1.878-.03l1.523.63c.956.4 1.409 1.498 1.009 2.455-.397.957-1.497 1.41-2.454 1.012H7.54zm11.415-9.303c0-1.662-1.353-3.015-3.015-3.015-1.665 0-3.015 1.353-3.015 3.015 0 1.665 1.35 3.015 3.015 3.015 1.663 0 3.015-1.35 3.015-3.015zm-5.273-.005c0-1.252 1.013-2.266 2.265-2.266 1.249 0 2.266 1.014 2.266 2.266 0 1.251-1.017 2.265-2.266 2.265-1.252 0-2.265-1.014-2.265-2.265z" />
    </svg>
  )
}

function InstagramIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" />
      <circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" />
    </svg>
  )
}

function SpotifyGlyph({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="11" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M6.8 15.6c3.3-1.1 6.6-.9 9.6.7M6.2 12.1c3.8-1.3 7.9-1.1 11.5.8M6 8.5c4.2-1.4 8.9-1.2 12.9.9"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  )
}

function DiscordIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M19.54 5.23A16.9 16.9 0 0 0 15.36 4c-.18.32-.39.75-.53 1.1a15.7 15.7 0 0 0-4.66 0c-.14-.35-.35-.78-.53-1.1-1.46.25-2.86.66-4.18 1.23C2.82 9.18 2.44 13.04 2.73 16.84A16.8 16.8 0 0 0 7.85 19.4c.41-.55.78-1.14 1.09-1.75-.6-.22-1.17-.49-1.7-.81.14-.1.28-.21.41-.32a12.1 12.1 0 0 0 10.7 0c.14.11.27.22.41.32-.54.32-1.1.59-1.71.81.31.61.68 1.2 1.09 1.75a16.7 16.7 0 0 0 5.13-2.56c.34-4.4-.58-8.22-3.73-11.61ZM8.84 14.49c-1 0-1.82-.91-1.82-2.03s.8-2.03 1.82-2.03c1.01 0 1.84.92 1.82 2.03 0 1.12-.81 2.03-1.82 2.03Zm6.32 0c-1 0-1.82-.91-1.82-2.03s.8-2.03 1.82-2.03c1.02 0 1.84.92 1.82 2.03 0 1.12-.8 2.03-1.82 2.03Z" />
    </svg>
  )
}

function GitHubIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  )
}

function RobloxIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M5.24 1.11L1.11 18.76 18.76 22.89 22.89 5.24 5.24 1.11zm9.42 12.43l-5.27-1.25 1.25-5.27 5.27 1.25-1.25 5.27z" />
    </svg>
  )
}

function XTwitterIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231zm-1.161 17.52h1.833L7.084 4.126H5.117l11.966 15.644z" />
    </svg>
  )
}

function YoutubeIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M23.5 6.19a3.02 3.02 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.509A3.02 3.02 0 0 0 .5 6.19C0 8.07 0 12 0 12s0 3.93.5 5.81a3.02 3.02 0 0 0 2.123 2.136c1.872.509 9.377.509 9.377.509s7.505 0 9.377-.509A3.02 3.02 0 0 0 23.5 17.81C24 15.93 24 12 24 12s0-3.93-.5-5.81zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  )
}

function TwitchIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z" />
    </svg>
  )
}

const socials = [
  { label: 'Instagram', href: 'https://instagram.com/Landanmo', icon: InstagramIcon, cls: 'social-badge--instagram' },
  { label: 'Discord', href: 'https://discord.gg/gogurt', icon: DiscordIcon, cls: 'social-badge--discord' },
  { label: 'GitHub', href: 'https://github.com/Landan420', icon: GitHubIcon, cls: 'social-badge--github' },
  { label: 'Roblox', href: 'https://www.roblox.com/users/3730395803/profile', icon: RobloxIcon, cls: 'social-badge--roblox' },
]

const SOCIAL_PLATFORMS = [
  { match: ['instagram.com'], icon: InstagramIcon, cls: 'social-badge--instagram' },
  { match: ['discord.gg', 'discord.com'], icon: DiscordIcon, cls: 'social-badge--discord' },
  { match: ['github.com'], icon: GitHubIcon, cls: 'social-badge--github' },
  { match: ['roblox.com'], icon: RobloxIcon, cls: 'social-badge--roblox' },
  { match: ['twitter.com', 'x.com'], icon: XTwitterIcon, cls: 'social-badge--twitter' },
  { match: ['youtube.com', 'youtu.be'], icon: YoutubeIcon, cls: 'social-badge--youtube' },
  { match: ['twitch.tv'], icon: TwitchIcon, cls: 'social-badge--twitch' },
  { match: ['steamcommunity.com', 'steampowered.com'], icon: SteamIcon, cls: 'social-badge--steam' },
  { match: ['spotify.com'], icon: SpotifyGlyph, cls: 'social-badge--spotify' },
  { match: ['tiktok.com'], icon: Music2, cls: 'social-badge--tiktok' },
]

function detectSocialPlatform(href) {
  let host = ''
  try { host = new URL(href).hostname.replace(/^www\./, '') } catch {}
  for (const platform of SOCIAL_PLATFORMS) {
    if (platform.match.some(d => host === d || host.endsWith(`.${d}`))) return platform
  }
  return { icon: LinkIcon, cls: 'social-badge--generic' }
}

function parseCustomSocials(raw) {
  if (!raw) return null
  try {
    const list = JSON.parse(raw)
    if (!Array.isArray(list)) return null
    const cleaned = list
      .filter(s => s && typeof s.href === 'string' && s.href.trim())
      .map(s => {
        const { icon, cls } = detectSocialPlatform(s.href)
        return { label: String(s.label || '').trim() || 'link', href: s.href.trim(), icon, cls }
      })
    return cleaned.length > 0 ? cleaned : null
  } catch { return null }
}

const recentTracks = [
  {
    title: 'Nights Like This',
    artist: 'The Kid LAROI',
    album: 'The First Time',
    minutesAgo: 8,
    plays: 42,
    vibe: 'late night',
  },
  {
    title: 'Sweet / I Thought You Wanted To Dance',
    artist: 'Tyler, The Creator',
    album: 'Call Me If You Get Lost',
    minutesAgo: 25,
    plays: 31,
    vibe: 'repeat',
  },
  {
    title: 'PRIDE.',
    artist: 'Kendrick Lamar',
    album: 'DAMN.',
    minutesAgo: 49,
    plays: 27,
    vibe: 'chill',
  },
  {
    title: 'Tek It',
    artist: 'Cafune',
    album: 'Running',
    minutesAgo: 73,
    plays: 22,
    vibe: 'floaty',
  },
  {
    title: '20 Min',
    artist: 'Lil Uzi Vert',
    album: 'Luv Is Rage 2',
    minutesAgo: 96,
    plays: 19,
    vibe: 'queue',
  },
  {
    title: 'Space Song',
    artist: 'Beach House',
    album: 'Depression Cherry',
    minutesAgo: 118,
    plays: 17,
    vibe: 'dream',
  },
]

function pad(value) {
  return String(value).padStart(2, '0')
}

function formatMs(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${pad(seconds)}`
}

function fileIcon(ext) {
  if (ext === 'lua') return '📜'
  if (['txt', 'md'].includes(ext)) return '📄'
  if (ext === 'json') return '{}'
  if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) return '🖼'
  if (['mp3', 'wav', 'ogg'].includes(ext)) return '🎵'
  return '📁'
}

function formatBytes(n) {
  if (n < 1024) return `${n}B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)}KB`
  return `${(n / (1024 * 1024)).toFixed(1)}MB`
}

function formatUploadDate(ts) {
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function previewType(ext) {
  if (['lua', 'txt', 'md', 'json', 'js', 'ts', 'css', 'html', 'xml', 'yaml', 'yml', 'sh', 'py', 'rb', 'go', 'rs', 'c', 'cpp', 'h', 'java'].includes(ext)) return 'text'
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) return 'image'
  if (['mp3', 'wav', 'ogg', 'flac', 'm4a'].includes(ext)) return 'audio'
  return 'none'
}

function decodeDataUrl(dataUrl) {
  try {
    const comma = dataUrl.indexOf(',')
    if (comma === -1) return dataUrl
    const header = dataUrl.slice(0, comma)
    const payload = dataUrl.slice(comma + 1)
    if (header.includes('base64')) {
      const binary = atob(payload)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
      return new TextDecoder().decode(bytes)
    }
    return decodeURIComponent(payload)
  } catch { return '' }
}

function formatRelativeTime(value) {
  if (!value) return ''
  const diffMs = Date.now() - new Date(value).getTime()
  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour

  if (diffMs < minute) return 'now'
  if (diffMs < hour) return `${Math.floor(diffMs / minute)}m ago`
  if (diffMs < day) return `${Math.floor(diffMs / hour)}h ago`
  return `${Math.floor(diffMs / day)}d ago`
}

function formatElapsed(startMs, nowMs) {
  const totalSeconds = Math.max(0, Math.floor((nowMs - startMs) / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  if (hours > 0) return `${hours}:${pad(minutes)}:${pad(seconds)} elapsed`
  return `${pad(minutes)}:${pad(seconds)} elapsed`
}

function normalizeStatsTrack(item, index) {
  const track = item.track ?? item
  const album = track.albums?.[0]
  const artists = track.artists?.map((artist) => artist.name).join(', ') || 'Unknown artist'
  const spotifyId = track.externalIds?.spotify?.[0]

  return {
    title: track.name || 'Unknown track',
    artist: artists,
    album: album?.name || 'Unknown album',
    image: album?.image || heroImage,
    spotifyId,
    previewUrl: track.spotifyPreview || track.appleMusicPreview || null,
    endTime: item.endTime || null,
    rank: item.position || index + 1,
    plays: item.streams,
    vibe: item.platform ? item.platform.toLowerCase() : 'spotify',
    repeatCount: 1,
  }
}

function normalizeLastfmTrack(item, index) {
  const images = item.image || []
  const image =
    images.find((img) => img.size === 'extralarge')?.['#text'] ||
    images.find((img) => img.size === 'large')?.['#text'] ||
    images[images.length - 1]?.['#text'] ||
    ''
  const nowPlaying = item['@attr']?.nowplaying === 'true'
  const endTime = item.date?.uts
    ? Number(item.date.uts) * 1000
    : nowPlaying
      ? Date.now()
      : null

  return {
    title: item.name || 'Unknown track',
    artist: item.artist?.['#text'] || item.artist?.name || 'Unknown artist',
    album: item.album?.['#text'] || 'Unknown album',
    image: image || heroImage,
    spotifyId: undefined,
    previewUrl: null,
    endTime,
    rank: index + 1,
    plays: undefined,
    vibe: nowPlaying ? 'now playing' : 'last.fm',
    repeatCount: 1,
  }
}

function normalizeStatsArtist(item, index) {
  const artist = item.artist ?? item
  const spotifyId = artist.externalIds?.spotify?.[0]
  return {
    name: artist.name || 'Unknown artist',
    image: artist.image || heroImage,
    spotifyId,
    plays: item.streams,
    rank: item.position || index + 1,
  }
}

function normalizeStatsGenre(item, index) {
  const genre = item.genre ?? item
  return {
    name: genre.tag || 'Unknown genre',
    plays: item.streams,
    rank: item.position || index + 1,
  }
}

function getTrackKey(song) {
  if (song.spotifyId) return `spotify:${song.spotifyId}`
  return `${song.title}|${song.artist}|${song.album}`.toLowerCase()
}

function collapseRepeatedSongs(songs) {
  const merged = new Map()

  songs.forEach((song) => {
    const key = getTrackKey(song)
    const existing = merged.get(key)

    if (!existing) {
      merged.set(key, { ...song, repeatCount: song.repeatCount || 1 })
      return
    }

    merged.set(key, {
      ...existing,
      repeatCount: (existing.repeatCount || 1) + (song.repeatCount || 1),
      plays:
        existing.plays || song.plays
          ? Number(existing.plays || 0) + Number(song.plays || 0)
          : undefined,
    })
  })

  return Array.from(merged.values())
}

function getExactAge(now) {
  const diff = Math.max(0, now.getTime() - BIRTHDAY.getTime())
  const years = diff / (365.2425 * 24 * 60 * 60 * 1000)
  return years.toFixed(9)
}

function getStaticAge(now) {
  let age = now.getFullYear() - BIRTHDAY.getFullYear()
  const hadBirthday =
    now.getMonth() > BIRTHDAY.getMonth() ||
    (now.getMonth() === BIRTHDAY.getMonth() && now.getDate() >= BIRTHDAY.getDate())
  return hadBirthday ? age : age - 1
}

function getSiteDaysLive(now) {
  const diff = Math.max(0, now.getTime() - SITE_LAUNCH_DATE.getTime())
  return Math.floor(diff / 86400000)
}

function getSiteDaysLiveExact(now) {
  const diff = Math.max(0, now.getTime() - SITE_LAUNCH_DATE.getTime())
  return (diff / 86400000).toFixed(6)
}

// Offset of a named timezone from UTC, in minutes, at a given instant.
function getTimezoneOffsetMinutes(timeZone, date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  }).formatToParts(date).reduce((acc, p) => { acc[p.type] = p.value; return acc }, {})
  const asUTC = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute)
  return Math.round((asUTC - date.getTime()) / 60000)
}

function getHourDiffText(now) {
  const homeOffsetMin = getTimezoneOffsetMinutes(HOME_TIMEZONE, now)
  const visitorOffsetMin = -now.getTimezoneOffset()
  const diffMin = homeOffsetMin - visitorOffsetMin
  if (Math.abs(diffMin) < 30) return "same time as you"
  const diffHours = Math.round(diffMin / 30) / 2
  const abs = Math.abs(diffHours)
  const unit = abs === 1 ? 'hour' : 'hours'
  return `${abs} ${unit} ${diffHours > 0 ? 'ahead of' : 'behind'} you`
}

function getVisitorGreeting(now) {
  const h = now.getHours()
  if (h < 5) return 'up late 🌙'
  if (h < 12) return 'good morning 👋'
  if (h < 17) return 'good afternoon 👋'
  if (h < 21) return 'good evening 👋'
  return 'good night 🌙'
}

function getStatusText(status) {
  return {
    online: 'Online',
    idle: 'Idle',
    dnd: 'Do Not Disturb',
    offline: 'Offline',
  }[status] ?? 'Offline'
}

const SCRAMBLE_CHARS = '¡™£¢∞§¶•ªº–≠œ∑´®†¥¨ˆøπ"\'«åß∂ƒ©˙∆˚¬…æ≈ç√∫˜µ≤≥÷/?`~'

function ScrambleText({ text, duration = 700 }) {
  const [display, setDisplay] = useState(text)

  useEffect(() => {
    let frame
    const start = performance.now()
    const length = text.length

    function tick(now) {
      const elapsed = now - start
      if (elapsed >= duration) {
        setDisplay(text)
        return
      }

      const revealCount = Math.floor((elapsed / duration) * length)
      let next = ''
      for (let i = 0; i < length; i += 1) {
        next +=
          i < revealCount || text[i] === ' ' || text[i] === ','
            ? text[i]
            : SCRAMBLE_CHARS.charAt(Math.floor(Math.random() * SCRAMBLE_CHARS.length))
      }
      setDisplay(next)
      frame = window.requestAnimationFrame(tick)
    }

    frame = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(frame)
  }, [text, duration])

  return <span className="scramble-text">{display}</span>
}

function HoverScramble({ text }) {
  const [display, setDisplay] = useState(text)
  const frameRef = useRef(null)

  function trigger() {
    if (frameRef.current) return
    const start = performance.now()
    const duration = 580
    const length = text.length

    function tick(now) {
      const elapsed = now - start
      if (elapsed >= duration) {
        setDisplay(text)
        frameRef.current = null
        return
      }
      const revealCount = Math.floor((elapsed / duration) * length)
      let next = ''
      for (let i = 0; i < length; i += 1) {
        next +=
          i < revealCount || text[i] === ' ' || text[i] === ','
            ? text[i]
            : SCRAMBLE_CHARS.charAt(Math.floor(Math.random() * SCRAMBLE_CHARS.length))
      }
      setDisplay(next)
      frameRef.current = window.requestAnimationFrame(tick)
    }

    frameRef.current = window.requestAnimationFrame(tick)
  }

  useEffect(() => () => { if (frameRef.current) window.cancelAnimationFrame(frameRef.current) }, [])

  return <span className="scramble-text" onMouseEnter={trigger}>{display}</span>
}

function getDeviceIcon(device) {
  if (device === 'mobile') return Smartphone
  if (device === 'desktop') return Monitor
  return Globe2
}

function getActivityImageUrl(activity) {
  const img = activity.assets?.large_image
  if (!img) return null
  if (img.startsWith('mp:external/')) {
    return `https://media.discordapp.net/external/${img.slice('mp:external/'.length)}`
  }
  if (img.startsWith('spotify:')) {
    return `https://i.scdn.co/image/${img.slice('spotify:'.length)}`
  }
  if (activity.application_id) {
    return `https://cdn.discordapp.com/app-assets/${activity.application_id}/${img}.png`
  }
  return null
}

function ActivityIcon({ activity }) {
  const [imgFailed, setImgFailed] = useState(false)
  const isSpotify = activity.type === 2 || activity.name === 'Spotify'

  if (isSpotify) {
    return (
      <span className="activity-icon-wrap activity-icon-spotify">
        <SpotifyGlyph size={16} />
      </span>
    )
  }

  const imgUrl = getActivityImageUrl(activity)
  if (imgUrl && !imgFailed) {
    return (
      <img
        className="activity-game-art"
        src={imgUrl}
        alt=""
        draggable="false"
        onError={() => setImgFailed(true)}
      />
    )
  }

  return (
    <span className="activity-icon-wrap">
      {activity.type === 0 || activity.type === 'game' ? <Gamepad2 size={16} /> : <Activity size={16} />}
    </span>
  )
}

function useClock() {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [])

  return now
}

function useDiscordPresence() {
  const [profile, setProfile] = useState(fallbackProfile)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    function applyActivity(activityData) {
      if (cancelled) return
      const activity = activityData?.activities?.[DISCORD_ID] ?? null
      setProfile((prev) => ({
        ...prev,
        status: activity?.status || 'offline',
        customStatus: activity?.customStatus || fallbackProfile.customStatus,
        spotify: activity?.spotify || null,
        activities: activity?.activities || [],
        devices: activity?.devices || [],
      }))
    }

    async function fetchFull() {
      try {
        const [profileRes, activityRes] = await Promise.allSettled([
          fetch(`/api/discord-profile?id=${DISCORD_ID}&v=bio`),
          fetch(`/api/discord-activity?id=${DISCORD_ID}&name_${DISCORD_ID}=landan`),
        ])

        const profileData =
          profileRes.status === 'fulfilled' && profileRes.value.ok
            ? await profileRes.value.json()
            : null
        const activityData =
          activityRes.status === 'fulfilled' && activityRes.value.ok
            ? await activityRes.value.json()
            : null
        const activity = activityData?.activities?.[DISCORD_ID] ?? null

        if (!cancelled) {
          setProfile({
            username: profileData?.username || fallbackProfile.username,
            handle: profileData?.handle || fallbackProfile.handle,
            avatarUrl: fallbackProfile.avatarUrl,
            bannerUrl: profileData?.bannerUrl || fallbackProfile.bannerUrl,
            status: activity?.status || 'offline',
            customStatus: activity?.customStatus || fallbackProfile.customStatus,
            spotify: activity?.spotify || null,
            activities: activity?.activities || [],
            devices: activity?.devices || [],
          })
        }
      } catch {
        if (!cancelled) setProfile(fallbackProfile)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    async function fetchActivity() {
      if (document.hidden) return
      try {
        const res = await fetch(`/api/discord-activity?id=${DISCORD_ID}&name_${DISCORD_ID}=landan`)
        if (!res.ok) return
        applyActivity(await res.json())
      } catch {}
    }

    fetchFull()
    const activityId = window.setInterval(fetchActivity, 5000)
    const fullId = window.setInterval(() => {
      if (!document.hidden) fetchFull()
    }, 60000)

    return () => {
      cancelled = true
      window.clearInterval(activityId)
      window.clearInterval(fullId)
    }
  }, [])

  return { profile, loading }
}

function useTilt(maxDeg = 2.5) {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    let enabled = false
    const timer = setTimeout(() => { enabled = true }, 1400)

    function onMove(e) {
      const rect = el.getBoundingClientRect()
      el.style.setProperty('--mx', `${(e.clientX - rect.left).toFixed(0)}px`)
      el.style.setProperty('--my', `${(e.clientY - rect.top).toFixed(0)}px`)
      if (!enabled) return
      const x = (e.clientX - rect.left) / rect.width - 0.5
      const y = (e.clientY - rect.top) / rect.height - 0.5
      el.style.transform = `perspective(900px) rotateY(${(x * maxDeg * 2).toFixed(2)}deg) rotateX(${(-y * maxDeg * 2).toFixed(2)}deg)`
    }

    function onLeave() {
      if (!enabled) return
      el.style.transform = ''
    }

    el.addEventListener('mousemove', onMove, { passive: true })
    el.addEventListener('mouseleave', onLeave)
    return () => {
      clearTimeout(timer)
      el.removeEventListener('mousemove', onMove)
      el.removeEventListener('mouseleave', onLeave)
    }
  }, [maxDeg])

  return ref
}

function useServerStats() {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const res = await fetch('/api/discord-server')
        if (!res.ok || cancelled) return
        setStats(await res.json())
      } catch {}
    }

    load()
    const id = window.setInterval(load, 5 * 60 * 1000)
    return () => { cancelled = true; window.clearInterval(id) }
  }, [])

  return stats
}

const PARTICLE_COUNT = 65

const PARTICLE_STYLES = [
  { id: 'none',      label: '— none'       },
  { id: 'dots',      label: '● dots'       },
  { id: 'stars',     label: '✦ stars'      },
  { id: 'sparkles',  label: '✧ sparkles'   },
  { id: 'snow',      label: '❄ snow'       },
  { id: 'fireflies', label: '✺ fireflies'  },
  { id: 'matrix',    label: '字 matrix'     },
  { id: 'aurora',    label: '〜 aurora'     },
]

const MATRIX_CHARS = 'アイウエオカキクケコサシスセソタチツテトナニヌネノ01'

function drawStar(ctx, x, y, r, angle) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(angle)
  ctx.beginPath()
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4
    const rad = i % 2 === 0 ? r : r * 0.42
    if (i === 0) ctx.moveTo(rad * Math.cos(a), rad * Math.sin(a))
    else ctx.lineTo(rad * Math.cos(a), rad * Math.sin(a))
  }
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

function drawSparkle(ctx, x, y, r, angle) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(angle)
  ctx.beginPath()
  ctx.moveTo(0, -r);    ctx.lineTo(0, r)
  ctx.moveTo(-r, 0);    ctx.lineTo(r, 0)
  ctx.moveTo(-r * 0.65, -r * 0.65); ctx.lineTo(r * 0.65, r * 0.65)
  ctx.moveTo(r * 0.65, -r * 0.65);  ctx.lineTo(-r * 0.65, r * 0.65)
  ctx.stroke()
  ctx.restore()
}

function ParticleCanvas({ type }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    if (type === 'none') return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let animId
    let w = window.innerWidth
    let h = window.innerHeight
    let accentR = 143, accentG = 216, accentB = 255
    let colorFrame = 0

    function resize() {
      const ratio = window.devicePixelRatio || 1
      w = window.innerWidth
      h = window.innerHeight
      canvas.width = Math.floor(w * ratio)
      canvas.height = Math.floor(h * ratio)
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize, { passive: true })

    function readAccent() {
      const v = getComputedStyle(document.documentElement).getPropertyValue('--accent-rgb') || '143,216,255'
      const parts = v.split(',')
      accentR = parseInt(parts[0].trim(), 10) || 143
      accentG = parseInt(parts[1].trim(), 10) || 216
      accentB = parseInt(parts[2].trim(), 10) || 255
    }
    readAccent()

    let particles = []
    let columns = []
    let blobs = []

    function initScene() {
      if (type === 'matrix') {
        const colWidth = 22
        columns = Array.from({ length: Math.ceil(w / colWidth) }, (_, i) => ({
          x: i * colWidth + colWidth / 2,
          y: Math.random() * h * -1.5,
          speed: Math.random() * 1.6 + 0.9,
          len: Math.floor(Math.random() * 8) + 7,
          chars: Array.from({ length: 15 }, () => MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)]),
        }))
      } else if (type === 'aurora') {
        blobs = Array.from({ length: 4 }, (_, i) => ({
          cx: Math.random(),
          cy: Math.random() * 0.7,
          radius: 0.34 + Math.random() * 0.22,
          phase: Math.random() * Math.PI * 2,
          drift: 0.0016 + Math.random() * 0.0014,
          shift: i % 3,
          alpha: 0.055 + Math.random() * 0.035,
        }))
      } else {
        const count =
          type === 'fireflies' ? 22
          : type === 'snow' ? 85
          : PARTICLE_COUNT
        particles = Array.from({ length: count }, () => ({
          x: Math.random() * w,
          y: Math.random() * h,
          r: type === 'snow' ? Math.random() * 2.1 + 0.7
            : type === 'fireflies' ? Math.random() * 1.6 + 1.2
            : Math.random() * 1.8 + 0.4,
          vx: (Math.random() - 0.5) * 0.18,
          vy: type === 'snow' ? Math.random() * 0.7 + 0.28 : -(Math.random() * 0.26 + 0.06),
          alpha: type === 'snow' ? Math.random() * 0.45 + 0.22 : Math.random() * 0.32 + 0.06,
          spin: Math.random() * Math.PI * 2,
          spinSpeed: (Math.random() - 0.5) * 0.022,
          phase: Math.random() * Math.PI * 2,
          wanderAngle: Math.random() * Math.PI * 2,
        }))
      }
    }
    initScene()

    // matrix columns depend on width — rebuild them on resize
    const baseResize = resize
    function resizeScene() {
      baseResize()
      if (type === 'matrix') initScene()
    }
    window.removeEventListener('resize', resize)
    window.addEventListener('resize', resizeScene, { passive: true })

    // aurora shifts channels for two companion hues so the glow isn't flat
    function blobColor(shift) {
      if (shift === 1) return [accentG, accentB, accentR]
      if (shift === 2) return [accentB, accentR, accentG]
      return [accentR, accentG, accentB]
    }

    function draw() {
      colorFrame++
      if (colorFrame % 90 === 0) readAccent()
      ctx.clearRect(0, 0, w, h)

      if (type === 'aurora') {
        for (const b of blobs) {
          b.phase += b.drift
          const x = (b.cx + Math.sin(b.phase) * 0.18) * w
          const y = (b.cy + Math.cos(b.phase * 0.8) * 0.14) * h
          const radius = b.radius * Math.max(w, h)
          const [r, g, bl] = blobColor(b.shift)
          const grad = ctx.createRadialGradient(x, y, 0, x, y, radius)
          grad.addColorStop(0, `rgba(${r},${g},${bl},${b.alpha})`)
          grad.addColorStop(1, `rgba(${r},${g},${bl},0)`)
          ctx.fillStyle = grad
          ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2)
        }
        animId = requestAnimationFrame(draw)
        return
      }

      if (type === 'matrix') {
        ctx.font = '13px monospace'
        ctx.textAlign = 'center'
        for (const col of columns) {
          col.y += col.speed
          const headRow = Math.floor(col.y / 16)
          for (let i = 0; i < col.len; i++) {
            const cy = (headRow - i) * 16
            if (cy < -20 || cy > h + 20) continue
            const fade = 1 - i / col.len
            if (i === 0) {
              ctx.fillStyle = `rgba(235,255,245,${0.85 * fade})`
            } else {
              ctx.fillStyle = `rgba(${accentR},${accentG},${accentB},${0.55 * fade})`
            }
            ctx.fillText(col.chars[(headRow - i + 150) % col.chars.length], col.x, cy)
          }
          if ((headRow - col.len) * 16 > h + 20) {
            col.y = Math.random() * -300
            col.speed = Math.random() * 1.6 + 0.9
          }
        }
        animId = requestAnimationFrame(draw)
        return
      }

      for (const p of particles) {
        if (type === 'fireflies') {
          p.wanderAngle += (Math.random() - 0.5) * 0.18
          p.x += Math.cos(p.wanderAngle) * 0.34
          p.y += Math.sin(p.wanderAngle) * 0.34
          p.phase += 0.025
        } else {
          p.x += p.vx + Math.sin(p.phase) * (type === 'snow' ? 0.22 : 0.07)
          p.y += p.vy
          p.spin += p.spinSpeed
          p.phase += 0.007
        }
        if (p.y < -20) { p.y = h + 10; p.x = Math.random() * w }
        if (p.y > h + 20) { p.y = -10; p.x = Math.random() * w }
        if (p.x < -20) p.x = w + 20
        if (p.x > w + 20) p.x = -20

        if (type === 'dots') {
          ctx.globalAlpha = p.alpha
          ctx.fillStyle = `rgb(${accentR},${accentG},${accentB})`
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
          ctx.fill()
        } else if (type === 'stars') {
          ctx.globalAlpha = p.alpha
          ctx.fillStyle = `rgb(${accentR},${accentG},${accentB})`
          drawStar(ctx, p.x, p.y, p.r * 2.8, p.spin)
        } else if (type === 'sparkles') {
          ctx.globalAlpha = p.alpha
          ctx.strokeStyle = `rgb(${accentR},${accentG},${accentB})`
          ctx.lineWidth = 0.85
          drawSparkle(ctx, p.x, p.y, p.r * 3.2, p.spin)
        } else if (type === 'snow') {
          ctx.globalAlpha = p.alpha
          ctx.fillStyle = `rgba(240, 246, 255, 0.95)`
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
          ctx.fill()
        } else if (type === 'fireflies') {
          const pulse = 0.35 + 0.65 * (0.5 + Math.sin(p.phase) * 0.5)
          const glowR = p.r * 6
          const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowR)
          grad.addColorStop(0, `rgba(${accentR},${accentG},${accentB},${0.5 * pulse})`)
          grad.addColorStop(1, `rgba(${accentR},${accentG},${accentB},0)`)
          ctx.globalAlpha = 1
          ctx.fillStyle = grad
          ctx.fillRect(p.x - glowR, p.y - glowR, glowR * 2, glowR * 2)
          ctx.globalAlpha = 0.9 * pulse
          ctx.fillStyle = `rgb(${accentR},${accentG},${accentB})`
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.r * 0.8, 0, Math.PI * 2)
          ctx.fill()
        }
      }
      ctx.globalAlpha = 1
      animId = requestAnimationFrame(draw)
    }

    draw()
    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resizeScene)
    }
  }, [type])

  if (type === 'none') return null
  return <canvas ref={canvasRef} className="particle-canvas" aria-hidden="true" />
}

function CopyToast({ visible, message }) {
  return (
    <div className={`copy-toast${visible ? '' : ' copy-toast--hidden'}`} aria-live="polite">
      {message}
    </div>
  )
}

function UploadsPage() {
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [viewingId, setViewingId] = useState(null)
  const [toast, setToast] = useState({ msg: '', show: false })
  const toastTimer = useRef(null)
  const { profile: discordProfile } = useDiscordPresence()

  function showToast(msg) {
    clearTimeout(toastTimer.current)
    setToast({ msg, show: true })
    toastTimer.current = setTimeout(() => setToast(t => ({ ...t, show: false })), 1800)
  }
  useAccentColor(discordProfile?.spotify?.album_art_url)

  useEffect(() => {
    fetch('/api/files').then(r => r.json()).then(setFiles).catch(() => setFiles([])).finally(() => setLoading(false))
  }, [])

  function download(file) {
    const a = document.createElement('a')
    a.href = file.data
    a.download = file.name
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  function rawUrl(file) {
    return `${window.location.origin}/api/raw/${encodeURIComponent(file.name)}`
  }

  function copyRaw(file) {
    const url = file.ext === 'lua'
      ? `loadstring(game:HttpGet("${rawUrl(file)}"))()`
      : rawUrl(file)
    navigator.clipboard.writeText(url).then(() => {
      showToast(file.ext === 'lua' ? 'loadstring copied!' : 'link copied!')
    })
  }

  return (
    <main className="bio-shell uploads-page-shell">
      <div className="top-rainbow-bar" aria-hidden="true" />
      <div className="page-backdrop" />
      <button onClick={() => navigate('/')} className="uploads-back">← back</button>
      <div className="uploads-page-content">
        <h1 className="uploads-page-title">uploads</h1>
        <p className="uploads-page-sub">files, scripts &amp; stuff</p>
        <div className="uploads-page-list">
          {loading && <p className="uploads-empty">loading…</p>}
          {!loading && files.length === 0 && <p className="uploads-empty">nothing here yet</p>}
          {files.map(f => {
            const pt = previewType(f.ext)
            const isOpen = viewingId === f.id
            return (
              <div key={f.id} className="upload-item-wrap">
                <div
                  className={`upload-item${pt !== 'none' ? ' upload-item--previewable' : ''}${isOpen ? ' upload-item--open' : ''}`}
                  onClick={pt !== 'none' ? () => setViewingId(isOpen ? null : f.id) : undefined}
                >
                  <span className="upload-item-icon">{fileIcon(f.ext)}</span>
                  <div className="upload-item-meta">
                    <span className="upload-item-name">{f.name}</span>
                    {f.description ? <span className="upload-item-desc">{f.description}</span> : null}
                    <span className="upload-item-detail">{formatBytes(f.size)} · {formatUploadDate(f.created_at)}</span>
                  </div>
                  <div className="upload-item-actions">
                    <button
                      type="button"
                      className="upload-item-copy"
                      onClick={e => { e.stopPropagation(); copyRaw(f) }}
                      title={f.ext === 'lua' ? 'Copy loadstring' : 'Copy link'}
                    >⎘</button>
                    {pt !== 'none' && <span className="upload-item-chevron" aria-hidden="true">{isOpen ? '▴' : '▾'}</span>}
                    <button type="button" className="upload-item-dl" onClick={e => { e.stopPropagation(); download(f) }} title="Download">↓</button>
                  </div>
                </div>
                {isOpen && (
                  <div className="upload-preview">
                    {pt === 'text' && <pre className="upload-preview-code"><code>{decodeDataUrl(f.data)}</code></pre>}
                    {pt === 'image' && <img className="upload-preview-img" src={f.data} alt={f.name} />}
                    {pt === 'audio' && <audio className="upload-preview-audio" controls src={f.data} />}
                    <div className="upload-preview-rawbar">
                      <span className="uprb-label">{f.ext === 'lua' ? 'exec' : 'raw'}</span>
                      <code className="uprb-url">{f.ext === 'lua' ? `loadstring(game:HttpGet("${rawUrl(f)}"))()`  : rawUrl(f)}</code>
                      <button type="button" className="uprb-copy" onClick={() => copyRaw(f)}>⎘</button>
                    </div>
                    <button type="button" className="upload-preview-dl" onClick={() => download(f)}>↓ download {f.name}</button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
      <CopyToast visible={toast.show} message={toast.msg} />
      <span className="dev-tag">made by landan</span>
    </main>
  )
}

function ProfileCard({ profile, loading, nameStyle = 'neon', customName, customHandle }) {
  const now = useClock()
  const timeText = new Intl.DateTimeFormat('en-US', {
    timeZone: HOME_TIMEZONE,
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  }).format(now)

  return (
    <div className="profile-panel">
      <div className="profile-meta-row">
        <div className="meta-badge tooltip-trigger">
          <Clock3 size={16} />
          <span>{timeText}</span>
          <span className="tooltip-box">{getHourDiffText(now)}</span>
        </div>
        <div className="meta-badge meta-badge--greeting">
          <span>{getVisitorGreeting(now)}</span>
        </div>
      </div>
      <BorderGlow
        className="card-glow-wrap profile-card-glow"
        backgroundColor="rgba(13,15,20,0.78)"
        borderRadius={8}
        disabled={loading}
      >
      <section className="profile-card">
        <img className="profile-banner" src={profile.bannerUrl || crewPhoto} alt="" draggable="false" />
        {loading ? (
          <div className="loading-overlay">
            <div className="loading-skel-row">
              <div className="skel skel--circle" style={{ width: 64, height: 64 }} />
              <div className="loading-skel-lines">
                <div className="skel" style={{ height: 17, width: 130 }} />
                <div className="skel" style={{ height: 13, width: 90 }} />
              </div>
            </div>
            <div className="skel" style={{ height: 13, width: '75%' }} />
            <div className="skel" style={{ height: 13, width: '55%' }} />
            <div className="skel" style={{ height: 13, width: '65%' }} />
          </div>
        ) : null}
        <div className="profile-main">
          <div className={`avatar-wrap${profile.spotify ? ' avatar-wrap--playing' : ''}`}>
            <img className="avatar" src={profile.avatarUrl} alt="Profile" draggable="false" />
          </div>
          <div className="name-block">
            <h1>
              <span className={`name-style-${nameStyle}`}>{customName || 'Landan'}</span>
            </h1>
            <div className="username-line">
              <span>@{customHandle || profile.handle}</span>
              <a
                className="add-profile-button"
                href={`https://discord.com/users/${DISCORD_ID}`}
                target="_blank"
                rel="noreferrer"
                aria-label="Add Landan on Discord"
              >
                <Plus size={14} />
                <span>Add</span>
              </a>
              <div className="devices">
                {profile.devices.map((device) => {
                  const Icon = getDeviceIcon(device)
                  return <Icon key={device} size={15} />
                })}
              </div>
            </div>
          </div>
        </div>
        <p className="custom-status">
          <img src={STATUS_EMOJI_URL} alt="" draggable="false" />
          <span>{profile.customStatus}</span>
          <span className="profile-badge status-owner-badge">
            <Crown size={12} />
            <span className="badge-label">Owner</span>
          </span>
        </p>
        <div className="profile-facts">
          <span className="status-fact">
            <i className={`status-dot ${profile.status}`} aria-hidden="true" />
            {getStatusText(profile.status)}
          </span>
          <span className="tooltip-trigger">
            {getStaticAge(now)} years old
            <span className="tooltip-box">{getExactAge(now)}</span>
          </span>
          <span>
            <HoverScramble text="Kansas City, MO" />
          </span>
        </div>
        <div className="profile-badges">
          <div className="profile-badge">
            <Code2 size={12} />
            <span className="badge-label">Developer</span>
          </div>
          <div className="profile-badge">
            <Ticket size={12} />
            <span className="badge-label">Invited</span>
          </div>
          <div className="profile-badge profile-badge--boost">
            <Gem size={12} />
            <span className="badge-label">Server Booster</span>
          </div>
          <div className="profile-badge profile-badge--host">
            <Terminal size={12} />
            <span className="badge-label">Self-Hosted</span>
          </div>
        </div>
        <div className="profile-site-links">
          <a href="https://ihymich.pages.dev" target="_blank" rel="noreferrer" className="site-link-pill">
            <ExternalLink size={9} />
            ihymich.pages.dev
          </a>
          <a href="https://vanillabrice.pages.dev" target="_blank" rel="noreferrer" className="site-link-pill">
            <ExternalLink size={9} />
            vanillabrice.pages.dev
          </a>
          <a href="https://floatyt.pages.dev" target="_blank" rel="noreferrer" className="site-link-pill">
            <ExternalLink size={9} />
            floatyt.pages.dev
          </a>
          <a href="https://quibbish.pages.dev" target="_blank" rel="noreferrer" className="site-link-pill">
            <ExternalLink size={9} />
            quibbish.pages.dev
          </a>        </div>
      </section>
      </BorderGlow>
    </div>
  )
}

function SpotifyCard({ spotify }) {
  const now = useClock()
  const isListening = Boolean(spotify)
  const nowMs = now instanceof Date ? now.getTime() : now
  const started = spotify?.timestamps?.start || nowMs
  const ended = spotify?.timestamps?.end || nowMs + 182000
  const progress = Math.min(100, Math.max(0, ((nowMs - started) / (ended - started)) * 100))

  return (
    <BorderGlow
      className="card-glow-wrap"
      backgroundColor="rgba(13,15,20,0.78)"
      borderRadius={8}
    >
      <section className={`spotify-card ${isListening ? '' : 'inactive'}`}>
      <Disc3 className="spotify-bg-icon" />
      <div className="section-title-row">
        <h2>What i'm playing now.</h2>
        <div className="icon-actions">
          {isListening && (
            <div className="spotify-equalizer" aria-hidden="true">
              {[
                { h: 10, dur: 820,  del: 0   },
                { h: 16, dur: 1080, del: 140 },
                { h: 7,  dur: 660,  del: 300 },
                { h: 14, dur: 940,  del: 60  },
                { h: 9,  dur: 760,  del: 220 },
                { h: 13, dur: 1020, del: 380 },
                { h: 6,  dur: 700,  del: 100 },
              ].map((b, i) => (
                <span key={i} style={{ height: b.h, animationDuration: `${b.dur}ms`, animationDelay: `${b.del}ms` }} />
              ))}
            </div>
          )}
          <a
            href={spotify?.track_id ? `https://open.spotify.com/track/${spotify.track_id}` : SPOTIFY_PROFILE_URL}
            target="_blank"
            rel="noreferrer"
            aria-label="Open in Spotify"
          >
            <ExternalLink size={16} />
          </a>
        </div>
      </div>
      <div className="spotify-body">
        <img
          className="album-art"
          src={spotify?.album_art_url || heroImage}
          alt="Album art"
          draggable="false"
        />
        <div className="spotify-info">
          <strong>{spotify?.song || 'Not Listening'}</strong>
          <span>{spotify?.artist || 'No song currently playing.'}</span>
          <small>{spotify?.album || 'Fallback playlist ready'}</small>
          <div className="progress-row">
            <span>{isListening ? formatMs(nowMs - started) : '0:00'}</span>
            <div className="progress-bar">
              <i style={{ width: `${isListening ? progress : 0}%` }} />
            </div>
            <span>{isListening ? `-${formatMs(ended - nowMs)}` : '0:00'}</span>
          </div>
        </div>
      </div>
      </section>
    </BorderGlow>
  )
}

function SpecsModal({ onClose }) {
  const [closing, setClosing] = useState(false)

  const handleClose = () => {
    if (closing) return
    setClosing(true)
    setTimeout(onClose, 210)
  }

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') handleClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [closing])

  return (
    <div
      className={`specs-overlay${closing ? ' specs-overlay--out' : ''}`}
      onMouseDown={(e) => { if (e.target === e.currentTarget) handleClose() }}
    >
      <div className={`specs-modal${closing ? ' specs-modal--out' : ''}`} onMouseDown={(e) => e.stopPropagation()}>
        <div className="specs-modal-header">
          <h2>My Setup</h2>
        </div>
        <div className="specs-sections">
          {SPEC_SECTIONS.map((section) => (
            <div key={section.label} className="specs-section">
              <div className="specs-section-label">{section.label}</div>
              <div className="specs-grid">
                {section.items.map((spec) => {
                  const Icon = spec.icon
                  return (
                    <a
                      key={spec.category + spec.name}
                      href={spec.href}
                      target="_blank"
                      rel="noreferrer"
                      className={`spec-item${spec.detail ? ' spec-item--has-detail' : ''}`}
                    >
                      <span className="spec-icon-box">
                        <Icon size={20} />
                      </span>
                      <span className="spec-info">
                        <span className="spec-category">{spec.category}</span>
                        <span className="spec-name">{spec.name}</span>
                      </span>
                      <ExternalLink size={12} className="spec-link-icon" />
                      {spec.detail && (
                        <span className="spec-detail-tip">{spec.detail}</span>
                      )}
                    </a>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function AboutCard({ onOpenSpecs, aboutBio, customSocials }) {
  const hasText = aboutBio && aboutBio.replace(/<[^>]*>/g, '').trim().length > 0
  const bioHtml = (hasText ? aboutBio : DEFAULT_BIO)
    .replace(/<div>\s*<h3>\s*My Specs\s*<\/h3>\s*<\/div>/gi, '')
    .replace(/<h3>\s*My Specs\s*<\/h3>/gi, '')
  const badgeList = useMemo(() => parseCustomSocials(customSocials) || socials, [customSocials])
  return (
    <BorderGlow
      className="card-glow-wrap"
      backgroundColor="rgba(13,15,20,0.78)"
      borderRadius={8}
    >
      <section className="section-card about-card">
      <div className="section-title-row">
        <h2>About Me</h2>
        <div className="social-badges">
          {badgeList.map(({ label, href, icon: Icon, cls }) => (
            <a key={`${label}-${href}`} href={href} target="_blank" rel="noreferrer" aria-label={label} className={`profile-badge ${cls}`}>
              <Icon size={12} />
              <span className="badge-label">{label}</span>
            </a>
          ))}
        </div>
      </div>
      <div className="about-copy">
        <div className="about-bio-text" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(bioHtml, { ALLOWED_TAGS: ['h2','h3','p','span','b','i','u','s','strong','em','ul','ol','li','blockquote','br','div'], ALLOWED_ATTR: ['class','style'] }) }} />
        <div>
          <button className="specs-btn" onClick={onOpenSpecs}>
            My Setup
          </button>
        </div>
      </div>
      </section>
    </BorderGlow>
  )
}

const SONGS_TABS = [
  { key: 'recent', label: 'Recent' },
  { key: 'top', label: 'Tracks' },
  { key: 'artists', label: 'Artists' },
  { key: 'genres', label: 'Genres' },
]

const SONGS_MODE_TITLE = {
  recent: 'Recent Streams',
  top: 'Top Streams',
  artists: 'Top Artists',
  genres: 'Top Genres',
}

function SongsCard() {
  const [mode, setMode] = useState('recent')
  const [query, setQuery] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [statsSongs, setStatsSongs] = useState([])
  const [statsArtists, setStatsArtists] = useState([])
  const [statsGenres, setStatsGenres] = useState([])
  const [statsLoading, setStatsLoading] = useState(true)
  const [statsError, setStatsError] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    let endpoint
    if (mode === 'recent') {
      endpoint = `https://api.stats.fm/api/v1/users/${STATS_FM_ID}/streams/recent`
    } else if (mode === 'top') {
      endpoint = `https://api.stats.fm/api/v1/users/${STATS_FM_ID}/top/tracks?range=lifetime`
    } else if (mode === 'artists') {
      endpoint = `https://api.stats.fm/api/v1/users/${STATS_FM_ID}/top/artists?range=lifetime`
    } else {
      endpoint = `https://api.stats.fm/api/v1/users/${STATS_FM_ID}/top/genres?range=lifetime`
    }

    setStatsLoading(true)
    setStatsError(false)

    // Last.fm fallback for the recent feed when stats.fm is down or empty.
    // The API key lives in a Cloudflare Pages secret; the function proxies it.
    async function loadLastfmRecent() {
      const response = await fetch('/api/lastfm-recent', { cache: 'no-cache' })
      if (!response.ok) throw new Error('last.fm request failed')
      const payload = await response.json()
      return (payload.tracks || []).map(normalizeLastfmTrack)
    }

    fetch(endpoint, { cache: mode === 'recent' ? 'no-cache' : 'default' })
      .then((response) => {
        if (!response.ok) throw new Error('stats.fm request failed')
        return response.json()
      })
      .then(async (payload) => {
        if (cancelled) return
        if (mode === 'artists') {
          setStatsArtists((payload.items || []).slice(0, 40).map(normalizeStatsArtist))
        } else if (mode === 'genres') {
          setStatsGenres((payload.items || []).slice(0, 40).map(normalizeStatsGenre))
        } else {
          const songs = (payload.items || []).slice(0, 40).map(normalizeStatsTrack)
          if (mode === 'recent' && songs.length === 0) {
            const lastfmSongs = await loadLastfmRecent().catch(() => [])
            if (cancelled) return
            setStatsSongs(lastfmSongs)
          } else {
            setStatsSongs(songs)
          }
        }
      })
      .catch(async () => {
        if (cancelled) return
        if (mode === 'recent') {
          try {
            const lastfmSongs = await loadLastfmRecent()
            if (cancelled) return
            if (lastfmSongs.length > 0) {
              setStatsSongs(lastfmSongs)
              return
            }
          } catch {
            // fall through to the error state below
          }
        }
        setStatsError(true)
        if (mode === 'artists') setStatsArtists([])
        else if (mode === 'genres') setStatsGenres([])
        else setStatsSongs([])
      })
      .finally(() => {
        if (!cancelled) setStatsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [mode, refreshKey])

  const songs = useMemo(() => {
    if (mode === 'artists' || mode === 'genres') return []
    const source =
      statsSongs.length > 0
        ? statsSongs
        : recentTracks.map((song, index) => ({
            ...song,
            image: heroImage,
            rank: index + 1,
            endTime: Date.now() - song.minutesAgo * 60 * 1000,
          }))
    const collapsed = collapseRepeatedSongs(source)
    const sorted =
      mode === 'top' && statsSongs.length === 0
        ? [...collapsed].sort((a, b) => b.plays - a.plays)
        : collapsed
    return sorted.filter((song) =>
      `${song.title} ${song.artist} ${song.album}`.toLowerCase().includes(query.toLowerCase()),
    )
  }, [mode, query, statsSongs])

  function refresh() {
    setRefreshing(true)
    setRefreshKey((value) => value + 1)
    window.setTimeout(() => setRefreshing(false), 650)
  }

  const isTrackMode = mode === 'recent' || mode === 'top'

  return (
    <BorderGlow
      className="card-glow-wrap songs-card-glow"
      backgroundColor="rgba(13,15,20,0.78)"
      borderRadius={8}
      disabled={statsLoading || refreshing}
    >
      <section className="section-card songs-card">
      <div className="section-title-row">
        <h2>{SONGS_MODE_TITLE[mode]}</h2>
        <div className="song-controls">
          <div className="songs-mode-tabs">
            {SONGS_TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={mode === tab.key ? 'songs-tab--active' : ''}
                onClick={() => { setMode(tab.key); setQuery('') }}
              >
                {tab.label}
              </button>
            ))}
          </div>
          {isTrackMode ? (
            <label className="search-box">
              <Search size={14} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search.." />
              {query ? (
                <button type="button" onClick={() => setQuery('')} aria-label="Clear search">
                  <X size={13} />
                </button>
              ) : null}
            </label>
          ) : null}
          <button type="button" onClick={refresh} className={refreshing ? 'spinning' : ''} aria-label="Refresh songs">
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {isTrackMode ? (
        <div className="song-list" key={mode}>
          {statsLoading ? Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="song-row song-row--skeleton" style={{ '--i': i }}>
              <div className="skel" style={{ height: 14, width: 18 }} />
              <div className="skel skel--circle" style={{ width: 44, height: 44 }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div className="skel" style={{ height: 13, width: `${55 + i * 7}%` }} />
                <div className="skel" style={{ height: 11, width: `${30 + i * 5}%` }} />
              </div>
              <div className="skel" style={{ height: 12, width: 38 }} />
              <div className="skel" style={{ height: 12, width: 54 }} />
            </div>
          )) : null}
          {statsError && !statsLoading ? <div className="song-empty">stats.fm unavailable. Showing fallback songs.</div> : null}
          {songs.map((song, index) => (
            <article key={`${song.title}-${song.endTime || song.rank || index}`} className="song-row">
              <div className="song-index">{pad(index + 1)}</div>
              <div className="song-art-wrap">
                <img className="song-art" src={song.image || heroImage} alt="" draggable="false" loading="lazy" />
              </div>
              <div>
                <div className="song-title-line">
                  {song.spotifyId ? (
                    <a href={`https://open.spotify.com/track/${song.spotifyId}`} target="_blank" rel="noreferrer">
                      <strong>{song.title}</strong>
                    </a>
                  ) : (
                    <strong>{song.title}</strong>
                  )}
                  {song.repeatCount > 1 ? <b className="repeat-count">x{song.repeatCount}</b> : null}
                </div>
                <span>
                  {song.artist} - {song.album}
                </span>
              </div>
              <small>
                {mode === 'recent'
                  ? formatRelativeTime(song.endTime)
                  : song.plays
                    ? `${song.plays} plays`
                    : `#${song.rank}`}
              </small>
              <em title={song.vibe}>
                <SpotifyGlyph size={18} />
              </em>
            </article>
          ))}
        </div>
      ) : null}

      {mode === 'artists' ? (
        <div className="song-list" key="artists">
          {statsLoading ? Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="song-row song-row--skeleton" style={{ '--i': i }}>
              <div className="skel" style={{ height: 14, width: 18 }} />
              <div className="skel skel--circle" style={{ width: 44, height: 44 }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div className="skel" style={{ height: 13, width: `${55 + i * 7}%` }} />
              </div>
              <div className="skel" style={{ height: 12, width: 54 }} />
            </div>
          )) : null}
          {statsError && !statsLoading ? <div className="song-empty">stats.fm unavailable.</div> : null}
          {statsArtists.map((artist, index) => (
            <article key={artist.name} className="song-row">
              <div className="song-index">{pad(index + 1)}</div>
              <div className="song-art-wrap">
                <img className="song-art" src={artist.image || heroImage} alt="" draggable="false" loading="lazy" />
              </div>
              <div>
                <div className="song-title-line">
                  {artist.spotifyId ? (
                    <a href={`https://open.spotify.com/artist/${artist.spotifyId}`} target="_blank" rel="noreferrer">
                      <strong>{artist.name}</strong>
                    </a>
                  ) : (
                    <strong>{artist.name}</strong>
                  )}
                </div>
              </div>
              <small>{artist.plays ? `${artist.plays.toLocaleString()} plays` : `#${artist.rank}`}</small>
              <em><SpotifyGlyph size={18} /></em>
            </article>
          ))}
        </div>
      ) : null}

      {mode === 'genres' ? (
        <div className="genre-grid" key="genres">
          {statsLoading ? Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="skel" style={{ width: `${60 + (i % 4) * 20}px`, height: 32, borderRadius: 20 }} />
          )) : null}
          {statsError && !statsLoading ? <div className="song-empty">stats.fm unavailable.</div> : null}
          {statsGenres.map((genre, index) => (
            <div key={genre.name} className="genre-pill">
              <span className="genre-rank">{pad(index + 1)}</span>
              <span className="genre-name">{genre.name}</span>
              {genre.plays ? <span className="genre-plays">{genre.plays.toLocaleString()}</span> : null}
            </div>
          ))}
        </div>
      ) : null}
      </section>
    </BorderGlow>
  )
}

function ActivitiesCard({ activities, serverStats }) {
  const visible = (activities || []).filter(
    (a) => a.type !== 4 && a.name !== 'Custom Status',
  )

  return (
    <BorderGlow
      className="card-glow-wrap"
      backgroundColor="rgba(13,15,20,0.78)"
      borderRadius={8}
    >
      <section className="mini-card">
      <div className="mini-card-header">
        <h2>Current Activities</h2>
        {serverStats?.onlineCount != null && (
          <a
            className="server-pill"
            href="https://discord.gg/gogurt"
            target="_blank"
            rel="noreferrer"
          >
            <i className="status-dot online" aria-hidden="true" />
            {serverStats.onlineCount.toLocaleString()} online
          </a>
        )}
      </div>
      <div className="activity-list">
        {visible.slice(0, 3).map((activity) => (
          <div key={`${activity.name}-${activity.created_at || activity.id}`} className="activity-row">
            <ActivityIcon activity={activity} />
            <span>
              <strong>{activity.name}</strong>
              <small>
                {activity.details || activity.state ||
                  (activity.timestamps?.start
                    ? formatElapsed(activity.timestamps.start, Date.now())
                    : 'active now')}
              </small>
            </span>
          </div>
        ))}
        {visible.length === 0 && (
          <div className="activity-row activity-row--empty">
            <Headphones size={18} />
            <span>
              <strong>Nothing public right now</strong>
              <small>check back later</small>
            </span>
          </div>
        )}
      </div>
      </section>
    </BorderGlow>
  )
}


function useRecentGames() {
  const [games, setGames] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetch('/api/steam-games')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled) {
          setGames((data?.games || []).filter((g) => g.appid !== 480 && !/spacewar/i.test(g.name || '')))
          setLoading(false)
        }
      })
      .catch(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  return { games, loading }
}

function GameImage({ headerUrl, appid, iconUrl, name }) {
  const [idx, setIdx] = useState(0)

  const urls = [
    headerUrl,
    `https://cdn.cloudflare.steamstatic.com/steam/apps/${appid}/header.jpg`,
    `https://cdn.akamai.steamstatic.com/steam/apps/${appid}/header.jpg`,
    `https://steamcdn-a.akamaihd.net/steam/apps/${appid}/header.jpg`,
    `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${appid}/header.jpg`,
    iconUrl,
  ].filter(Boolean)

  if (idx >= urls.length) return <div className="game-img-missing" />

  return (
    <img
      key={urls[idx]}
      src={urls[idx]}
      alt={name}
      draggable="false"
      loading="lazy"
      onError={() => setIdx((i) => i + 1)}
    />
  )
}

const GAMES_PER_PAGE = 4

function GamesCard() {
  const { games, loading } = useRecentGames()
  const [page, setPage] = useState(0)

  const pageChunks = useMemo(() => {
    const chunks = []
    for (let i = 0; i < games.length; i += GAMES_PER_PAGE) {
      chunks.push(games.slice(i, i + GAMES_PER_PAGE))
    }
    return chunks
  }, [games])

  const pageCount = Math.max(1, pageChunks.length)
  const clampedPage = Math.min(page, pageCount - 1)

  return (
    <BorderGlow
      className="card-glow-wrap games-card-glow"
      backgroundColor="rgba(13,15,20,0.78)"
      borderRadius={8}
      disabled={loading}
    >
      <section className="section-card games-card">
      <div className="section-title-row">
        <h2>Recently Played</h2>
        <div className="icon-actions">
          {pageCount > 1 ? (
            <>
              <button
                type="button"
                onClick={() => setPage(Math.max(0, clampedPage - 1))}
                disabled={clampedPage === 0}
                aria-label="Previous games"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="games-page-dots" aria-hidden="true">
                {Array.from({ length: pageCount }).map((_, i) => (
                  <i key={i} className={i === clampedPage ? 'active' : ''} />
                ))}
              </span>
              <button
                type="button"
                onClick={() => setPage(Math.min(pageCount - 1, clampedPage + 1))}
                disabled={clampedPage === pageCount - 1}
                aria-label="Next games"
              >
                <ChevronRight size={16} />
              </button>
            </>
          ) : null}
          <a
            href="https://steamcommunity.com/profiles/76561198169143538"
            target="_blank"
            rel="noreferrer"
            aria-label="Steam profile"
          >
            <SteamIcon size={16} />
          </a>
        </div>
      </div>
      {loading ? (
        <div className="games-grid">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="game-tile game-tile--skeleton" />
          ))}
        </div>
      ) : games.length === 0 ? (
        <div className="song-empty">No recently played games.</div>
      ) : (
        <div className="games-viewport">
          <div className="games-track" style={{ transform: `translateX(-${clampedPage * 100}%)` }}>
            {pageChunks.map((chunk, i) => (
              <div key={i} className="games-grid games-grid--page">
                {chunk.map((game) => (
                  <a
                    key={game.appid}
                    className="game-tile"
                    href={`https://store.steampowered.com/app/${game.appid}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <GameImage headerUrl={game.headerUrl} appid={game.appid} iconUrl={game.iconUrl} name={game.name} />
                    <div className="game-overlay">
                      <strong>{game.name}</strong>
                      <span>{game.hoursTotal.toLocaleString()} hrs total</span>
                      {game.hoursRecent != null && (
                        <small>{game.hoursRecent} hrs past 2 weeks</small>
                      )}
                    </div>
                  </a>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
      </section>
    </BorderGlow>
  )
}

const NAME_STYLES = [
  { id: 'neon',   label: 'Neon'   },
  { id: 'holo',   label: 'Holo'   },
  { id: 'glitch', label: 'Glitch' },
  { id: 'chrome', label: 'Chrome' },
  { id: 'blood',  label: 'Blood'  },
  { id: 'void',   label: 'Void'   },
  { id: 'melt',   label: 'Melt'   },
  { id: 'fire',   label: 'Fire'   },
  { id: 'ice',    label: 'Ice'    },
  { id: 'plasma', label: 'Plasma' },
  { id: 'gold',   label: 'Gold'   },
  { id: 'matrix', label: 'Matrix' },
  { id: 'aurora', label: 'Aurora' },
  { id: 'toxic',  label: 'Toxic'  },
  { id: 'plain',  label: 'Plain'  },
]

const RTE_TOOLS = [
  { cmd: 'bold',               label: 'B',  title: 'Bold',          style: { fontWeight: 700 } },
  { cmd: 'italic',             label: 'I',  title: 'Italic',        style: { fontStyle: 'italic' } },
  { cmd: 'underline',          label: 'U',  title: 'Underline',     style: { textDecoration: 'underline' } },
  { cmd: 'strikeThrough',      label: 'S',  title: 'Strikethrough', style: { textDecoration: 'line-through' } },
  'sep',
  { cmd: 'justifyLeft',        label: '⇐', title: 'Align left'  },
  { cmd: 'justifyCenter',      label: '≡', title: 'Center'      },
  { cmd: 'justifyRight',       label: '⇒', title: 'Align right' },
  'sep',
  { cmd: 'formatBlock', arg: 'h2',         label: 'H2', title: 'Heading'    },
  { cmd: 'formatBlock', arg: 'h3',         label: 'H3', title: 'Subheading' },
  { cmd: 'formatBlock', arg: 'p',          label: '¶',  title: 'Paragraph'  },
  { cmd: 'formatBlock', arg: 'blockquote', label: '"',  title: 'Quote'      },
  'sep',
  { cmd: 'insertUnorderedList', label: '•—', title: 'Bullet list'   },
  { cmd: 'insertOrderedList',   label: '1—', title: 'Numbered list' },
  'sep',
  { cmd: 'removeFormat', label: '✕', title: 'Clear formatting' },
]

const RTE_EFFECTS = [
  { cls: 'rainbow-text',        label: '🌈', title: 'Rainbow'                    },
  { cls: 'name-style-neon',     label: '⚡', title: 'Neon'                      },
  { cls: 'name-style-holo',     label: '✦',  title: 'Holo',   size: '18px'      },
  { cls: 'name-style-glitch',   label: '▓',  title: 'Glitch', size: '10px'      },
  { cls: 'name-style-fire',     label: '🔥', title: 'Fire'                      },
  { cls: 'name-style-ice',      label: '❄',  title: 'Ice',    size: '18px'      },
  { cls: 'name-style-chrome',   label: '◈',  title: 'Chrome', size: '18px'      },
  { cls: 'name-style-aurora',   label: '◉',  title: 'Aurora', size: '18px'      },
  { cls: 'name-style-blood',    label: '🩸', title: 'Blood'                     },
  { cls: 'name-style-void',     label: '🌑', title: 'Void'                      },
  { cls: 'name-style-melt',     label: '💧', title: 'Melt'                      },
  { cls: 'name-style-plasma',   label: '🔮', title: 'Plasma'                    },
  { cls: 'name-style-gold',     label: '👑', title: 'Gold'                      },
  { cls: 'name-style-matrix',   label: '🟩', title: 'Matrix'                    },
  { cls: 'name-style-toxic',    label: '☣',  title: 'Toxic',  size: '16px'      },
  { cls: 'fx-shimmer',          label: '✨', title: 'Shimmer'                   },
  { cls: 'fx-glow',             label: '💡', title: 'Glow'                      },
  { cls: 'fx-flicker',          label: '🕯',  title: 'Flicker', size: '16px'     },
  { cls: 'fx-sunset',           label: '🌅', title: 'Sunset gradient'           },
  { cls: 'fx-ocean',            label: '🌊', title: 'Ocean gradient'            },
  { cls: 'fx-candy',            label: '🍬', title: 'Candy gradient'            },
  { cls: 'fx-outline',          label: '◻',  title: 'Outline', size: '16px'     },
  { cls: 'fx-pop',              label: '3D', title: '3D pop',  size: '11px'     },
  { cls: 'fx-shake',            label: '🫨', title: 'Shake'                     },
  { cls: 'fx-spoiler',          label: '🫥', title: 'Spoiler (hover to reveal)' },
]

const RTE_EFFECT_CLASSES = RTE_EFFECTS.map(fx => fx.cls)

function RichBioEditor({ value, onChange }) {
  const editorRef = useRef(null)
  const skipSync = useRef(false)

  useEffect(() => {
    const el = editorRef.current
    if (!el || skipSync.current) return
    if (el.innerHTML !== (value || '')) el.innerHTML = value || ''
  }, [value])

  function exec(cmd, arg = null) {
    editorRef.current?.focus()
    document.execCommand(cmd, false, arg)
    skipSync.current = true
    onChange(editorRef.current.innerHTML)
    setTimeout(() => { skipSync.current = false }, 0)
  }

  function commitHtml() {
    skipSync.current = true
    onChange(editorRef.current.innerHTML)
    setTimeout(() => { skipSync.current = false }, 0)
  }

  function unwrapSpan(span) {
    const parent = span.parentNode
    while (span.firstChild) parent.insertBefore(span.firstChild, span)
    parent.removeChild(span)
    parent.normalize()
  }

  function applyEffect(cls) {
    const root = editorRef.current
    root?.focus()
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return
    const range = sel.getRangeAt(0)
    if (!root.contains(range.commonAncestorContainer)) return

    // Toggle off: selection sits inside a span with this class
    let node = range.commonAncestorContainer
    if (node.nodeType === Node.TEXT_NODE) node = node.parentElement
    for (let cursor = node; cursor && cursor !== root; cursor = cursor.parentElement) {
      if (cursor.tagName === 'SPAN' && cursor.classList.contains(cls)) {
        unwrapSpan(cursor)
        sel.removeAllRanges()
        commitHtml()
        return
      }
    }

    // Toggle off: selection contains spans with this class
    const contained = [...root.querySelectorAll(`span.${CSS.escape(cls)}`)].filter(s => range.intersectsNode(s))
    if (contained.length > 0) {
      contained.forEach(unwrapSpan)
      sel.removeAllRanges()
      commitHtml()
      return
    }

    // Wrap each selected text segment separately so block boundaries stay
    // intact (no stray rows), trimming whitespace off the edges so effects
    // never swallow blank space.
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
    const targets = []
    for (let textNode = walker.nextNode(); textNode; textNode = walker.nextNode()) {
      if (!range.intersectsNode(textNode)) continue
      const text = textNode.textContent
      let start = textNode === range.startContainer ? range.startOffset : 0
      let end = textNode === range.endContainer ? range.endOffset : text.length
      while (start < end && /\s/.test(text[start])) start++
      while (end > start && /\s/.test(text[end - 1])) end--
      if (start < end) targets.push({ textNode, start, end })
    }
    for (const { textNode, start, end } of targets) {
      const segment = document.createRange()
      segment.setStart(textNode, start)
      segment.setEnd(textNode, end)
      const span = document.createElement('span')
      span.className = cls
      segment.surroundContents(span)
    }
    sel.removeAllRanges()
    commitHtml()
  }

  function clearEffects() {
    const root = editorRef.current
    root?.focus()
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0) return
    const range = sel.getRangeAt(0)
    if (!root.contains(range.commonAncestorContainer)) return
    const spans = [...root.querySelectorAll('span')].filter(s =>
      RTE_EFFECT_CLASSES.some(c => s.classList.contains(c)) &&
      (range.intersectsNode(s) || s.contains(range.commonAncestorContainer)),
    )
    if (spans.length === 0) return
    spans.forEach(unwrapSpan)
    sel.removeAllRanges()
    commitHtml()
  }

  function onInput() {
    skipSync.current = true
    onChange(editorRef.current.innerHTML)
    setTimeout(() => { skipSync.current = false }, 0)
  }

  return (
    <div className="rte-wrap">
      <div className="rte-toolbar">
        {RTE_TOOLS.map((tool, i) => {
          if (tool === 'sep') return <div key={i} className="rte-sep" />
          return (
            <button
              key={tool.cmd + (tool.arg || '')}
              type="button"
              title={tool.title}
              style={tool.style}
              onMouseDown={e => { e.preventDefault(); exec(tool.cmd, tool.arg || null) }}
            >
              {tool.label}
            </button>
          )
        })}
      </div>
      <div className="rte-toolbar rte-toolbar--effects">
        <span className="rte-effects-label">fx</span>
        {RTE_EFFECTS.map(fx => (
          <button
            key={fx.cls}
            type="button"
            title={fx.title}
            className="rte-effect-btn"
            style={fx.size ? { fontSize: fx.size } : undefined}
            onMouseDown={e => { e.preventDefault(); applyEffect(fx.cls) }}
          >
            {fx.label}
          </button>
        ))}
        <button
          type="button"
          title="Remove all effects from selection"
          className="rte-effect-btn rte-effect-btn--clear"
          onMouseDown={e => { e.preventDefault(); clearEffects() }}
        >
          ✕fx
        </button>
      </div>
      <div
        ref={editorRef}
        className="rte-body"
        contentEditable
        onInput={onInput}
        suppressContentEditableWarning
        data-placeholder="say something…"
      />
    </div>
  )
}

function resizeImageFile(file, maxW, maxH) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      let w = img.naturalWidth, h = img.naturalHeight
      const ratio = Math.min(maxW / w, maxH / h, 1)
      w = Math.round(w * ratio)
      h = Math.round(h * ratio)
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      canvas.getContext('2d').drawImage(img, 0, 0, w, h)
      resolve(canvas.toDataURL('image/jpeg', 0.85))
    }
    img.onerror = reject
    img.src = url
  })
}

function ImageUploadField({ label, value, onChange, maxW = 800, maxH = 400 }) {
  const fileRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const isDataUrl = value?.startsWith('data:')

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try { onChange(await resizeImageFile(file, maxW, maxH)) } catch {}
    setUploading(false)
    e.target.value = ''
  }

  return (
    <div className="admin-field">
      {label && <span>{label}</span>}
      {isDataUrl && <img className="img-upload-thumb" src={value} alt="" />}
      <div className="img-upload-row">
        {isDataUrl
          ? <span className="img-upload-info">uploaded image</span>
          : <input className="admin-input" type="url" placeholder="https://…" value={value || ''} onChange={e => onChange(e.target.value)} />
        }
        <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
        <button type="button" className="admin-btn admin-btn--sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
          {uploading ? '…' : '↑ upload'}
        </button>
        {value && <button type="button" className="admin-clear-btn" onClick={() => onChange('')} title="Clear">✕</button>}
      </div>
    </div>
  )
}

function useSiteContent() {
  const [content, setContent] = useState({})
  useEffect(() => {
    fetch('/api/admin/content')
      .then(r => r.ok ? r.json() : {})
      .then(setContent)
      .catch(() => {})
  }, [])
  return content
}

function AdminNav({ active }) {
  return (
    <div className="admin-nav">
      <span className="admin-nav-label">admin</span>
      <button
        className={`admin-nav-tab${active === 'editor' ? ' active' : ''}`}
        onClick={() => navigate('/admin')}
      >editor</button>
      <button
        className={`admin-nav-tab${active === 'uploads' ? ' active' : ''}`}
        onClick={() => navigate('/admin/uploads')}
      >uploads</button>
    </div>
  )
}

function AdminUploadsPanel() {
  const [verified, setVerified] = useState(false)
  const [files, setFiles] = useState([])
  const [uploadDesc, setUploadDesc] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const uploadInputRef = useRef(null)
  const { profile: discordProfile } = useDiscordPresence()
  useAccentColor(discordProfile?.spotify?.album_art_url)

  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    if (!token) { navigate('/admin'); return }
    fetch('/api/admin/content', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => {
        if (!r.ok) { localStorage.removeItem('admin_token'); navigate('/admin') }
        else setVerified(true)
      })
      .catch(() => navigate('/admin'))
  }, [])

  useEffect(() => {
    if (!verified) return
    fetch('/api/files').then(r => r.json()).then(setFiles).catch(() => {})
  }, [verified])

  async function handleUploadFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const token = localStorage.getItem('admin_token')
    setUploading(true); setUploadError('')
    const desc = uploadDesc
    const reader = new FileReader()
    reader.onload = async (ev) => {
      const ext = file.name.includes('.') ? file.name.split('.').pop().toLowerCase() : ''
      try {
        const res = await fetch('/api/admin/files', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ name: file.name, ext, description: desc, data: ev.target.result, size: file.size }),
        })
        if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || `Upload failed (${res.status})`) }
        const { id } = await res.json()
        setFiles(prev => [{ id, name: file.name, ext, description: desc, size: file.size, created_at: Date.now() }, ...prev])
        setUploadDesc('')
      } catch (err) { setUploadError(err.message || 'Upload failed') }
      setUploading(false); e.target.value = ''
    }
    reader.readAsDataURL(file)
  }

  async function deleteUpload(id) {
    const token = localStorage.getItem('admin_token')
    await fetch(`/api/admin/files?id=${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
    setFiles(prev => prev.filter(f => f.id !== id))
  }

  function logout() {
    const token = localStorage.getItem('admin_token')
    fetch('/api/admin/logout', { method: 'POST', headers: { Authorization: `Bearer ${token}` } }).catch(() => {})
    localStorage.removeItem('admin_token')
    navigate('/admin')
  }

  if (!verified) {
    return (
      <div className="admin-shell">
        <div className="top-rainbow-bar" aria-hidden="true" />
        <div className="page-backdrop" />
        <p className="admin-checking">checking session…</p>
      </div>
    )
  }

  return (
    <div className="admin-shell">
      <div className="top-rainbow-bar" aria-hidden="true" />
      <div className="page-backdrop" />
      <AdminNav active="uploads" />
      <div className="admin-panel admin-panel--wide">
        <div className="admin-panel-header">
          <h2 className="admin-panel-title"><button onClick={() => navigate('/')} className="admin-site-link">site</button> uploads</h2>
          <button type="button" className="admin-back" onClick={logout}>logout</button>
        </div>

        <div className="admin-fields">
          {files.length > 0 && (
            <div className="admin-upload-list">
              {files.map(f => (
                <div key={f.id} className="admin-upload-item">
                  <span className="aui-icon">{fileIcon(f.ext)}</span>
                  <div className="aui-meta">
                    <span className="aui-name">{f.name}</span>
                    <span className="aui-detail">{formatBytes(f.size)} · {formatUploadDate(f.created_at)}</span>
                    {f.description ? <span className="aui-desc">{f.description}</span> : null}
                  </div>
                  <button type="button" className="admin-clear-btn" onClick={() => deleteUpload(f.id)} title="Remove">✕</button>
                </div>
              ))}
            </div>
          )}
          {files.length === 0 && <p className="admin-hint">no uploads yet</p>}

          {uploadError && <p className="admin-upload-error">{uploadError}</p>}
          <div className="admin-upload-row">
            <input
              className="admin-input"
              type="text"
              placeholder="description (optional)"
              value={uploadDesc}
              onChange={e => setUploadDesc(e.target.value)}
            />
            <input ref={uploadInputRef} type="file" style={{ display: 'none' }} onChange={handleUploadFile} />
            <button type="button" className="admin-btn admin-btn--sm" onClick={() => uploadInputRef.current?.click()} disabled={uploading}>
              {uploading ? '…' : '↑ upload file'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function SocialsEditor({ value, onChange }) {
  const rows = (() => {
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) return parsed
    } catch {}
    return socials.map(({ label, href }) => ({ label, href }))
  })()

  function commit(next) { onChange(JSON.stringify(next)) }
  function setRow(i, field, val) { commit(rows.map((r, idx) => (idx === i ? { ...r, [field]: val } : r))) }
  function move(i, dir) {
    const j = i + dir
    if (j < 0 || j >= rows.length) return
    const next = [...rows]
    ;[next[i], next[j]] = [next[j], next[i]]
    commit(next)
  }
  function remove(i) { commit(rows.filter((_, idx) => idx !== i)) }
  function add() { commit([...rows, { label: '', href: '' }]) }

  return (
    <div className="socials-editor">
      {rows.map((row, i) => {
        const { icon: Icon } = detectSocialPlatform(row.href || '')
        return (
          <div key={i} className="socials-editor-row">
            <span className="socials-editor-icon"><Icon size={14} /></span>
            <input
              className="admin-input"
              type="text"
              placeholder="label"
              value={row.label || ''}
              onChange={e => setRow(i, 'label', e.target.value)}
            />
            <input
              className="admin-input"
              type="text"
              placeholder="https://…"
              value={row.href || ''}
              onChange={e => setRow(i, 'href', e.target.value)}
            />
            <button type="button" className="socials-editor-btn" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up">
              <ArrowUp size={13} />
            </button>
            <button type="button" className="socials-editor-btn" onClick={() => move(i, 1)} disabled={i === rows.length - 1} aria-label="Move down">
              <ArrowDown size={13} />
            </button>
            <button type="button" className="socials-editor-btn socials-editor-btn--danger" onClick={() => remove(i)} aria-label="Remove">
              <Trash2 size={13} />
            </button>
          </div>
        )
      })}
      <button type="button" className="admin-btn admin-btn--sm" onClick={add}>+ add social</button>
    </div>
  )
}

function AdminPanel() {
  const [step, setStep] = useState(() => localStorage.getItem('admin_token') ? 'check' : 'email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [otpToken, setOtpToken] = useState('')
  const [remember, setRemember] = useState(true)
  const [token, setToken] = useState(() => localStorage.getItem('admin_token') || '')
  const [content, setContent] = useState({
    custom_status: '', location: '', about_bio: '',
    custom_name: '', custom_handle: '', ascii_comment: '', name_style: 'neon',
    custom_avatar_url: '', custom_banner_url: '',
    particles: 'dots', socials: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const { profile: discordProfile } = useDiscordPresence()
  const spotify = discordProfile?.spotify
  const now = useClock()
  useAccentColor(spotify?.album_art_url)

  useEffect(() => {
    if (step !== 'check' || !token) return
    fetch('/api/admin/content', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) { setContent(c => ({ ...c, ...data })); setStep('panel') }
        else { localStorage.removeItem('admin_token'); setToken(''); setStep('email') }
      })
      .catch(() => setStep('email'))
  }, [step, token])

  async function requestOtp(e) {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/admin/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (data.otpToken) setOtpToken(data.otpToken)
      setStep('otp')
    } catch { setError('Request failed.') }
    setLoading(false)
  }

  async function verifyOtp(e) {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, otpToken, remember }),
      })
      const data = await res.json()
      if (data.token) {
        localStorage.setItem('admin_token', data.token)
        setToken(data.token)
        const c = await fetch('/api/admin/content').then(r => r.json()).catch(() => ({}))
        setContent(prev => ({ ...prev, ...c }))
        setStep('panel')
      } else {
        setError(data.error || 'Invalid code.')
      }
    } catch { setError('Request failed.') }
    setLoading(false)
  }

  async function save(e) {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/admin/content', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(content),
      })
      if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 2500) }
      else if (res.status === 401) { localStorage.removeItem('admin_token'); setStep('email') }
      else {
        const data = await res.json().catch(() => ({}))
        setError(data.error || `Save failed (${res.status}).`)
      }
    } catch { setError('Save failed — network error.') }
    setLoading(false)
  }

  async function logout() {
    await fetch('/api/admin/logout', { method: 'POST', headers: { Authorization: `Bearer ${token}` } }).catch(() => {})
    localStorage.removeItem('admin_token')
    setToken(''); setStep('email')
  }

  if (step === 'check') {
    return (
      <div className="admin-shell">
        <div className="top-rainbow-bar" aria-hidden="true" />
        <div className="page-backdrop" />
        <p className="admin-checking">checking session…</p>
      </div>
    )
  }

  if (step === 'email') {
    return (
      <div className="admin-shell">
        <div className="top-rainbow-bar" aria-hidden="true" />
        <div className="page-backdrop" />
        <form className="admin-form" onSubmit={requestOtp}>
          <h1 className="admin-title">_</h1>
          <input
            className="admin-input"
            type="email"
            placeholder="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoComplete="off"
          />
          {error && <p className="admin-error">{error}</p>}
          <button className="admin-btn" type="submit" disabled={loading}>
            {loading ? '…' : 'continue'}
          </button>
        </form>
      </div>
    )
  }

  if (step === 'otp') {
    return (
      <div className="admin-shell">
        <div className="top-rainbow-bar" aria-hidden="true" />
        <div className="page-backdrop" />
        <form className="admin-form" onSubmit={verifyOtp}>
          <h1 className="admin-title">_</h1>
          <p className="admin-hint">check your email for a 6-digit code</p>
          <input
            className="admin-input admin-input--code"
            type="text"
            inputMode="numeric"
            placeholder="000000"
            maxLength={6}
            value={code}
            onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
            required
            autoComplete="one-time-code"
          />
          {error && <p className="admin-error">{error}</p>}
          <label className="admin-remember">
            <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} />
            keep me logged in for 30 days
          </label>
          <button className="admin-btn" type="submit" disabled={loading}>
            {loading ? '…' : 'verify'}
          </button>
          <button className="admin-back" type="button" onClick={() => { setStep('email'); setCode(''); setError('') }}>
            ← back
          </button>
        </form>
      </div>
    )
  }

  const namePreview = content.custom_name || 'Landan'

  return (
    <div className="admin-shell">
      <div className="top-rainbow-bar" aria-hidden="true" />
      <div className="page-backdrop" />
      <AdminNav active="editor" />
      <form className="admin-panel admin-panel--wide" onSubmit={save}>
        <div className="admin-panel-header">
          <h2 className="admin-panel-title"><button onClick={() => navigate('/')} className="admin-site-link">site</button> editor</h2>
          <button type="button" className="admin-back" onClick={logout}>logout</button>
        </div>

        {spotify && spotify.song && (
          <div className="songs-nowplaying">
            <img className="snp-art" src={spotify.album_art_url} alt="" draggable="false" />
            <div className="snp-info">
              <span className="snp-label">now playing</span>
              <span className="snp-title">{spotify.song}</span>
              <span className="snp-artist">{spotify.artist}</span>
            </div>
            <div className="snp-bar">
              <div
                className="snp-bar-fill"
                style={{ width: `${spotify.timestamps?.end ? Math.min(100, Math.max(0, (now.getTime() - spotify.timestamps.start) / (spotify.timestamps.end - spotify.timestamps.start) * 100)) : 0}%` }}
              />
            </div>
          </div>
        )}

        <div className="admin-fields">
          <p className="admin-section-label">profile</p>

          <label className="admin-field">
            <span>name text</span>
            <input
              className="admin-input"
              type="text"
              placeholder="Landan"
              value={content.custom_name || ''}
              onChange={e => setContent(c => ({ ...c, custom_name: e.target.value }))}
            />
          </label>

          <div className="admin-field">
            <span>name style</span>
            <div className="style-picker">
              {NAME_STYLES.map(s => (
                <button
                  key={s.id}
                  type="button"
                  className={`style-picker-btn${(content.name_style || 'neon') === s.id ? ' active' : ''}`}
                  onClick={() => setContent(c => ({ ...c, name_style: s.id }))}
                >
                  <span className={`style-picker-preview name-style-${s.id}`}>{namePreview}</span>
                  <span className="style-picker-label">{s.label}</span>
                </button>
              ))}
            </div>
          </div>

          <label className="admin-field">
            <span>handle (@…)</span>
            <input
              className="admin-input"
              type="text"
              placeholder="landan"
              value={content.custom_handle || ''}
              onChange={e => setContent(c => ({ ...c, custom_handle: e.target.value }))}
            />
          </label>

          <label className="admin-field">
            <span>top-right tag</span>
            <input
              className="admin-input"
              type="text"
              placeholder="discord.gg/gogurt"
              value={content.ascii_comment || ''}
              onChange={e => setContent(c => ({ ...c, ascii_comment: e.target.value }))}
            />
          </label>

          <ImageUploadField
            label="avatar (blank = discord)"
            value={content.custom_avatar_url || ''}
            onChange={val => setContent(c => ({ ...c, custom_avatar_url: val }))}
            maxW={256} maxH={256}
          />

          <ImageUploadField
            label="banner (blank = discord)"
            value={content.custom_banner_url || ''}
            onChange={val => setContent(c => ({ ...c, custom_banner_url: val }))}
            maxW={900} maxH={360}
          />

          <p className="admin-section-label">status</p>

          <label className="admin-field">
            <span>custom status</span>
            <input
              className="admin-input"
              type="text"
              placeholder=".gg/gogurt"
              value={content.custom_status || ''}
              onChange={e => setContent(c => ({ ...c, custom_status: e.target.value }))}
            />
          </label>

          <label className="admin-field">
            <span>location</span>
            <input
              className="admin-input"
              type="text"
              placeholder="Kansas City, MO"
              value={content.location || ''}
              onChange={e => setContent(c => ({ ...c, location: e.target.value }))}
            />
          </label>

          <p className="admin-section-label">socials</p>
          <div className="admin-field">
            <span>social badges (icon auto-detects from url)</span>
            <SocialsEditor
              value={content.socials || ''}
              onChange={val => setContent(c => ({ ...c, socials: val }))}
            />
          </div>

          <p className="admin-section-label">particles</p>
          <div className="admin-field">
            <span>background style</span>
            <div className="particle-picker">
              {PARTICLE_STYLES.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  className={`style-picker-btn${(content.particles ?? 'dots') === id ? ' active' : ''}`}
                  onClick={() => setContent(c => ({ ...c, particles: id }))}
                >
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>

          <p className="admin-section-label">bio</p>

          <div className="admin-field">
            <span>about bio</span>
            <RichBioEditor
              value={(content.about_bio && content.about_bio.replace(/<[^>]*>/g, '').trim().length > 0) ? content.about_bio : DEFAULT_BIO}
              onChange={val => setContent(c => ({ ...c, about_bio: val }))}
            />
          </div>

        </div>

        {error && <p className="admin-error">{error}</p>}
        <button className="admin-btn" type="submit" disabled={loading}>
          {saved ? 'saved ✓' : loading ? '…' : 'save changes'}
        </button>
      </form>
    </div>
  )
}

function HardwareWarning() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
    setVisible(!gl)
  }, [])

  if (!visible) return null

  return (
    <aside className="hardware-warning">
      <AlertTriangle size={22} />
      <div>
        <strong>Hardware Acceleration is disabled</strong>
        <span>This may cause performance issues</span>
      </div>
      <button type="button" onClick={() => setVisible(false)} aria-label="Close warning">
        <X size={18} />
      </button>
    </aside>
  )
}

function SiteStatsTag() {
  const now = useClock()
  return (
    <span className="site-stats-tag tooltip-trigger">
      {getSiteDaysLive(now)}d live · {SITE_DEPLOY_COUNT} deploys · {SITE_LOC_COUNT.toLocaleString()} lines
      <span className="tooltip-box">{getSiteDaysLiveExact(now)} days live, exactly</span>
    </span>
  )
}

export default function App() {
  if (window.location.pathname === '/admin') return <AdminPanel />
  if (window.location.pathname === '/admin/uploads') return <AdminUploadsPanel />
  if (window.location.pathname === '/uploads') return <UploadsPage />
  if (window.location.pathname === '/trimmer') return <TrimmerPage />

  const { profile, loading } = useDiscordPresence()
  const serverStats = useServerStats()
  const siteContent = useSiteContent()
  const [specsOpen, setSpecsOpen] = useState(false)
  const [navOpen, setNavOpen] = useState(true)
  const scrollPrev = useRef(0)
  useAccentColor(profile.spotify?.album_art_url)

  useEffect(() => {
    if (!window.matchMedia('(max-width: 620px)').matches) return
    const onScroll = () => {
      const y = window.scrollY
      if (y > scrollPrev.current + 5 && y > 40) setNavOpen(false)
      else if (y < 30) setNavOpen(true)
      scrollPrev.current = y
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const mergedProfile = {
    ...profile,
    customStatus: profile.customStatus || siteContent.custom_status || fallbackProfile.customStatus,
    avatarUrl: siteContent.custom_avatar_url || profile.avatarUrl,
    bannerUrl: siteContent.custom_banner_url || profile.bannerUrl,
  }

  return (
    <main className="bio-shell">
      <div className={`top-rainbow-bar${profile.spotify ? ' top-rainbow-bar--playing' : ''}`} aria-hidden="true" />
      <div className={`ascii-comment${navOpen ? '' : ' ascii-comment--closed'}`}>
        <span aria-hidden="true">{siteContent.ascii_comment || 'discord.gg/gogurt'}</span>
        <button onClick={e => { e.preventDefault(); navigate('/uploads') }} className="uploads-top-link">uploads</button>
        <button onClick={e => { e.preventDefault(); navigate('/trimmer') }} className="uploads-top-link">trimmer</button>
        <button onClick={e => { e.preventDefault(); navigate('/admin') }} className="uploads-top-link">login</button>
        <button
          className="ascii-comment-close"
          onClick={() => setNavOpen(false)}
          aria-label="Close navigation"
        >
          <X size={11} />
        </button>
      </div>
      <div className="page-backdrop" />
      <ParticleCanvas type={siteContent.particles ?? 'dots'} />
      <section className="bio-container">
        <div className="top-grid">
          <ProfileCard
            profile={mergedProfile}
            loading={loading}
            nameStyle={siteContent.name_style || 'neon'}
            customName={siteContent.custom_name}
            customHandle={siteContent.custom_handle}
          />
          <div className="side-stack">
            <SpotifyCard spotify={mergedProfile.spotify} />
            <ActivitiesCard activities={mergedProfile.activities} serverStats={serverStats} />
          </div>
        </div>
        <div className="bottom-grid">
          <AboutCard onOpenSpecs={() => setSpecsOpen(true)} aboutBio={siteContent.about_bio} customSocials={siteContent.socials} />
          <SongsCard />
        </div>
        <GamesCard />
      </section>
      {specsOpen && <SpecsModal onClose={() => setSpecsOpen(false)} />}
      <HardwareWarning />
      <span className="dev-tag">made by landan</span>
      <SiteStatsTag />
    </main>
  )
}
