import type { Metadata } from 'next'
import { SpecialArchiveView } from '@/components/site/views/special-archive-view'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Special Archive — DEFACERZONEID',
  description:
    'Curated special archives: government (.gov), academic (.ac/.edu), and high-severity defacements.',
  alternates: { canonical: 'https://defacer.zone.id/special' },
  openGraph: {
    title: 'Special Defacement Archives — DEFACERZONEID',
    description: 'Government, academic, and critical-severity defacements.',
    type: 'website',
  },
}

export default function Page() {
  return <SpecialArchiveView />
}
