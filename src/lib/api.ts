const BASE = 'https://launch-mint-v1.raydium.io'

export interface PlatformInfo {
  pubKey: string
  name: string
  web: string
  img: string
}

export interface LaunchCoin {
  mint: string
  symbol: string
  name: string
  createAt: number
  creator: string
  website?: string
  twitter?: string
  imgUrl?: string
  finishingRate: number
  migrateAmmId?: string
  platformInfo: PlatformInfo
}

async function get<T>(path: string, signal?: AbortSignal): Promise<T> {
  // Custom headers only on the server: in a browser they would force a CORS preflight.
  const headers =
    typeof window === 'undefined'
      ? { accept: 'application/json', 'user-agent': 'Mozilla/5.0 (compatible; STAMP/1.0)' }
      : undefined
  const res = await fetch(BASE + path, { signal, headers })
  if (!res.ok) throw new Error(`LaunchLab answered ${res.status}`)
  const json = await res.json()
  if (!json.success) throw new Error(json.msg || 'LaunchLab error')
  return json.data as T
}

/** One coin by its CA. Null when the mint is not a LaunchLab coin. */
export async function getCoin(mint: string, signal?: AbortSignal) {
  const d = await get<{ rows: LaunchCoin[] }>(`/get/by/mints?ids=${mint}`, signal)
  return d.rows?.[0] ?? null
}

/** Every LaunchLab coin whose name or ticker matches the text (max 100). */
export async function searchTicker(text: string, signal?: AbortSignal) {
  const d = await get<{ rows: LaunchCoin[] }>(
    `/get/search?text=${encodeURIComponent(text)}&size=100`,
    signal,
  )
  return d.rows ?? []
}

/** One page of the newest LaunchLab coins, newest first. */
export async function newestPage(size = 100, nextPageId?: string, signal?: AbortSignal) {
  return get<{ rows: LaunchCoin[]; nextPageId?: string }>(
    `/get/list?sort=new&size=${size}&includeNsfw=false${nextPageId ? `&nextPageId=${nextPageId}` : ''}`,
    signal,
  )
}

export async function newestCoins(size = 1, signal?: AbortSignal) {
  const d = await get<{ rows: LaunchCoin[] }>(
    `/get/list?sort=new&size=${size}&includeNsfw=false`,
    signal,
  )
  return d.rows ?? []
}

/** Pads that Raydium itself lists on raydium.io/launchpad. */
export async function raydiumListedPlatforms(signal?: AbortSignal) {
  const d = await get<{ data: { items: PlatformInfo[] }[] }>('/main/platforms-v2', signal)
  return d.data.flatMap((g) => g.items)
}
