import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/geist-sans/400.css'
import '@fontsource/geist-sans/500.css'
import '@fontsource/geist-sans/600.css'
import '@fontsource/geist-mono/400.css'
import '@fontsource/geist-mono/500.css'
import './index.css'
import { TopBar } from './components/TopBar'
import { Footer } from './components/Footer'
import { PADS } from './lib/pads'
import { DiffText } from './components/ResultCard'

const VERDICTS = [
  ['STAMPED', 'v-stamped', 'The first coin with its ticker on LaunchLab, launched through a pad config we’ve tied to that pad.'],
  ['COPY', 'v-copy', 'An earlier LaunchLab coin already uses this ticker. The card links the original.'],
  ['LOOK-ALIKE', 'v-lookalike', 'The coin or its pad points to a domain or X account made to pass for a real pad, or runs on a config wearing a real pad’s name.'],
  ['UNKNOWN PAD', 'v-unknown', 'The first of its ticker, but launched through a pad we haven’t verified yet. Not bad by itself, just unproven.'],
] as const

function Docs() {
  return (
    <>
      <TopBar active="docs" />
      <main className="wrap docs">
        <h1>How STAMP reads a coin</h1>
        <p className="lede">
          Every coin launched on Raydium LaunchLab records the platform config that launched it: a name, an on-chain address and
          a registered domain. STAMP reads that record and compares it with what the coin claims.
        </p>

        <h2 id="verdicts">Verdicts</h2>
        <dl className="verdicts">
          {VERDICTS.map(([v, cls, text]) => (
            <div key={v} className={`vd ${cls}`}>
              <dt>
                <span className="kind">{v}</span>
              </dt>
              <dd>{text}</dd>
            </div>
          ))}
        </dl>

        <h2 id="checks">What we compare</h2>
        <dl className="kv">
          <div>
            <dt>Pad address</dt>
            <dd>The config address must belong to the pad it says it is. Anyone can name a config “Float”; only Float’s own addresses get the stamp.</dd>
          </div>
          <div>
            <dt>Domain</dt>
            <dd>The coin’s website is checked against the pad’s registered domain and against every known pad domain.</dd>
          </div>
          <div>
            <dt>Ticker</dt>
            <dd>Every LaunchLab coin with the same ticker is pulled and sorted by launch time. The earliest one is the original.</dd>
          </div>
        </dl>

        <h2 id="lookalikes">Look-alike domains</h2>
        <p>
          A look-alike swaps characters that read the same at a glance: <span className="mono">l ↔ i ↔ 1</span>,{' '}
          <span className="mono">rn ↔ m</span>, <span className="mono">0 ↔ o</span>, one letter added or dropped, or the same name
          on another ending. The same test runs on X handles.
        </p>
        <div className="diff docs-diff">
          <span className="diff-k">caught on 9 Nov</span>
          <span className="diff-k">the real one</span>
          <DiffText fake="fioatlaunch.xyz" real="floatlaunch.xyz" />
        </div>

        <h2 id="pads">Pads on record</h2>
        <p>
          {PADS.length} pads, tied to {PADS.reduce((n, p) => n + p.configs.length, 0)} config addresses. Pads Raydium lists on its own
          launchpad page are trusted too.
        </p>
        <ul className="padlist mono">
          {PADS.map((p) => (
            <li key={p.id}>
              <span>{p.name}</span>
              <span className="mute">{p.domain}</span>
              <span className="mute">{p.configs.length ? `${p.configs.length} config${p.configs.length > 1 ? 's' : ''}` : 'by domain'}</span>
            </li>
          ))}
        </ul>

        <h2 id="data">Data sources</h2>
        <p>
          Coins, pad configs and ticker history come from Raydium’s LaunchLab API (
          <span className="mono">launch-mint-v1.raydium.io</span>). Caught today rescans the last 24 h every few minutes.
        </p>

        <h2 id="privacy">Privacy</h2>
        <p>Checks run in your browser. STAMP stores nothing about you or the coins you look up.</p>

        <h2 id="risk">Risk notice</h2>
        <p>
          STAMP reads public data and can be wrong. A stamp says who launched a coin, not that it’s safe to buy. $STAMP is a memecoin
          with no promise of value. Nothing here is financial advice.
        </p>
      </main>
      <Footer />
    </>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Docs />
  </StrictMode>,
)
