import { scan24h } from '../src/lib/scan.js'

// Background scan behind "Caught today". The CDN keeps the answer for five
// minutes and serves the last one while a fresh scan runs, so LaunchLab sees
// one scan per region every few minutes however many people open the page.
export default async function handler(_req: unknown, res: {
  setHeader: (k: string, v: string) => void
  status: (n: number) => { json: (b: unknown) => void }
}) {
  try {
    const scan = await scan24h({ searchLimit: 80 })
    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=3600')
    res.status(200).json(scan)
  } catch (e) {
    res.setHeader('Cache-Control', 'no-store')
    res.status(502).json({ error: e instanceof Error ? e.message : 'scan failed' })
  }
}
