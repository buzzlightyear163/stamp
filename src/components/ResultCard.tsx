import { useEffect, useRef, useState, type ReactNode } from 'react'
import { readPad, type CheckResult, type Verdict } from '../lib/check'
import { diffMarks } from '../lib/domains'
import type { LaunchCoin } from '../lib/api'
import { dayMonth, ordinal, raydiumToken, short, solscan, span, stamp } from '../lib/format'

export const VERDICT_LABEL: Record<Verdict, string> = {
  STAMPED: 'Stamped',
  COPY: 'Copy',
  LOOKALIKE: 'Look-alike',
  UNKNOWN: 'Unknown pad',
}
export const verdictClass = (v: Verdict | string) => `v-${v.toLowerCase()}`

type Tone = 'ok' | 'bad' | 'mute'

function Copy({ text }: { text: string }) {
  const [done, setDone] = useState(false)
  return (
    <button
      className="copy"
      aria-label="Copy address"
      onClick={() => {
        navigator.clipboard?.writeText(text)
        setDone(true)
        setTimeout(() => setDone(false), 1200)
      }}
    >
      {done ? 'copied' : 'copy'}
    </button>
  )
}

const Addr = ({ a, kind = 'account' }: { a: string; kind?: 'account' | 'token' }) => (
  <span className="addr">
    <a href={solscan(a, kind)} target="_blank" rel="noreferrer">
      {short(a, 6)}
    </a>
    <Copy text={a} />
  </span>
)

const Row = ({ k, children }: { k: string; children: ReactNode }) => (
  <div className="row">
    <dt>{k}</dt>
    <dd>{children}</dd>
  </div>
)

const Tag = ({ tone, children }: { tone: Tone; children: ReactNode }) => (
  <span className={`tag t-${tone}`}>{children}</span>
)

export function DiffText({ fake, real }: { fake: string; real: string }) {
  const d = diffMarks(fake, real)
  return (
    <>
      <span className="diff-v bad">{d.fake.map((m, i) => (m.on ? <mark key={i}>{m.c}</mark> : m.c))}</span>
      <span className="diff-v ok">{d.real.map((m, i) => (m.on ? <mark key={i}>{m.c}</mark> : m.c))}</span>
    </>
  )
}

function Avatar({ src, sym }: { src?: string; sym: string }) {
  const [bad, setBad] = useState(!src)
  return bad ? (
    <span className="avatar fallback">{sym.slice(0, 1)}</span>
  ) : (
    <img className="avatar" src={src} alt="" onError={() => setBad(true)} />
  )
}

/** The three things STAMP reads, each passing or failing on its own. */
function Checks({ r }: { r: CheckResult }) {
  const { pad } = r
  const padCheck: [Tone, string, string] =
    pad.kind === 'verified'
      ? ['ok', pad.name, 'Verified pad']
      : pad.kind === 'impostor'
        ? ['bad', pad.name, `Not ${pad.pad.name}’s config`]
        : pad.kind === 'unverified'
          ? ['mute', pad.name, 'Config not on record']
          : ['mute', pad.name || 'Unnamed pad', 'Not verified yet']

  const siteFake = r.lookalikes.find((l) => l.where === 'website' || l.where === 'pad website' || l.where === 'pad logo')
  const domainCheck: [Tone, string, string] = siteFake
    ? ['bad', siteFake.fake, `Look-alike of ${siteFake.real}`]
    : r.domainMatch === 'match'
      ? ['ok', r.coinDomain!, 'Same as the pad']
      : r.domainMatch === 'otherpad'
        ? ['bad', r.coinDomain!, `Points to ${r.domainOtherPad?.name}`]
        : r.domainMatch === 'own'
          ? ['mute', r.coinDomain!, 'Coin’s own site']
          : pad.kind === 'verified' && pad.domain
            ? ['ok', pad.domain, 'Verified pad’s site']
            : ['mute', '—', 'No website']

  const n = r.runLength
  const last = r.older[r.older.length - 1]
  const tickerCheck: [Tone, string, string] =
    r.position === 1
      ? last
        ? ['ok', 'First in 30 days', `Last used ${span(r.coin.createAt - last.createAt)} earlier`]
        : ['ok', `1st of ${n}${r.capped ? '+' : ''}`, n > 1 ? `${n - 1} came after` : 'No other coins']
      : ['bad', `${ordinal(r.position)} of ${n}${r.capped ? '+' : ''}`, `Original ${span(r.coin.createAt - r.original.createAt)} earlier`]

  const items: [string, [Tone, string, string]][] = [
    ['Pad', padCheck],
    ['Domain', domainCheck],
    [`$${r.coin.symbol.trim().toUpperCase()}`, tickerCheck],
  ]
  return (
    <div className="checks">
      {items.map(([k, [tone, v, note]]) => (
        <div key={k} className={`chk c-${tone}`}>
          <div className="chk-k">
            <span className="chk-i" aria-hidden="true">
              {tone === 'ok' ? '✓' : tone === 'bad' ? '✗' : '–'}
            </span>
            {k}
          </div>
          <div className="chk-v mono">{v}</div>
          <div className="chk-n">{note}</div>
        </div>
      ))}
    </div>
  )
}

