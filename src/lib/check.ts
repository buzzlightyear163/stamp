import { getCoin, raydiumListedPlatforms, searchTicker, type LaunchCoin, type PlatformInfo } from './api.js'
import {
  baseDomain,
  describeTrick,
  hostOf,
  isLookalikeDomain,
  isLookalikeHandle,
  xHandleOf,
} from './domains.js'
import { PADS, padByConfig, padByDomain, padByName, type Pad } from './pads.js'
import { ordinal, span } from './format.js'

export type Verdict = 'STAMPED' | 'COPY' | 'LOOKALIKE' | 'UNKNOWN'

export type PadStatus =
  | { kind: 'verified'; name: string; domain: string | null; pad?: Pad }
  | { kind: 'impostor'; name: string; pad: Pad } // uses a known pad's name, not its config
  | { kind: 'unverified'; name: string; pad: Pad } // claims a known pad's domain, config not on record
  | { kind: 'unknown'; name: string }

export interface Lookalike {
  where: 'website' | 'pad website' | 'pad logo' | 'X account'
  fake: string
  real: string
  pad: Pad
  trick: string
}

export type DomainMatch = 'match' | 'lookalike' | 'otherpad' | 'own' | 'none'

export interface CheckResult {
  coin: LaunchCoin
  verdict: Verdict
  headline: string
  pad: PadStatus
  platform: PlatformInfo
  regDomain: string | null
  coinDomain: string | null
  domainMatch: DomainMatch
  domainOtherPad?: Pad
  lookalikes: Lookalike[]
  sameTicker: LaunchCoin[]
  original: LaunchCoin
  /** Place in its run (1 = the original). */
  position: number
  runLength: number
  /** Same-ticker coins from before this run, more than 30 days before it. */
  older: LaunchCoin[]
  capped: boolean
  graduated: boolean
}

export class CheckError extends Error {}

/** A ticker that went unused for this long is free again: the next coin to use it starts a new run. */
export const COPY_WINDOW = 30 * 24 * 3600 * 1000

/**
 * Same-ticker coins, oldest first, split into runs. A new run starts when the
 * ticker sat unused for longer than COPY_WINDOW. Coins in a run after its first
 * one are copies of it; an unrelated coin from a year ago doesn't make yours one.
 */
export function runOf(sorted: LaunchCoin[], mint: string) {
  let start = 0
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i].createAt - sorted[i - 1].createAt > COPY_WINDOW) start = i
    if (sorted[i].mint === mint) {
      let end = i + 1
      while (end < sorted.length && sorted[end].createAt - sorted[end - 1].createAt <= COPY_WINDOW) end++
      return { original: sorted[start], position: i - start + 1, older: sorted.slice(0, start), run: sorted.slice(start, end) }
    }
  }
  return { original: sorted[0], position: 1, older: [] as LaunchCoin[], run: sorted }
}

let listedCache: Promise<PlatformInfo[]> | null = null
const listed = () => {
  listedCache ??= raydiumListedPlatforms().catch(() => {
    listedCache = null
    return []
  })
  return listedCache
}

export function readPad(p: PlatformInfo, raydiumListed: PlatformInfo[] = []): PadStatus {
  const web = baseDomain(hostOf(p.web))
  const known = padByConfig(p.pubKey)
  if (known) return { kind: 'verified', name: known.name, domain: known.domain, pad: known }
  const rl = raydiumListed.find((x) => x.pubKey === p.pubKey)
  if (rl) return { kind: 'verified', name: rl.name || p.name, domain: baseDomain(hostOf(rl.web)) }

  const claimsDomain = padByDomain(web)
  if (claimsDomain) {
    // Pads with no configs on record yet are trusted by domain alone.
    if (!claimsDomain.configs.length) return { kind: 'verified', name: claimsDomain.name, domain: web, pad: claimsDomain }
    return { kind: 'unverified', name: p.name || claimsDomain.name, pad: claimsDomain }
  }
  const claimsName = padByName(p.name)
  if (claimsName) return { kind: 'impostor', name: p.name, pad: claimsName }
  return { kind: 'unknown', name: p.name }
}

