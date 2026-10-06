'use client'

import { SpecialArchiveTable } from '@/components/site/special-archive-table'
import { PageHeader } from './page-header'

export function SpecialArchiveView() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <PageHeader
        eyebrow="special archive"
        title="Archive Special"
        desc="Records flagged special only. Filter by special archive — ALL (every special record), GOID (gov·ID), GOV (government), ACID (critical severity), EDU (education)."
      />
      <SpecialArchiveTable />
    </div>
  )
}