/** Every coin with this ticker on a time axis: the original at the left, now at the right. */
function Timeline({ coins, me, original, onCheck }: { coins: LaunchCoin[]; me: string; original: LaunchCoin; onCheck: (ca: string) => void }) {
  const W = 420
  const H = 92
  const t0 = coins[0].createAt
  const t1 = Math.max(Date.now(), coins[coins.length - 1].createAt + 1)
  // Copies usually land in a burst long after the original. When they do,
  // break the axis: the original sits alone on the left, the burst gets the room.
  const t2 = coins[1]?.createAt ?? t0
  const broken = coins.length > 2 && (t2 - t0) / (t1 - t0) > 0.25
  const x = (t: number) =>
    !broken
      ? 14 + ((t - t0) / (t1 - t0)) * (W - 28)
      : t < t2
        ? 14
        : 64 + ((t - t2) / Math.max(1, t1 - t2)) * (W - 78)
  const cols = new Map<number, number>()
  const dots = coins.map((c) => {
    const cx = x(c.createAt)
    const col = Math.round(cx / 9)
    const stack = Math.min(cols.get(col) ?? 0, 6)
    cols.set(col, stack + 1)
    const ps = readPad(c.platformInfo)
    const tone =
      c.mint === me ? 'me' : c.mint === original.mint ? 'ok' : c.createAt < original.createAt ? 'old' : ps.kind === 'impostor' ? 'bad' : 'n'
    return { c, cx, cy: H - 26 - stack * 9, tone }
  })
  return (
    <svg className="tl" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Launch time of every coin with this ticker">
      {broken ? (
        <>
          <line x1="8" x2="24" y1={H - 18} y2={H - 18} className="tl-axis" />
          <text x="40" y={H - 15} className="tl-t" textAnchor="middle">
            ⋯ {span(t2 - t0)} ⋯
          </text>
          <line x1="58" x2={W - 14} y1={H - 18} y2={H - 18} className="tl-axis" />
        </>
      ) : (
        <line x1="14" x2={W - 14} y1={H - 18} y2={H - 18} className="tl-axis" />
      )}
      {dots.map((d) => (
        <circle
          key={d.c.mint}
          cx={d.cx}
          cy={d.cy}
          r={d.tone === 'me' ? 5 : 3.5}
          className={`tl-d tl-${d.tone}`}
          onClick={() => d.c.mint !== me && onCheck(d.c.mint)}
        >
          <title>
            {short(d.c.mint)} · {d.c.platformInfo.name || 'unnamed pad'} · {dayMonth(d.c.createAt)}
          </title>
        </circle>
      ))}
      <text x="8" y={H - 4} className="tl-t">
        first · {dayMonth(t0)}
      </text>
      <text x={W - 14} y={H - 4} className="tl-t" textAnchor="end">
        now
      </text>
    </svg>
  )
}

