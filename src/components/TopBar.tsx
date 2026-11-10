import { useEffect, useState } from 'react'
import { newestCoins } from '../lib/api'
import { span } from '../lib/format'
import { buyUrl } from '../config'

export function Mark({ size = 20 }: { size?: number }) {
  // A postage stamp: perforated edge around a solid face.
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true">
      <rect x="1" y="1" width="18" height="18" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6" strokeDasharray="1.6 1.6" />
      <rect x="5" y="5" width="10" height="10" rx="1" fill="currentColor" />
    </svg>
  )
}

function LastCoin() {
  const [at, setAt] = useState<number | null>(null)
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    let alive = true
    const load = () =>
      newestCoins(1)
        .then((r) => alive && r[0] && setAt(r[0].createAt))
        .catch(() => {})
    load()
    const poll = setInterval(load, 20_000)
    const tick = setInterval(() => setNow(Date.now()), 1000)
    return () => {
      alive = false
      clearInterval(poll)
      clearInterval(tick)
    }
  }, [])
  return (
    <span className="live mono" title="Newest coin on Raydium LaunchLab">
      <i className="dot" />
      {at ? `last coin ${span(now - at)} ago` : 'LaunchLab'}
    </span>
  )
}

export function TopBar({ active = 'check' }: { active?: 'check' | 'docs' }) {
  return (
    <header className="top">
      <div className="wrap top-in">
        <a className="brand" href="/" aria-label="STAMP home">
          <Mark />
          <span>STAMP</span>
        </a>
        <nav className="nav">
          <a href="/#check" className={active === 'check' ? 'on' : ''}>
            Check
          </a>
          <a href="/#caught">Caught</a>
          <a href="/#platforms">Platforms</a>
          <a href="/docs" className={active === 'docs' ? 'on' : ''}>
            Docs
          </a>
        </nav>
        <div className="top-right">
          <LastCoin />
          <a className="btn" href={buyUrl()} target="_blank" rel="noreferrer">
            Buy $STAMP
          </a>
        </div>
      </div>
    </header>
  )
}
