'use client'

import { ArchiveTable } from '@/components/site/archive-table'
import { Sidebar } from '@/components/site/sidebar'
import { SpecialArchiveTable } from '@/components/site/special-archive-table'
import { PageHeader } from './page-header'

export function ArchiveView() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <PageHeader
        eyebrow="registry"
        title="Defacement Archive"
        desc="Full incident registry — all records, normal and special. Search across attacker, target, URL, PoC and reason. Each row opens a mirror snapshot."
      />
      {/* main: all records + sidebar */}
      <div className="grid gap-5 lg:grid-cols-12">
        <div className="min-w-0 lg:col-span-8">
          <ArchiveTable />
        </div>
        <div className="min-w-0 lg:col-span-4">
          <Sidebar />
        </div>
      </div>

      {/* special archive — dedicated, only special records */}
      <div className="mt-8">
        <SpecialArchiveTable />
      </div>
    </div>
  )
}