export function ResultCard({ r, onCheck }: { r: CheckResult; onCheck: (ca: string) => void }) {
  const { coin, platform } = r
  const tick = `$${coin.symbol.trim().toUpperCase()}`
  const main = r.lookalikes.find((l) => l.where === 'website') ?? r.lookalikes[0]
  const list = useRef<HTMLOListElement>(null)

  // Bring this coin's row into view inside the ticker list (not the page).
  useEffect(() => {
    const ol = list.current
    const me = ol?.querySelector<HTMLElement>('li.me')
    if (ol && me) ol.scrollTop = me.offsetTop - ol.offsetTop - ol.clientHeight / 2 + me.clientHeight / 2
  }, [coin.mint])

  return (
    <article className={`card ${verdictClass(r.verdict)}`} aria-live="polite">
      <header className="card-head">
        <span className="verdict-box">{VERDICT_LABEL[r.verdict]}</span>
        <div className="coin">
          <Avatar src={coin.imgUrl} sym={coin.symbol} />
          <div className="coin-id">
            <div className="coin-name">
              {coin.name} <span className="tick">{tick}</span>
            </div>
            <div className="coin-ca mono">
              {short(coin.mint, 6)} <Copy text={coin.mint} />
            </div>
          </div>
        </div>
        <a className="ext" href={raydiumToken(coin.mint)} target="_blank" rel="noreferrer">
          Raydium ↗
        </a>
      </header>

      <p className="headline">{r.headline}</p>
      <Checks r={r} />

      {main && (
        <div className="diff">
          <span className="diff-k">this coin’s {main.where}</span>
          <span className="diff-k">the real one</span>
          <DiffText fake={main.fake} real={main.real} />
        </div>
      )}

      <div className="card-body">
        <dl className="rows">
          <Row k="Platform">
            {(r.pad.kind === 'verified' ? r.pad.name : platform.name) || 'Unnamed pad'}{' '}
            {r.pad.kind === 'verified' ? (
              <Tag tone="ok">Verified</Tag>
            ) : r.pad.kind === 'impostor' ? (
              <Tag tone="bad">Not {r.pad.pad.name}’s</Tag>
            ) : (
              <Tag tone="mute">Unverified</Tag>
            )}
          </Row>
          <Row k="Platform address">
            <Addr a={platform.pubKey} />
          </Row>
          <Row k="Pad domain">
            {r.regDomain || (r.pad.kind === 'verified' && r.pad.domain) || <span className="mute">— none set</span>}
          </Row>
          <Row k="Coin’s domain">{r.coinDomain ?? <span className="mute">—</span>}</Row>
          <Row k={`First ${tick}`}>
            {r.position === 1 ? (
              <span className="ok">
                this coin · {stamp(coin.createAt)}
                {r.older.length > 0 && <span className="mute"> · older ones are 30+ days earlier</span>}
              </span>
            ) : (
              <span className="addr">
                <button className="linkish" onClick={() => onCheck(r.original.mint)}>
                  {short(r.original.mint, 6)}
                </button>
                <span className="mute">
                  {r.original.platformInfo.name || 'unnamed pad'} · {stamp(r.original.createAt)}
                </span>
              </span>
            )}
          </Row>
          <Row k="Creator wallet">
            <Addr a={coin.creator} />
          </Row>
          <Row k="Graduated">
            {r.graduated ? (
              <span className="ok">Yes</span>
            ) : (
              <span>
                No{' '}
                <span className="mute">
                  ·{' '}
                  {coin.finishingRate > 0 && coin.finishingRate < 1
                    ? coin.finishingRate.toFixed(2)
                    : Math.round(coin.finishingRate)}
                  % of curve
                </span>
              </span>
            )}
          </Row>
          {r.lookalikes
            .filter((l) => l !== main)
            .map((l) => (
              <Row key={l.where + l.fake} k={`Also: ${l.where}`}>
                <span className="bad">
                  {l.fake} <span className="mute">mimics</span> {l.real}
                </span>
              </Row>
            ))}
        </dl>

        <aside className="ticker">
          <div className="ticker-head">
            <span>{tick} on LaunchLab</span>
            <span className="mono mute">
              {r.sameTicker.length}
              {r.capped ? '+' : ''}
            </span>
          </div>
          <Timeline coins={r.sameTicker} me={coin.mint} original={r.original} onCheck={onCheck} />
          <ol className="ticker-list" ref={list}>
            {r.sameTicker.map((c, i) => {
              const me = c.mint === coin.mint
              const ps = readPad(c.platformInfo)
              const padTone = ps.kind === 'impostor' ? 'bad' : ps.kind === 'verified' ? '' : 'mute'
              return (
                <li key={c.mint} className={me ? 'me' : c.mint === r.original.mint ? 'orig' : c.createAt < r.original.createAt ? 'old' : ''}>
                  <button onClick={() => !me && onCheck(c.mint)} disabled={me}>
                    <span className="n mono">{i + 1}</span>
                    <span className="m mono">{short(c.mint, 4)}</span>
                    <span className={`p ${padTone}`}>
                      {(ps.kind === 'verified' ? ps.name : c.platformInfo.name) || '—'}
                      {ps.kind === 'impostor' && ' ✗'}
                    </span>
                    <span className="t mono">{dayMonth(c.createAt)}</span>
                    <span className="f mono">
                      {c.mint === r.original.mint
                        ? 'first'
                        : me
                          ? 'this'
                          : c.createAt < r.original.createAt
                            ? 'older'
                            : `+${span(c.createAt - r.original.createAt)}`}
                    </span>
                  </button>
                </li>
              )
            })}
          </ol>
        </aside>
      </div>
    </article>
  )
}
