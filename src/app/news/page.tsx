import type { Metadata } from 'next'
import { NewsView } from '@/components/site/views/news-view'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'News & Announcements — DEFACERZONEID',
  description:
    'Latest news, site announcements, and changelog for the DEFACERZONEID defacement archive.',
  alternates: { canonical: 'https://defacer.zone.id/news' },
  openGraph: {
    title: 'News — DEFACERZONEID',
    description: 'Announcements and updates from the DEFACERZONEID project.',
    type: 'website',
  },
}

export default function Page() {
  return <NewsView />
}
