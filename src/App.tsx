import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { TopBar } from './components/TopBar'
import { ResultCard, verdictClass } from './components/ResultCard'
import { Caught, Platforms, Stats } from './components/Sections'
import { Footer } from './components/Footer'
import { useScan } from './lib/useScan'
import { check, CheckError, type CheckResult } from './lib/check'
import { isSolanaAddress, short } from './lib/format'
import { EXAMPLES } from './config'

type State =
  | { s: 'idle' }
  | { s: 'loading'; step: string }
  | { s: 'done'; r: CheckResult }
  | { s: 'error'; msg: string }

const clean = (v: string) => {
  const t = v.trim()
  // Accept pasted links (solscan, raydium, dexscreener) and pull the CA out.
  const m = t.match(/[1-9A-HJ-NP-Za-km-z]{32,44}/g)
  return m ? m[m.length - 1] : t
}

export default function App() {
  const [value, setValue] = useState('')
  const [state, setState] = useState<State>({ s: 'idle' })
  const run = useRef(0)
  const scan = useScan()

  const go = useCallback(async (raw: string) => {
    const ca = clean(raw)
    setValue(ca)
    if (!isSolanaAddress(ca)) {
      setState({ s: 'error', msg: 'That isn’t a Solana address. Paste the coin’s CA.' })
      return
    }
    const id = ++run.current
    setState({ s: 'loading', step: 'Reading the coin from LaunchLab' })
    const url = new URL(location.href)
    url.searchParams.set('ca', ca)
    history.replaceState(null, '', url)
    try {
      const r = await check(ca, (step) => id === run.current && setState({ s: 'loading', step }))
      if (id === run.current) setState({ s: 'done', r })
    } catch (e) {
      if (id !== run.current) return
      setState({
        s: 'error',
        msg: e instanceof CheckError ? e.message : 'LaunchLab didn’t answer. Try again in a moment.',
      })
    }
  }, [])

  useEffect(() => {
    const ca = new URLSearchParams(location.search).get('ca')
    if (ca) go(ca)
  }, [go])

  const checkFromList = (ca: string) => {
    document.getElementById('check')?.scrollIntoView({ behavior: 'smooth' })
    go(ca)
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (value.trim()) go(value)
  }

  return (
    <>
      <TopBar />
      <main className="wrap">
        <section id="check" className="check">
          <h1>
            Every LaunchLab coin carries the stamp of the pad that launched it. <span>We read it.</span>
          </h1>
          <form className="search" onSubmit={submit} role="search">
            <input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Paste a LaunchLab CA"
              spellCheck={false}
              autoComplete="off"
              autoFocus
              aria-label="LaunchLab contract address"
            />
            <button type="submit" disabled={state.s === 'loading'}>
              {state.s === 'loading' ? 'Checking' : 'Check'}
            </button>
          </form>
          <div className="examples">
            <span className="examples-k">Try</span>
            {EXAMPLES.map((x) => (
              <button key={x.mint} className={`chip ${verdictClass(x.verdict)}`} onClick={() => go(x.mint)}>
                <i />
                <span className="chip-l">{x.label}</span>
                <span className="chip-t">${x.ticker}</span>
                <span className="chip-a mono">{short(x.mint)}</span>
              </button>
            ))}
          </div>

          <div className="out">
            {state.s === 'loading' && (
              <p className="status mono">
                <span className="spin" /> {state.step}…
              </p>
            )}
            {state.s === 'error' && <p className="status err">{state.msg}</p>}
            {state.s === 'done' && <ResultCard r={state.r} onCheck={go} />}
          </div>
          <Stats state={scan} />
        </section>
        <Caught state={scan} onCheck={checkFromList} />
        <Platforms state={scan} />
      </main>
      <Footer />
    </>
  )
}
