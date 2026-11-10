import { useEffect, useMemo, useState } from 'react'
import type { ScanState } from '../lib/useScan'
import type { CaughtRow, Scan } from '../lib/scan'
import { raydiumToken, short, span } from '../lib/format'
import { DiffText } from './ResultCard'

function useNow(every = 15_000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), every)
    return () => clearInterval(t)
  }, [every])
  return now
}

function Logo({ src, name }: { src?: string; name: string }) {
  const [bad, setBad] = useState(!src)
  return bad ? (
    <span className="logo fallback">{name.slice(0, 1).toUpperCase()}</span>
  ) : (
    <img className="logo" src={src} alt="" loading="lazy" onError={() => setBad(true)} />
  )
}

function Scanning({ state }: { state: ScanState }) {
  if (state.s === 'error') return <p className="status err">LaunchLab didn’t answer. The scan retries in a few minutes.</p>
  if (state.s !== 'loading') return null
  return (
    <p className="status mono">
      <span className="spin" /> Scanning LaunchLab{state.coins ? ` · ${state.coins.toLocaleString('en-US')} coins read` : ''}…
    </p>
  )
}

/** 24 hourly bars: when the copies of one ticker landed. */
function Bars({ times, since, at }: { times: number[]; since: number; at: number }) {
  const bins = new Array(24).fill(0)
  for (const t of times) bins[Math.min(23, Math.max(0, Math.floor(((t - since) / (at - since)) * 24)))]++
  const max = Math.max(...bins, 1)
  return (
    <svg className="bars" viewBox="0 0 120 24" aria-hidden="true">
      {bins.map((b, i) => (
        <rect key={i} x={i * 5} y={24 - Math.max(b ? 3 : 1, (b / max) * 24)} width="3.4" height={Math.max(b ? 3 : 1, (b / max) * 24)} className={b ? 'on' : ''} />
      ))}
    </svg>
  )
}

interface Wave {
  symbol: string
  copies: CaughtRow[]
  originalMint: string
  originalAt: number
  originalPad: string
}

interface FakeGroup {
  fake: string
  real: string
  isDomain: boolean
  rows: CaughtRow[]
}

function group(scan: Scan) {
  const waves = new Map<string, Wave>()
  const fakes = new Map<string, FakeGroup>()
  for (const r of scan.caught) {
    if (r.kind === 'COPY') {
      const k = r.symbol.trim().toUpperCase()
      const w = waves.get(k) ?? {
        symbol: k,
        copies: [],
        originalMint: r.originalMint!,
        originalAt: r.originalAt!,
        originalPad: r.originalPad ?? '',
      }
      w.copies.push(r)
      waves.set(k, w)
    } else {
      const k = r.fake ?? ''
      const g = fakes.get(k) ?? { fake: k, real: r.real ?? '', isDomain: /\./.test(k) && !k.endsWith(' config'), rows: [] }
      g.rows.push(r)
      fakes.set(k, g)
    }
  }
  return {
    waves: [...waves.values()].sort((a, b) => b.copies.length - a.copies.length),
    fakes: [...fakes.values()].sort((a, b) => b.rows.length - a.rows.length),
  }
}

type Tab = 'ALL' | 'COPY' | 'LOOKALIKE'

