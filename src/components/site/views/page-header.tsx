'use client'

import * as React from 'react'

export function PageHeader({
  eyebrow,
  title,
  desc,
  right,
}: {
  eyebrow?: string
  title: string
  desc?: string
  right?: React.ReactNode
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 border-b border-border/70 pb-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        {eyebrow && (
          <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-primary">
            {eyebrow}
          </div>
        )}
        <h1 className="mt-1.5 font-mono text-xl font-bold tracking-tight sm:text-2xl">
          {title}
        </h1>
        {desc && (
          <p className="mt-1.5 font-mono text-xs leading-relaxed text-muted-foreground">
            {desc}
          </p>
        )}
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  )
}
