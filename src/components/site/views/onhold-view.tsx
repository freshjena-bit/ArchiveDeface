'use client'

import { ArchiveTable } from '@/components/site/archive-table'
import { PageHeader } from './page-header'

export function OnHoldView() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <PageHeader
        eyebrow="on hold"
        title="On Hold Records"
        desc="Records pending verification — not yet promoted into the verified archive. These are excluded from the main Archive and Archive Special until reviewed."
      />
      <ArchiveTable mode="onhold" />
    </div>
  )
}