export function findLookalikes(coin: LaunchCoin): Lookalike[] {
  const out: Lookalike[] = []
  const probes: [Lookalike['where'], string | null][] = [
    ['website', hostOf(coin.website)],
    ['pad website', hostOf(coin.platformInfo.web)],
    ['pad logo', hostOf(coin.platformInfo.img)],
  ]
  for (const [where, host] of probes) {
    const base = baseDomain(host)
    if (!base) continue
    for (const pad of PADS) {
      if (pad.domain && isLookalikeDomain(base, pad.domain) && !out.some((o) => o.fake === base)) {
        out.push({ where, fake: base, real: pad.domain, pad, trick: describeTrick(base, pad.domain) })
      }
    }
  }
  const handle = xHandleOf(coin.twitter)
  for (const pad of PADS) {
    if (pad.x && isLookalikeHandle(handle, pad.x)) {
      out.push({ where: 'X account', fake: `@${handle}`, real: `@${pad.x}`, pad, trick: describeTrick(handle!, pad.x) })
    }
  }
  return out
}

const sym = (s: string) => s.trim().toUpperCase()

export async function check(ca: string, onStep?: (s: string) => void): Promise<CheckResult> {
  onStep?.('Reading the coin from LaunchLab')
  const [coin, raydiumListed] = await Promise.all([getCoin(ca), listed()])
  if (!coin) throw new CheckError('Not a LaunchLab coin. STAMP reads coins launched through Raydium LaunchLab.')

  onStep?.(`Pulling every $${sym(coin.symbol)} on LaunchLab`)
  const rows = await searchTicker(coin.symbol).catch(() => [] as LaunchCoin[])
  const same = rows.filter((r) => sym(r.symbol) === sym(coin.symbol))
  if (!same.some((r) => r.mint === coin.mint)) same.push(coin)
  same.sort((a, b) => a.createAt - b.createAt)
  const { original, position, older, run } = runOf(same, coin.mint)

  onStep?.('Comparing pad and domains')
  const platform = coin.platformInfo
  const pad = readPad(platform, raydiumListed)
  const regDomain = baseDomain(hostOf(platform.web))
  const coinDomain = baseDomain(hostOf(coin.website))
  const lookalikes = findLookalikes(coin)

  let domainMatch: DomainMatch = 'none'
  let domainOtherPad: Pad | undefined
  const padDomain = pad.kind === 'verified' ? pad.domain : regDomain
  if (coinDomain) {
    if (lookalikes.some((l) => l.where === 'website')) domainMatch = 'lookalike'
    else if (padDomain && coinDomain === padDomain) domainMatch = 'match'
    else if ((domainOtherPad = padByDomain(coinDomain))) domainMatch = 'otherpad'
    else domainMatch = 'own'
  }

  const tick = `$${sym(coin.symbol)}`
  let verdict: Verdict
  let headline: string
  if (lookalikes.length || pad.kind === 'impostor') {
    verdict = 'LOOKALIKE'
    const site = lookalikes.find((l) => l.where === 'website' || l.where === 'pad website')
    if (site) headline = `Links to ${site.fake}, a copy of ${site.real} with ${site.trick}.`
    else if (pad.kind === 'impostor')
      headline = `Launched through a config named ${pad.name} that isn’t ${pad.pad.name}’s.`
    else headline = `Uses ${lookalikes[0].fake}, made to pass for ${lookalikes[0].real}.`
  } else if (position > 1) {
    verdict = 'COPY'
    const gap = span(coin.createAt - original.createAt)
    headline = `The ${ordinal(position)} ${tick} on LaunchLab. The original launched ${gap} earlier${
      original.platformInfo.name ? ` on ${original.platformInfo.name}` : ''
    }.`
  } else if (pad.kind !== 'verified') {
    verdict = 'UNKNOWN'
    const first = older.length ? `First ${tick} in 30 days` : `First ${tick}`
    headline =
      pad.kind === 'unverified'
        ? `${first}, but the config claiming ${pad.pad.domain} isn’t one we’ve tied to ${pad.pad.name}.`
        : `${first}, launched through a pad we haven’t verified yet.`
  } else {
    verdict = 'STAMPED'
    headline = older.length
      ? `The first ${tick} on LaunchLab in 30 days, launched through ${pad.name}’s own config.`
      : `The first ${tick} on LaunchLab, launched through ${pad.name}’s own config.`
  }

  return {
    coin,
    verdict,
    headline,
    pad,
    platform,
    regDomain,
    coinDomain,
    domainMatch,
    domainOtherPad,
    lookalikes,
    sameTicker: same,
    original,
    position,
    runLength: run.length,
    older,
    capped: rows.length >= 100,
    graduated: coin.finishingRate >= 100 || !!coin.migrateAmmId,
  }
}