function Feed({ scan, onCheck, now }: { scan: Scan; onCheck: (ca: string) => void; now: number }) {
  const [tab, setTab] = useState<Tab>('ALL')
  const [n, setN] = useState(30)
  const rows = scan.caught.filter((r) => tab === 'ALL' || r.kind === tab)
  const count = (t: Tab) => scan.caught.filter((r) => t === 'ALL' || r.kind === t).length
  return (
    <div className="feed">
      <div className="tabs" role="tablist">
        {(['ALL', 'LOOKALIKE', 'COPY'] as Tab[]).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            className={tab === t ? 'on' : ''}
            onClick={() => {
              setTab(t)
              setN(30)
            }}
          >
            {t === 'ALL' ? 'Every catch' : t === 'COPY' ? 'Copies' : 'Look-alikes'}
            <span className="mono">{count(t)}</span>
          </button>
        ))}
      </div>
      <div className="tbl-wrap">
        <table className="tbl">
          <thead>
            <tr>
              <th>Coin</th>
              <th>Pad</th>
              <th>Type</th>
              <th>What we caught</th>
              <th className="r">Launched</th>
              <th className="r" aria-label="Links" />
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, n).map((r) => (
              <tr key={r.mint}>
                <td>
                  <span className="tk mono">${r.symbol.trim().toUpperCase()}</span>
                  <span className="nm">{r.name}</span>
                </td>
                <td className={r.impostor ? 'bad' : ''}>
                  {r.pad || <span className="mute">unnamed</span>}
                  {r.impostor && ' ✗'}
                </td>
                <td>
                  <span className={`kind ${r.kind === 'COPY' ? 'v-copy' : 'v-lookalike'}`}>
                    {r.kind === 'COPY' ? 'Copy' : 'Look-alike'}
                  </span>
                </td>
                <td className="mono">
                  {r.kind === 'LOOKALIKE' ? (
                    <>
                      <span className="bad">{r.fake}</span> <span className="mute">→ {r.real}</span>
                    </>
                  ) : (
                    <>
                      <span className="mute">copy of</span> {short(r.originalMint!, 4)}{' '}
                      <span className="mute">· {r.originalPad || 'unnamed pad'}</span>
                    </>
                  )}
                </td>
                <td className="r mono mute">{span(now - r.createAt)} ago</td>
                <td className="r links">
                  <button className="linkish" onClick={() => onCheck(r.mint)}>
                    Check
                  </button>
                  <a href={raydiumToken(r.mint)} target="_blank" rel="noreferrer" aria-label="Open on Raydium">
                    ↗
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > n && (
        <button className="more" onClick={() => setN(n + 50)}>
          Show more
        </button>
      )}
    </div>
  )
}

export function Caught({ state, onCheck }: { state: ScanState; onCheck: (ca: string) => void }) {
  const now = useNow()
  const scan = state.s === 'done' ? state.scan : null
  const g = useMemo(() => (scan ? group(scan) : null), [scan])
  const [waveN, setWaveN] = useState(8)
  const [feed, setFeed] = useState(false)

  return (
    <section id="caught" className="sec">
      <div className="sec-head">
        <div>
          <h2>Caught today</h2>
          <p>Copies and look-alikes launched on LaunchLab in the last 24 h.</p>
        </div>
        {scan && (
          <span className="sec-meta mono">
            {scan.checked.toLocaleString('en-US')} coins read · updated {span(now - scan.at)} ago
          </span>
        )}
      </div>

      <Scanning state={state} />

      {scan && g && (
        <>
          <div className="caught-grid">
            <div className="panel">
              <div className="panel-head">
                <span>Look-alikes</span>
                <span className="mono mute">{g.fakes.reduce((n, f) => n + f.rows.length, 0)}</span>
              </div>
              {g.fakes.length ? (
                <ul className="fakes">
                  {g.fakes.map((f) => {
                    const last = f.rows[0]
                    return (
                      <li key={f.fake}>
                        {f.isDomain ? (
                          <div className="fake-diff">
                            <DiffText fake={f.fake} real={f.real} />
                          </div>
                        ) : (
                          <div className="fake-name">
                            <span className="bad mono">{f.fake}</span>
                            <span className="mute">wearing {f.real}’s name</span>
                          </div>
                        )}
                        <div className="fake-meta">
                          <span>
                            <b className="mono">{f.rows.length}</b> {f.rows.length === 1 ? 'coin' : 'coins'} today
                            {last && (
                              <span className="mute">
                                {' '}
                                · latest ${last.symbol.trim().toUpperCase()} {span(now - last.createAt)} ago
                              </span>
                            )}
                          </span>
                          {last && (
                            <button className="linkish" onClick={() => onCheck(last.mint)}>
                              Check latest
                            </button>
                          )}
                        </div>
                      </li>
                    )
                  })}
                </ul>
              ) : (
                <p className="panel-empty mute">No look-alikes in the last 24 h.</p>
              )}
            </div>

            <div className="panel">
              <div className="panel-head">
                <span>Copy waves</span>
                <span className="mono mute">
                  {g.waves.length} tickers · {g.waves.reduce((n, w) => n + w.copies.length, 0)} copies
                </span>
              </div>
              <ul className="waves">
                {g.waves.slice(0, waveN).map((w) => (
                  <li key={w.symbol}>
                    <span className="w-t mono">${w.symbol}</span>
                    <span className="w-n mono">×{w.copies.length}</span>
                    <Bars times={w.copies.map((c) => c.createAt)} since={scan.since} at={scan.at} />
                    <span className="w-o">
                      <span className="mute">first on</span> {w.originalPad || 'unnamed pad'}
                      <span className="mute"> · {span(now - w.originalAt)} ago</span>
                    </span>
                    <button className="linkish" onClick={() => onCheck(w.originalMint)}>
                      Original
                    </button>
                  </li>
                ))}
              </ul>
              {g.waves.length > waveN && (
                <button className="panel-more" onClick={() => setWaveN(waveN + 12)}>
                  More waves
                </button>
              )}
            </div>
          </div>

          <button className="more feed-toggle" onClick={() => setFeed(!feed)} aria-expanded={feed}>
            {feed ? 'Hide every catch' : `Every catch, newest first · ${scan.caught.length}`}
          </button>
          {feed && <Feed scan={scan} onCheck={onCheck} now={now} />}
        </>
      )}
    </section>
  )
}

