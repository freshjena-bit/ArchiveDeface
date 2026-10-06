'use client'

import * as React from 'react'
import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

export type Marks = {
  isHomepage?: boolean // H
  isMass?: boolean // M
  isRedeface?: boolean // R
  hasLocation?: boolean // L (country identified)
  isSpecial?: boolean // S (star)
}

const ACTIVE = 'border-primary/60 bg-primary/15 text-primary'
const IDLE = 'border-border/50 bg-card/40 text-muted-foreground/40'

function Box({
  active,
  children,
  title,
}: {
  active: boolean
  children: React.ReactNode
  title: string
}) {
  return (
    <span
      title={title}
      className={cn(
        'grid h-5 w-5 shrink-0 place-items-center rounded-sm border font-mono text-[10px] font-bold leading-none transition-colors',
        active ? ACTIVE : IDLE
      )}
    >
      {children}
    </span>
  )
}

export function DefacementMarks({
  marks,
  className,
}: {
  marks: Marks
  className?: string
}) {
  const { isHomepage, isMass, isRedeface, hasLocation, isSpecial } = marks
  return (
    <span className={cn('inline-flex items-center gap-1', className)}>
      <Box active={!!isHomepage} title="Homepage defaced">
        H
      </Box>
      <Box active={!!isMass} title="Mass deface">
        M
      </Box>
      <Box active={!!isRedeface} title="Redeface">
        R
      </Box>
      <Box active={!!hasLocation} title="Location identified">
        L
      </Box>
      <Box active={!!isSpecial} title="Special archive">
        <Star className="h-2.5 w-2.5" fill={isSpecial ? 'currentColor' : 'none'} />
      </Box>
    </span>
  )
}
