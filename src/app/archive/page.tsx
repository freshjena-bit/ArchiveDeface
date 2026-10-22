import type { Metadata } from 'next'
import { ArchiveView } from '@/components/site/views/archive-view'

// 1-hour ISR — new defacements get added; users can see them within an hour.
export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Archive — DEFACERZONEID',
  description:
    'Full defacement archive: searchable list of all archived website defacements with filters by country, category, severity, and date.',
  alternates: { canonical: 'https://defacer.zone.id/archive' },
  openGraph: {
    title: 'Defacement Archive — DEFACERZONEID',
    description:
      'Searchable archive of all website defacement incidents with mirror links and attacker attribution.',
    type: 'website',
  },
}

export default function Page() {
  return <ArchiveView />
}
