import { newestPage, raydiumListedPlatforms, searchTicker, type LaunchCoin, type PlatformInfo } from './api.js'
import { findLookalikes, readPad } from './check.js'
import { baseDomain, hostOf } from './domains.js'
import { PADS } from './pads.js'

export interface CaughtRow {
  mint: string
  symbol: string
  name: string
  createAt: number
  pad: string
  impostor: boolean
  kind: 'COPY' | 'LOOKALIKE'
  /** Look-alike: the fake and the real thing it copies. */
  fake?: string
  real?: string
  /** Copy: the first coin with this ticker. */
  originalMint?: string
  originalAt?: number
  originalPad?: string
}

export interface PadRow {
  key: string
  name: string
  domain: string | null
  img: string
  launches: number
  status: 'verified' | 'new'
}

export interface Scan {
  at: number
  since: number
  checked: number
  caught: CaughtRow[]
  pads: PadRow[]
  stats: { checked: number; copies: number; lookalikes: number; lookalikeDomains: number; padsVerified: number }
}

const DAY = 24 * 3600 * 1000
const sym = (s: string) => s.trim().toUpperCase()
// Devs testing their own pads are not copying anyone.
const NOISE = /^(TEST\d*|TESTING|TOKEN|COIN|\$?)$/
// Names pads get when nobody bothered to name them.
const GENERIC = /^(|my launch platform|launchpad|config|platform|fair launch|test.*)$/i

async function inBatches<T, R>(items: T[], size: number, fn: (t: T) => Promise<R>) {
  const out: R[] = []
  for (let i = 0; i < items.length; i += size) out.push(...(await Promise.all(items.slice(i, i + size).map(fn))))
  return out
}

export interface ScanOptions {
  /** How many repeated tickers to look up in full LaunchLab history. */
  searchLimit?: number
  maxPages?: number
  onProgress?: (coins: number) => void
}

export async function scan24h({ searchLimit = 40, maxPages = 40, onProgress }: ScanOptions = {}): Promise<Scan> {
  const at = Date.now()
  const since = at - DAY

  // 1. Every coin launched on LaunchLab in the last 24 h.
  const coins: LaunchCoin[] = []
  let next: string | undefined
  for (let page = 0; page < maxPages; page++) {
    const { rows, nextPageId } = await newestPage(100, next)
    coins.push(...rows.filter((r) => r.createAt >= since))
    onProgress?.(coins.length)
    next = nextPageId
    if (!next || !rows.length || rows[rows.length - 1].createAt < since) break
  }
  const listed: PlatformInfo[] = await raydiumListedPlatforms().catch(() => [])

  const caught = new Map<string, CaughtRow>()
  const fakeDomains = new Set<string>()

  // 2. Look-alikes: fake pad domains, fake X accounts, configs wearing a known pad's name.
  for (const c of coins) {
    const ps = readPad(c.platformInfo, listed)
    const lk = findLookalikes(c)
    for (const l of lk) if (l.where !== 'X account') fakeDomains.add(l.fake)
    if (!lk.length && ps.kind !== 'impostor') continue
    const main = lk.find((l) => l.where === 'website') ?? lk[0]
    caught.set(c.mint, {
      mint: c.mint,
      symbol: c.symbol,
      name: c.name,
      createAt: c.createAt,
      pad: c.platformInfo.name,
      impostor: ps.kind === 'impostor',
      kind: 'LOOKALIKE',
      fake: main ? main.fake : `${c.platformInfo.name} config`,
      real: main ? main.real : ps.kind === 'impostor' ? ps.pad.name : '',
    })
  }

  // 3. Copies: tickers that show up more than once.
  const groups = new Map<string, LaunchCoin[]>()
  for (const c of coins) {
    const s = sym(c.symbol)
    if (NOISE.test(s)) continue
    groups.set(s, [...(groups.get(s) ?? []), c])
  }
  const repeated = [...groups.entries()].filter(([, g]) => g.length > 1).sort((a, b) => b[1].length - a[1].length)
  const firstSeen = new Map<string, LaunchCoin>()
  await inBatches(repeated.slice(0, searchLimit), 8, async ([s]) => {
    const hits = await searchTicker(s).catch(() => [] as LaunchCoin[])
    const exact = hits.filter((h) => sym(h.symbol) === s).sort((a, b) => a.createAt - b.createAt)
    if (exact[0]) firstSeen.set(s, exact[0])
  })
  for (const [s, g] of repeated) {
    g.sort((a, b) => a.createAt - b.createAt)
    const known = firstSeen.get(s)
    const original = known && known.createAt <= g[0].createAt ? known : g[0]
    for (const c of g) {
      if (c.mint === original.mint || caught.has(c.mint)) continue
      caught.set(c.mint, {
        mint: c.mint,
        symbol: c.symbol,
        name: c.name,
        createAt: c.createAt,
        pad: c.platformInfo.name,
        impostor: readPad(c.platformInfo, listed).kind === 'impostor',
        kind: 'COPY',
        originalMint: original.mint,
        originalAt: original.createAt,
        originalPad: original.platformInfo.name,
      })
    }
  }

  // 4. Pads and how many coins each launched today.
  const pads = new Map<string, PadRow>()
  for (const c of coins) {
    const p = c.platformInfo
    const ps = readPad(p, listed)
    if (ps.kind === 'impostor') continue
    let key: string
    let row: Omit<PadRow, 'launches'>
    if (ps.kind === 'verified') {
      key = ps.pad?.id ?? `listed:${ps.name.toLowerCase()}`
      row = { key, name: ps.name, domain: ps.domain, img: ps.pad?.img || p.img, status: 'verified' }
    } else if (ps.kind === 'unverified') {
      continue // claims a known pad's domain through a config we haven't tied to it
    } else {
      const domain = baseDomain(hostOf(p.web))
      if (GENERIC.test(p.name.trim()) || !domain || domain === 'localhost') continue
      key = domain
      row = { key, name: p.name.trim(), domain, img: p.img, status: 'new' }
    }
    const cur = pads.get(key)
    pads.set(key, { ...row, img: cur?.img || row.img, launches: (cur?.launches ?? 0) + 1 })
  }
  for (const pad of PADS) {
    if (!pads.has(pad.id))
      pads.set(pad.id, { key: pad.id, name: pad.name, domain: pad.domain, img: pad.img ?? '', launches: 0, status: 'verified' })
  }
  const padRows = [...pads.values()]
    .filter((p) => p.status === 'verified' || p.launches >= 2)
    .sort((a, b) => b.launches - a.launches || a.name.localeCompare(b.name))

  const rows = [...caught.values()].sort((a, b) => b.createAt - a.createAt)
  const listedNames = new Set(listed.map((l) => l.name.toLowerCase()))
  for (const p of PADS) listedNames.add(p.name.toLowerCase())

  return {
    at,
    since,
    checked: coins.length,
    caught: rows.slice(0, 600),
    pads: padRows,
    stats: {
      checked: coins.length,
      copies: rows.filter((r) => r.kind === 'COPY').length,
      lookalikes: rows.filter((r) => r.kind === 'LOOKALIKE').length,
      lookalikeDomains: fakeDomains.size,
      padsVerified: [...listedNames].filter(Boolean).length,
    },
  }
}
