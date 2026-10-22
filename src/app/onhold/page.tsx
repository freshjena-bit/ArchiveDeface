import type { Metadata } from 'next'
import { OnHoldView } from '@/components/site/views/onhold-view'

// Short ISR — on-hold records auto-promote to archived after 10-min window.
export const revalidate = 60

export const metadata: Metadata = {
  title: 'Pending Verification — DEFACERZONEID',
  description:
    'Defacements currently held for verification (10-minute window before auto-promotion to archive).',
  alternates: { canonical: 'https://defacer.zone.id/onhold' },
  openGraph: {
    title: 'Pending Verification — DEFACERZONEID',
    description: 'Records awaiting verification before being archived.',
    type: 'website',
  },
  robots: { index: false, follow: true }, // don't index transient pending pages
}

export default function Page() {
  return <OnHoldView />
}
