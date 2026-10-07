'use client'

import { ArchiveTable } from '@/components/site/archive-table'
import { PageHeader } from './page-header'

export function OnHoldView() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <PageHeader
        eyebrow="on hold"
        title="On Hold Records"
        desc="Records pending verification — freshly submitted incidents are held here for a 10-minute verification window before being promoted into the verified Archive. Unregistered handles are rejected at submit time."
      />
      <ArchiveTable mode="onhold" />
    </div>
  )
}
