import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { ClaudeCodeMascot, ClaudeSpark } from '@/components/brand/ClaudeIcons'
import { cn } from '@/lib/utils'

const TOOLS = [
  { name: 'get_portfolio', args: '()', result: 'portfolio' },
  { name: 'get_asset_quote', args: '("ASML")', result: 'quote' },
  {
    name: 'create_stop_loss_or_take_profit',
    args: '("ASML", "+12%")',
    result: 'created',
  },
] as const

type Stage = 'typing' | 'thinking' | 'tools' | 'answer'

const TYPE_MS = 32
const THINK_MS = 1600
const TOOL_MS = 1100
const HOLD_MS = 5200

function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

/**
 * A Claude Code session driving the IOL MCP, replayed in a loop: the
 * prompt types itself, Claude thinks, calls three MCP tools and answers.
 * Decorative, so it is hidden from assistive tech.
 */
export function ClaudeCodeWindow({ className }: { className?: string }) {
  const { t } = useTranslation()
  const prompt = t('hero.terminal.prompt')
  const [reduced] = useState(prefersReducedMotion)
  const [stage, setStage] = useState<Stage>(reduced ? 'answer' : 'typing')
  const [typed, setTyped] = useState(reduced ? prompt.length : 0)
  const [toolsDone, setToolsDone] = useState(reduced ? TOOLS.length : 0)

  useEffect(() => {
    if (reduced) return
    let timer: number
    if (stage === 'typing') {
      timer = window.setTimeout(() => {
        if (typed < prompt.length) setTyped(typed + 1)
        else setStage('thinking')
      }, TYPE_MS)
    } else if (stage === 'thinking') {
      timer = window.setTimeout(() => setStage('tools'), THINK_MS)
    } else if (stage === 'tools') {
      timer = window.setTimeout(() => {
        if (toolsDone < TOOLS.length) setToolsDone(toolsDone + 1)
        else setStage('answer')
      }, TOOL_MS)
    } else {
      timer = window.setTimeout(() => {
        setTyped(0)
        setToolsDone(0)
        setStage('typing')
      }, HOLD_MS)
    }
    return () => window.clearTimeout(timer)
  }, [reduced, stage, typed, toolsDone, prompt.length])

  const showTools = stage === 'tools' || stage === 'answer'

  return (
    <div aria-hidden="true" className={cn('relative', className)}>
      <div className="bg-brand-green/30 absolute -top-10 -left-8 size-48 rounded-full blur-3xl" />
      <div className="absolute -right-10 -bottom-12 size-56 rounded-full bg-[#6b5cff]/40 blur-3xl" />

      <div className="relative rounded-2xl bg-gradient-to-br from-white/45 via-white/10 to-white/[0.06] p-[2.5px] shadow-[0_30px_80px_-30px_rgb(0_0_0/0.8)]">
        <div className="relative overflow-hidden rounded-[13.5px] bg-[#1b1250]/60 backdrop-blur-2xl">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-24 rounded-t-2xl bg-gradient-to-b from-white/[0.08] to-transparent" />

          <div className="relative flex items-center gap-3 border-b border-white/10 px-4 py-3">
            <div className="flex gap-1.5">
              <span className="bg-brand-red size-3 rounded-full" />
              <span className="bg-brand-orange size-3 rounded-full" />
              <span className="bg-brand-green size-3 rounded-full" />
            </div>
            <span className="flex items-center gap-2 text-sm font-semibold">
              <ClaudeCodeMascot className="h-3.5" />
              Claude Code
            </span>
            <span className="text-brand-text-dim ml-auto flex items-center gap-2 text-xs font-medium">
              <span className="relative flex size-2">
                <span className="bg-brand-green absolute inline-flex size-full animate-ping rounded-full opacity-60" />
                <span className="bg-brand-green relative inline-flex size-2 rounded-full" />
              </span>
              {t('hero.terminal.status')}
            </span>
          </div>

          <div className="relative min-h-[23rem] space-y-3 px-4 py-4 font-mono text-[12.5px] leading-relaxed sm:min-h-[19rem] sm:px-5 sm:text-sm">
            <div className="rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2">
              <span className="text-brand-orange mr-2">&gt;</span>
              {prompt.slice(0, typed)}
              {stage === 'typing' && (
                <span className="caret bg-brand-green ml-0.5 inline-block h-[1.1em] w-[0.55em] translate-y-[0.2em]" />
              )}
            </div>

            {stage === 'thinking' && (
              <div className="text-brand-orange flex items-center gap-2">
                <ClaudeSpark className="size-4 animate-spin [animation-duration:2.4s]" />
                <span className="animate-pulse">
                  {t('hero.terminal.thinking')}
                </span>
              </div>
            )}

            {showTools &&
              TOOLS.slice(0, Math.min(toolsDone + 1, TOOLS.length)).map(
                (tool, i) => {
                  const done = i < toolsDone
                  return (
                    <div
                      key={tool.name}
                      className="animate-in fade-in slide-in-from-bottom-1 duration-300"
                    >
                      <div className="flex items-start gap-2">
                        <span
                          className={cn(
                            'mt-[0.45em] size-2 flex-shrink-0 rounded-full',
                            done
                              ? 'bg-brand-green'
                              : 'animate-pulse bg-white/60',
                          )}
                        />
                        <span className="min-w-0 break-all">
                          <span className="font-semibold text-white">
                            {tool.name}
                          </span>
                          <span className="text-brand-text-dim">
                            {tool.args}
                          </span>
                        </span>
                      </div>
                      {done && (
                        <div className="text-brand-text-dim animate-in fade-in pl-4 duration-300">
                          <span className="mr-2 text-white/40">⎿</span>
                          {t(`hero.terminal.results.${tool.result}`)}
                        </div>
                      )}
                    </div>
                  )
                },
              )}

            {stage === 'answer' && (
              <div className="animate-in fade-in slide-in-from-bottom-1 flex items-start gap-2 pt-1 font-sans text-[15px] text-white duration-500 sm:text-base">
                <ClaudeSpark className="mt-1 size-4 flex-shrink-0" />
                <span>{t('hero.terminal.answer')}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
