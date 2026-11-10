import { useEffect, useRef, useState, type ReactNode } from 'react'
import { readPad, type CheckResult, type Verdict } from '../lib/check'
import { diffMarks } from '../lib/domains'
import { dayMonth, raydiumToken, short, solscan, span, stamp } from '../lib/format'

export const VERDICT_LABEL: Record<Verdict, string> = {
  STAMPED: 'Stamped',
  COPY: 'Copy',
  LOOKALIKE: 'Look-alike',
  UNKNOWN: 'Unknown pad',
}
export const verdictClass = (v: Verdict | string) => `v-${v.toLowerCase()}`

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

const Tag = ({ tone, children }: { tone: 'ok' | 'bad' | 'mute'; children: ReactNode }) => (
  <span className={`tag t-${tone}`}>{children}</span>
)

function Diff({ fake, real, where }: { fake: string; real: string; where: string }) {
  const d = diffMarks(fake, real)
  return (
    <div className="diff">
      <div className="diff-line">
        <span className="diff-k">this coin’s {where}</span>
        <span className="diff-v bad">
          {d.fake.map((m, i) => (m.on ? <mark key={i}>{m.c}</mark> : m.c))}
        </span>
      </div>
      <div className="diff-line">
        <span className="diff-k">the real one</span>
        <span className="diff-v ok">
          {d.real.map((m, i) => (m.on ? <mark key={i}>{m.c}</mark> : m.c))}
        </span>
      </div>
    </div>
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

export function ResultCard({ r, onCheck }: { r: CheckResult; onCheck: (ca: string) => void }) {
  const { coin, pad, platform } = r
  const tick = `$${coin.symbol.trim().toUpperCase()}`
  const main = r.lookalikes.find((l) => l.where === 'website') ?? r.lookalikes[0]
  const others = r.sameTicker.length - 1
  const list = useRef<HTMLOListElement>(null)

  // Bring this coin's row into view inside the ticker list (not the page).
  useEffect(() => {
    const ol = list.current
    const me = ol?.querySelector<HTMLElement>('li.me')
    if (ol && me) ol.scrollTop = me.offsetTop - ol.offsetTop - ol.clientHeight / 2 + me.clientHeight / 2
  }, [coin.mint])

  const padCell = (() => {
    switch (pad.kind) {
      case 'verified':
        return (
          <>
            {pad.name} <Tag tone="ok">Verified</Tag>
          </>
        )
      case 'impostor':
        return (
          <>
            {pad.name || '—'} <Tag tone="bad">Not {pad.pad.name}’s config</Tag>
          </>
        )
      case 'unverified':
        return (
          <>
            {pad.name} <Tag tone="mute">Config not on record</Tag>
          </>
        )
      default:
        return (
          <>
            {pad.name || 'Unnamed pad'} <Tag tone="mute">New</Tag>
          </>
        )
    }
  })()

  const domainCell = (() => {
    switch (r.domainMatch) {
      case 'match':
        return <span className="ok">✓ same as the pad</span>
      case 'lookalike':
        return <span className="bad">✗ look-alike of {main?.real}</span>
      case 'otherpad':
        return <span className="bad">✗ points to {r.domainOtherPad?.name}, a different pad</span>
      case 'own':
        return <span className="mute">— coin links its own site</span>
      default:
        return <span className="mute">— no website</span>
    }
  })()

  return (
    <article className={`card ${verdictClass(r.verdict)}`} aria-live="polite">
      <header className="card-head">
        <div className="verdict">
          <span className="verdict-box">{VERDICT_LABEL[r.verdict]}</span>
        </div>
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

      {main && <Diff fake={main.fake} real={main.real} where={main.where} />}

      <div className="card-body">
        <dl className="rows">
          <Row k="Platform">{padCell}</Row>
          <Row k="Platform address">
            <Addr a={platform.pubKey} />
          </Row>
          <Row k="Registered domain">{r.regDomain ?? <span className="mute">— none set</span>}</Row>
          <Row k="Coin’s domain">{r.coinDomain ?? <span className="mute">—</span>}</Row>
          <Row k="Domain match">{domainCell}</Row>
          <Row k={`First ${tick}`}>
            {r.position === 1 ? (
              <span className="ok">✓ this coin · {stamp(coin.createAt)}</span>
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
          <Row k={`Other ${tick} coins`}>
            {others > 0 ? (
              <span className={r.position === 1 ? '' : 'bad'}>
                {others}
                {r.capped ? '+' : ''} {r.position === 1 ? 'came after this one' : 'on LaunchLab'}
              </span>
            ) : (
              <span className="ok">none</span>
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
                  · {coin.finishingRate > 0 && coin.finishingRate < 1 ? coin.finishingRate.toFixed(2) : Math.round(coin.finishingRate)}% of curve
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
            <span>
              {tick} on LaunchLab
            </span>
            <span className="mono mute">
              {r.sameTicker.length}
              {r.capped ? '+' : ''}
            </span>
          </div>
          <ol className="ticker-list" ref={list}>
            {r.sameTicker.map((c, i) => {
              const me = c.mint === coin.mint
              const ps = readPad(c.platformInfo)
              const padTone = ps.kind === 'impostor' ? 'bad' : ps.kind === 'verified' ? '' : 'mute'
              const padTitle =
                ps.kind === 'impostor' ? `Not ${ps.pad.name}’s config` : ps.kind === 'verified' ? 'Verified pad' : 'Not verified'
              return (
                <li key={c.mint} className={me ? 'me' : ''}>
                  <button onClick={() => !me && onCheck(c.mint)} disabled={me}>
                    <span className="n mono">{i + 1}</span>
                    <span className="m mono">{short(c.mint, 4)}</span>
                    <span className={`p ${padTone}`} title={padTitle}>
                      {c.platformInfo.name || '—'}
                      {ps.kind === 'impostor' && ' ✗'}
                    </span>
                    <span className="t mono">{dayMonth(c.createAt)}</span>
                    <span className="f mono">
                      {i === 0 ? 'first' : me ? 'this' : `+${span(c.createAt - r.original.createAt)}`}
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
