// Decorative quotes, as on the flyer. Not market data.
const QUOTES = [
  { symbol: 'GGAL', change: '+2.4%', up: true },
  { symbol: 'AL30', change: '+0.8%', up: true },
  { symbol: 'YPFD', change: '-1.1%', up: false },
  { symbol: 'SPY', change: '-2.1%', up: false },
  { symbol: 'XOM', change: '+3.2%', up: true },
  { symbol: 'NVDA', change: '-10.4%', up: false },
  { symbol: 'SUPV', change: '+∞', up: true },
  { symbol: 'MELI', change: '+1.7%', up: true },
  { symbol: 'PAMP', change: '+0.6%', up: true },
  { symbol: 'TXAR', change: '-0.9%', up: false },
]

/** A tilted green tape of quotes that runs across the full page width. */
export function Ticker() {
  const row = QUOTES.map((q) => (
    <span key={q.symbol} className="flex items-baseline gap-2 pr-12">
      <span className="font-extrabold">{q.symbol}</span>
      <span className="font-medium opacity-75">
        {q.up ? '▲' : '▼'} {q.change}
      </span>
    </span>
  ))
  return (
    <div aria-hidden="true" className="relative z-10 pt-4 pb-10">
      <div className="bg-brand-green text-brand-ink -mx-[5vw] -rotate-[2.5deg] overflow-hidden py-3.5 text-lg shadow-[0_20px_50px_-20px_rgb(0_211_127/0.5)]">
        <div className="ticker-track flex w-max">
          <div className="flex">{row}</div>
          <div className="flex">{row}</div>
        </div>
      </div>
    </div>
  )
}
