export const short = (a: string, n = 4) => (a.length > n * 2 + 1 ? `${a.slice(0, n)}…${a.slice(-n)}` : a)

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const pad2 = (n: number) => String(n).padStart(2, '0')

/** 28 Oct · 22:34 UTC */
export function stamp(ms: number) {
  const d = new Date(ms)
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} · ${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())} UTC`
}

export function dayMonth(ms: number) {
  const d = new Date(ms)
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}`
}

/** 14s / 6m / 3h / 12d */
export function span(ms: number) {
  const s = Math.max(0, Math.round(ms / 1000))
  if (s < 60) return `${s}s`
  const m = Math.round(s / 60)
  if (m < 60) return `${m}m`
  const h = Math.round(m / 60)
  if (h < 48) return `${h}h`
  return `${Math.round(h / 24)}d`
}

export const ordinal = (n: number) => {
  const v = n % 100
  const s = v >= 11 && v <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] || 'th'
  return `${n}${s}`
}

export const isSolanaAddress = (s: string) => /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(s)

export const solscan = (addr: string, kind: 'account' | 'token' = 'account') =>
  `https://solscan.io/${kind}/${addr}`
export const raydiumToken = (mint: string) => `https://raydium.io/launchpad/token/?mint=${mint}`
