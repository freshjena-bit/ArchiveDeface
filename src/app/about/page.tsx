import type { Metadata } from 'next'
import { AboutView } from '@/components/site/views/about-view'

// Static — about page content never changes between deploys.
export const metadata: Metadata = {
  title: 'About — DEFACERZONEID',
  description:
    'About the DEFACERZONEID project: mission, methodology, data sources, and how to submit defacements.',
  alternates: { canonical: 'https://defacer.zone.id/about' },
  openGraph: {
    title: 'About DEFACERZONEID',
    description: 'Mission, methodology, and submission guidelines.',
    type: 'website',
  },
}

export default function Page() {
  return <AboutView />
}
