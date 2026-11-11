import { CaChip, Mark } from './TopBar'
import { STAMP, buyUrl } from '../config'

export function Footer() {
  return (
    <footer className="foot">
      <div className="wrap">
        <div className="foot-cols">
          <div className="foot-brand">
            <a className="brand" href="/">
              <Mark size={18} />
              <span>STAMP</span>
            </a>
            <p>Check the stamp before you ape.</p>
            <CaChip full />
          </div>
          <nav>
            <h3>Product</h3>
            <a href="/#check">Check a CA</a>
            <a href="/#caught">Caught today</a>
            <a href="/#platforms">Platforms</a>
            <a href={buyUrl()} target="_blank" rel="noreferrer">
              Buy $STAMP
            </a>
          </nav>
          <nav>
            <h3>Learn</h3>
            <a href="/docs">Docs</a>
            <a href="/docs#verdicts">Verdicts</a>
            <a href="/docs#lookalikes">Look-alike domains</a>
            <a href="/docs#data">Data sources</a>
          </nav>
          <nav>
            <h3>Legal</h3>
            <a href="/docs#risk">Risk notice</a>
            <a href="/docs#privacy">Privacy</a>
            <a href={STAMP.x} target="_blank" rel="noreferrer">
              X
            </a>
          </nav>
        </div>
        <p className="risk">
          STAMP reads public LaunchLab data and can be wrong. A stamp says who launched a coin, not that it’s safe. $STAMP is a
          memecoin with no promise of value. Nothing here is financial advice.
        </p>
      </div>
    </footer>
  )
}
