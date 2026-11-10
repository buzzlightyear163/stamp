import { useEffect, useState } from 'react'
import { scan24h, type Scan } from './scan'

export type ScanState =
  | { s: 'loading'; coins: number }
  | { s: 'done'; scan: Scan }
  | { s: 'error' }

async function fromServer(): Promise<Scan> {
  const ctl = new AbortController()
  const t = setTimeout(() => ctl.abort(), 45_000)
  try {
    const res = await fetch('/api/scan', { signal: ctl.signal })
    if (!res.ok || !res.headers.get('content-type')?.includes('json')) throw new Error('no scan api')
    const json = (await res.json()) as Scan
    if (!Array.isArray(json.caught)) throw new Error('bad scan')
    return json
  } finally {
    clearTimeout(t)
  }
}

/**
 * The shared background scan (cached at the edge). If it can't be reached,
 * the browser runs a lighter scan of its own straight against LaunchLab.
 */
export function useScan(): ScanState {
  const [state, setState] = useState<ScanState>({ s: 'loading', coins: 0 })
  useEffect(() => {
    let alive = true
    const load = async (first: boolean) => {
      try {
        const scan = await fromServer()
        if (alive) setState({ s: 'done', scan })
      } catch {
        if (!first) return
        try {
          const scan = await scan24h({ searchLimit: 16, onProgress: (coins) => alive && setState({ s: 'loading', coins }) })
          if (alive) setState({ s: 'done', scan })
        } catch {
          if (alive) setState({ s: 'error' })
        }
      }
    }
    load(true)
    const t = setInterval(() => load(false), 5 * 60_000)
    return () => {
      alive = false
      clearInterval(t)
    }
  }, [])
  return state
}