export function Platforms({ state }: { state: ScanState }) {
  const scan = state.s === 'done' ? state.scan : null
  const [all, setAll] = useState(false)
  const shown = scan ? (all ? scan.pads : scan.pads.slice(0, 12)) : []
  const max = scan ? Math.max(1, ...scan.pads.map((p) => p.launches)) : 1
  const total = scan ? scan.pads.reduce((n, p) => n + p.launches, 0) : 0
  return (
    <section id="platforms" className="sec">
      <div className="sec-head">
        <div>
          <h2>Platforms</h2>
          <p>Pads launching on Raydium LaunchLab and what they launched today.</p>
        </div>
        {scan && (
          <span className="sec-meta mono">
            {scan.pads.filter((p) => p.status === 'verified').length} verified · {scan.pads.filter((p) => p.status === 'new').length}{' '}
            new
          </span>
        )}
      </div>
      <Scanning state={state} />
      {scan && (
        <div className="pads-grid">
          {shown.map((p) => (
            <a
              key={p.key}
              className={`pad-tile ${p.launches ? '' : 'idle'}`}
              href={p.domain ? `https://${p.domain}` : undefined}
              target="_blank"
              rel="noreferrer"
            >
              <div className="pad-top">
                <Logo src={p.img} name={p.name} />
                <span className="pad-name">{p.name}</span>
                <span className={`tag ${p.status === 'verified' ? 't-ok' : 't-mute'}`}>
                  {p.status === 'verified' ? 'Verified' : 'New'}
                </span>
              </div>
              <div className="pad-dom mono">{p.domain ?? '—'}</div>
              <div className="pad-n">
                <span className="mono">{p.launches.toLocaleString('en-US')}</span>
                <span className="mute">
                  launches today{total && p.launches ? ` · ${Math.round((p.launches / total) * 100)}%` : ''}
                </span>
              </div>
              <div className="pad-bar">
                <i style={{ width: `${(p.launches / max) * 100}%` }} />
              </div>
            </a>
          ))}
        </div>
      )}
      {scan && scan.pads.length > 12 && (
        <button className="more feed-toggle" onClick={() => setAll(!all)}>
          {all ? 'Fewer pads' : `All ${scan.pads.length} pads`}
        </button>
      )}
    </section>
  )
}

export function Stats({ state }: { state: ScanState }) {
  const s = state.s === 'done' ? state.scan.stats : null
  const items: [string, number | undefined, string][] = [
    ['Coins checked', s?.checked, 'last 24 h'],
    ['Copies caught', s?.copies, 'same ticker, later'],
    ['Look-alike domains', s?.lookalikeDomains, 'fake pad sites'],
    ['Pads verified', s?.padsVerified, 'on record'],
  ]
  return (
    <section className="stats" aria-label="STAMP in numbers">
      {items.map(([k, v, sub]) => (
        <div key={k} className="stat">
          <div className="stat-v mono">{v === undefined ? <span className="stat-wait" /> : v.toLocaleString('en-US')}</div>
          <div className="stat-k">
            {k} <span>{sub}</span>
          </div>
        </div>
      ))}
    </section>
  )
}
