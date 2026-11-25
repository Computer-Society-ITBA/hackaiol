import { cn } from '@/lib/utils'

const LINE: [number, number][] = [
  [0, 178],
  [60, 196],
  [130, 170],
  [200, 150],
  [255, 172],
  [320, 132],
  [380, 124],
  [450, 114],
  [520, 86],
  [592, 56],
]

// x, wick top, wick bottom, body top, body bottom, up
const CANDLES: [number, number, number, number, number, boolean][] = [
  [40, 150, 222, 168, 202, false],
  [125, 140, 210, 152, 182, true],
  [205, 118, 190, 132, 160, false],
  [290, 92, 162, 104, 140, true],
  [375, 82, 148, 94, 124, true],
  [475, 56, 124, 70, 100, true],
]

export function MarketChart({ className }: { className?: string }) {
  const line = LINE.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join(' ')
  const area = `${line} L592 240 L0 240 Z`
  return (
    <svg
      viewBox="0 0 600 240"
      aria-hidden="true"
      preserveAspectRatio="none"
      className={cn('block h-auto w-full', className)}
      fill="none"
    >
      <defs>
        <linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#00D37F" stopOpacity="0.7" />
          <stop offset="1" stopColor="#006D42" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#chart-fill)" opacity="0.7" />
      <path
        d={line}
        stroke="#00D37F"
        strokeWidth="2.5"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      {CANDLES.map(([x, wt, wb, bt, bb, up]) => {
        const color = up ? '#00D37F' : '#FFAF5C'
        return (
          <g key={x}>
            <line x1={x} x2={x} y1={wt} y2={wb} stroke={color} />
            <rect x={x - 5} y={bt} width="10" height={bb - bt} fill={color} />
          </g>
        )
      })}
      <circle cx="592" cy="56" r="5" fill="#00D37F" />
    </svg>
  )
}
