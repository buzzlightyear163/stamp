/** Hostname without www, lower case. Null for empty or broken URLs. */
export function hostOf(url?: string | null): string | null {
  if (!url) return null
  try {
    const u = new URL(url.includes('://') ? url : `https://${url}`)
    return u.hostname.toLowerCase().replace(/^www\./, '') || null
  } catch {
    return null
  }
}

// Shared hosts where every subdomain belongs to someone else.
const SHARED = [
  'vercel.app',
  'railway.app',
  'up.railway.app',
  'netlify.app',
  'pages.dev',
  'onrender.com',
  'lovable.app',
  'github.io',
  'web.app',
  'firebaseapp.com',
  'herokuapp.com',
  'replit.app',
]

/** Registrable part: main.padpad.trade -> padpad.trade, x.vercel.app stays whole. */
export function baseDomain(host: string | null): string | null {
  if (!host) return null
  if (host === 'localhost' || /^[\d.]+$/.test(host)) return host
  const shared = SHARED.filter((s) => host.endsWith(`.${s}`)).sort((a, b) => b.length - a.length)[0]
  if (shared) return host.split('.').slice(-(shared.split('.').length + 1)).join('.')
  return host.split('.').slice(-2).join('.')
}

/** X handle from an x.com / twitter.com URL. */
export function xHandleOf(url?: string | null): string | null {
  if (!url) return null
  const m = url.match(/(?:x|twitter)\.com\/(?:#!\/)?@?([A-Za-z0-9_]{1,15})/i)
  if (!m || ['i', 'home', 'intent', 'search'].includes(m[1].toLowerCase())) return null
  return m[1].toLowerCase()
}

// Characters that read the same at a glance.
const SKELETON: [RegExp, string][] = [
  [/rn/g, 'm'],
  [/vv/g, 'w'],
  [/cl/g, 'd'],
  [/[1i|]/g, 'l'],
  [/0/g, 'o'],
]
const skeleton = (s: string) => SKELETON.reduce((t, [re, r]) => t.replace(re, r), s.toLowerCase())

/** Optimal string alignment distance (swaps count as one edit). */
export function editDistance(a: string, b: string): number {
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i])
  for (let j = 1; j <= b.length; j++) d[0][j] = j
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1)
      }
    }
  }
  return d[a.length][b.length]
}

const split = (domain: string) => {
  const parts = domain.split('.')
  return { label: parts.slice(0, -1).join('.'), tld: parts[parts.length - 1] }
}

/** True when `candidate` is built to be mistaken for `real`. */
export function isLookalikeDomain(candidate: string | null, real: string): boolean {
  if (!candidate) return false
  const c = baseDomain(candidate)!
  if (c === real) return false
  if (skeleton(c) === skeleton(real)) return true
  const a = split(c)
  const b = split(real)
  if (a.label === b.label) return true // floatlaunch.fun vs floatlaunch.xyz
  if (b.label.length >= 6 && editDistance(a.label, b.label) === 1) return true
  return false
}

export function isLookalikeHandle(candidate: string | null, real: string): boolean {
  if (!candidate || candidate === real) return false
  if (skeleton(candidate) === skeleton(real)) return true
  return real.length >= 6 && editDistance(candidate, real) === 1
}

export interface Mark {
  c: string
  on: boolean
}

/** Marks which characters differ between a fake and the real string. */
export function diffMarks(fake: string, real: string) {
  const n = fake.length
  const m = real.length
  const d: number[][] = Array.from({ length: n + 1 }, (_, i) => [i])
  for (let j = 1; j <= m; j++) d[0][j] = j
  for (let i = 1; i <= n; i++)
    for (let j = 1; j <= m; j++)
      d[i][j] = Math.min(
        d[i - 1][j] + 1,
        d[i][j - 1] + 1,
        d[i - 1][j - 1] + (fake[i - 1] === real[j - 1] ? 0 : 1),
      )
  const fm = new Array(n).fill(false)
  const rm = new Array(m).fill(false)
  const ops: { type: 'sub' | 'del' | 'ins'; f?: string; r?: string }[] = []
  let i = n
  let j = m
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && fake[i - 1] === real[j - 1] && d[i][j] === d[i - 1][j - 1]) {
      i--
      j--
    } else if (i > 0 && j > 0 && d[i][j] === d[i - 1][j - 1] + 1) {
      fm[i - 1] = rm[j - 1] = true
      ops.push({ type: 'sub', f: fake[i - 1], r: real[j - 1] })
      i--
      j--
    } else if (i > 0 && d[i][j] === d[i - 1][j] + 1) {
      fm[i - 1] = true
      ops.push({ type: 'ins', f: fake[i - 1] })
      i--
    } else {
      rm[j - 1] = true
      ops.push({ type: 'del', r: real[j - 1] })
      j--
    }
  }
  return {
    fake: [...fake].map((c, k): Mark => ({ c, on: fm[k] })),
    real: [...real].map((c, k): Mark => ({ c, on: rm[k] })),
    ops: ops.reverse(),
  }
}

/** Plain-words description of the trick: "l" swapped for "i". */
export function describeTrick(fake: string, real: string): string {
  const { ops } = diffMarks(fake, real)
  if (ops.length === 1) {
    const o = ops[0]
    if (o.type === 'sub') return `“${o.r}” swapped for “${o.f}”`
    if (o.type === 'del') return `“${o.r}” left out`
    return `an extra “${o.f}”`
  }
  const fs = split(fake)
  const rs = split(real)
  if (fs.label === rs.label) return `.${rs.tld} swapped for .${fs.tld}`
  return `${ops.length} characters changed`
}
