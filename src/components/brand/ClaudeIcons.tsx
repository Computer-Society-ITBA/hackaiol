import { cn } from '@/lib/utils'

// Vector versions of the Claude Code mascot and the Claude spark, traced
// from the HackaIOL flyer so they stay crisp and can be animated.

const CLAUDE_ORANGE = '#D97757'

const SPARK_PATH =
  'M20.88 11.68 L17.34 12.47 L22.60 13.35 L23.35 13.82 L23.84 14.49 L23.78 14.96 L22.66 15.54 L15.63 13.96 L21.21 19.25 L21.33 19.84 L21.12 20.15 L21.00 20.27 L20.62 20.18 L15.63 16.21 L18.37 20.54 L18.50 21.63 L18.33 21.96 L17.69 22.18 L17.07 22.05 L15.54 19.92 L13.15 16.05 L13.00 16.23 L12.34 23.32 L12.02 23.72 L11.32 24.00 L10.72 23.55 L10.38 22.79 L11.67 15.40 L8.13 20.22 L6.42 22.05 L5.95 22.21 L5.28 21.85 L5.35 21.21 L10.12 14.69 L4.10 18.60 L2.95 18.69 L2.51 18.25 L2.57 17.55 L4.49 16.12 L9.39 13.33 L9.45 13.09 L1.08 12.66 L0.53 12.56 L-0.02 11.84 L0.02 11.68 L0.51 11.22 L9.32 11.55 L2.45 6.86 L1.97 6.22 L1.84 5.31 L2.30 4.78 L2.60 4.60 L3.59 4.72 L9.22 8.99 L9.34 8.91 L5.76 2.54 L5.52 1.28 L6.22 0.30 L6.65 0.15 L7.61 0.26 L8.03 0.61 L11.64 8.07 L12.03 9.26 L12.16 9.25 L12.85 1.85 L13.28 0.92 L14.01 0.50 L14.56 0.78 L14.99 1.44 L13.78 8.56 L14.25 8.23 L16.74 5.03 L18.46 3.17 L18.97 2.80 L19.91 2.81 L20.70 3.96 L20.36 5.06 L17.20 9.20 L16.38 10.62 L16.57 10.70 L22.88 9.53 L23.68 9.88 L23.77 10.28 L23.44 11.05 Z'

export function ClaudeSpark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={cn('size-4', className)}
    >
      <path d={SPARK_PATH} fill={CLAUDE_ORANGE} />
    </svg>
  )
}

// x, y, width, in a 16 by 10 pixel grid
const MASCOT_PIXELS: [number, number, number][] = [
  [2, 0, 12],
  [2, 1, 12],
  [2, 2, 2],
  [5, 2, 6],
  [12, 2, 2],
  [2, 3, 2],
  [5, 3, 6],
  [12, 3, 2],
  [0, 4, 16],
  [0, 5, 16],
  [2, 6, 12],
  [2, 7, 12],
  [3, 8, 1],
  [5, 8, 1],
  [10, 8, 1],
  [12, 8, 1],
  [3, 9, 1],
  [5, 9, 1],
  [10, 9, 1],
  [12, 9, 1],
]

export function ClaudeCodeMascot({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 10"
      aria-hidden="true"
      shapeRendering="crispEdges"
      className={cn('h-4 w-auto', className)}
    >
      {MASCOT_PIXELS.map(([x, y, w]) => (
        <rect
          key={`${x}-${y}`}
          x={x}
          y={y}
          width={w}
          height="1"
          fill={CLAUDE_ORANGE}
        />
      ))}
    </svg>
  )
}
