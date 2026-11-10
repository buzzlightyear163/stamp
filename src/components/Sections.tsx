import { useEffect, useState } from 'react'
import type { ScanState } from '../lib/useScan'
import type { CaughtRow } from '../lib/scan'
import { raydiumToken, short, span } from '../lib/format'

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

type Tab = 'ALL' | 'COPY' | 'LOOKALIKE'

function CaughtCell({ r }: { r: CaughtRow }) {
  if (r.kind === 'LOOKALIKE')
    return (
      <span className="mono">
        <span className="bad">{r.fake}</span> <span className="mute">→ {r.real}</span>
      </span>
    )
  return (
    <span className="mono">
      <span className="mute">copy of</span> {short(r.originalMint!, 4)}{' '}
      <span className="mute">
        · {r.originalPad || 'unnamed pad'} · {span(r.createAt - r.originalAt!)} later
      </span>
    </span>
  )
}

export function Caught({ state, onCheck }: { state: ScanState; onCheck: (ca: string) => void }) {
  const [tab, setTab] = useState<Tab>('ALL')
  const [n, setN] = useState(25)
  const now = useNow()
  const scan = state.s === 'done' ? state.scan : null
  const rows = scan ? scan.caught.filter((r) => tab === 'ALL' || r.kind === tab) : []
  const count = (t: Tab) => (scan ? scan.caught.filter((r) => t === 'ALL' || r.kind === t).length : 0)

  return (
    <section id="caught" className="sec">
      <div className="sec-head">
        <div>
          <h2>Caught today</h2>
          <p>Copies and look-alikes launched on LaunchLab in the last 24 h.</p>
        </div>
        {scan && (
          <div className="tabs" role="tablist">
            {(['ALL', 'COPY', 'LOOKALIKE'] as Tab[]).map((t) => (
              <button
                key={t}
                role="tab"
                aria-selected={tab === t}
                className={tab === t ? 'on' : ''}
                onClick={() => {
                  setTab(t)
                  setN(25)
                }}
              >
                {t === 'ALL' ? 'All' : t === 'COPY' ? 'Copies' : 'Look-alikes'}
                <span className="mono">{count(t)}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <Scanning state={state} />

      {scan && (
        <>
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
                    <td className={r.impostor ? 'bad' : ''} title={r.impostor ? 'Not this pad’s config' : undefined}>
                      {r.pad || <span className="mute">unnamed</span>}
                      {r.impostor && ' ✗'}
                    </td>
                    <td>
                      <span className={`kind ${r.kind === 'COPY' ? 'v-copy' : 'v-lookalike'}`}>
                        {r.kind === 'COPY' ? 'Copy' : 'Look-alike'}
                      </span>
                    </td>
                    <td>
                      <CaughtCell r={r} />
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
                {!rows.length && (
                  <tr>
                    <td colSpan={6} className="mute empty">
                      Nothing caught in the last 24 h.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="tbl-foot">
            <span className="mono mute">
              {scan.checked.toLocaleString('en-US')} coins read · updated {span(now - scan.at)} ago
            </span>
            {rows.length > n && (
              <button className="more" onClick={() => setN(n + 50)}>
                Show more
              </button>
            )}
          </div>
        </>
      )}
    </section>
  )
}

export function Platforms({ state }: { state: ScanState }) {
  const scan = state.s === 'done' ? state.scan : null
  return (
    <section id="platforms" className="sec">
      <div className="sec-head">
        <div>
          <h2>Platforms</h2>
          <p>Pads launching on Raydium LaunchLab and what they launched today.</p>
        </div>
      </div>
      <Scanning state={state} />
      {scan && (
        <div className="tbl-wrap">
          <table className="tbl pads">
            <thead>
              <tr>
                <th>Pad</th>
                <th>Official domain</th>
                <th className="r">Launches today</th>
                <th className="r">Status</th>
              </tr>
            </thead>
            <tbody>
              {scan.pads.map((p) => (
                <tr key={p.key}>
                  <td>
                    <span className="pad">
                      <Logo src={p.img} name={p.name} />
                      {p.name}
                    </span>
                  </td>
                  <td className="mono">
                    {p.domain ? (
                      <a href={`https://${p.domain}`} target="_blank" rel="noreferrer">
                        {p.domain}
                      </a>
                    ) : (
                      <span className="mute">—</span>
                    )}
                  </td>
                  <td className="r mono">{p.launches.toLocaleString('en-US')}</td>
                  <td className="r">
                    <span className={`tag ${p.status === 'verified' ? 't-ok' : 't-mute'}`}>
                      {p.status === 'verified' ? 'Verified' : 'New'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

export function Stats({ state }: { state: ScanState }) {
  const s = state.s === 'done' ? state.scan.stats : null
  const items: [string, number | undefined][] = [
    ['Coins checked · 24 h', s?.checked],
    ['Copies caught', s?.copies],
    ['Look-alike domains', s?.lookalikeDomains],
    ['Pads verified', s?.padsVerified],
  ]
  return (
    <section className="stats" aria-label="STAMP in numbers">
      {items.map(([k, v]) => (
        <div key={k} className="stat">
          <div className="stat-v mono">{v === undefined ? '—' : v.toLocaleString('en-US')}</div>
          <div className="stat-k">{k}</div>
        </div>
      ))}
    </section>
  )
}
