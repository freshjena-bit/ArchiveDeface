'use client'

import { SubmitForm } from '@/components/site/submit-form'
import { PageHeader } from './page-header'

export function SubmitView() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <PageHeader
        eyebrow="contribute"
        title="Submit Defacement"
        desc="File one or more incidents. Each URL becomes its own archived record with a generated mirror snapshot. Country & category are auto-derived from the URL."
      />
      <SubmitForm />
    </div>
  )
}
