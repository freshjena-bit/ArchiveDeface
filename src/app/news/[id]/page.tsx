import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { readDb } from '@/lib/db'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/site/views/page-header'

// 1-day ISR — news articles rarely change after publishing.
export const revalidate = 86400

type Params = Promise<{ id: string }>

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params
  let title = 'News — DEFACERZONEID'
  let description = 'Announcement from the DEFACERZONEID project.'
  try {
    const n = await readDb((db) =>
      db.news.findUnique({ where: { id }, select: { title: true, body: true } })
    )
    if (n) {
      title = `${n.title} — DEFACERZONEID`
      description = n.body.slice(0, 160).replace(/\s+/g, ' ')
    }
  } catch {
    // ignore
  }
  return {
    title,
    description,
    alternates: { canonical: `https://defacer.zone.id/news/${id}` },
    openGraph: { title, description, type: 'article' },
    twitter: { card: 'summary', title, description },
  }
}

export default async function Page({ params }: { params: Params }) {
  const { id } = await params
  let news: { id: string; title: string; body: string; author: string; pinned: boolean; createdAt: Date; updatedAt: Date } | null = null
  try {
    news = await readDb((db) => db.news.findUnique({ where: { id } }))
  } catch {
    // ignore
  }
  if (!news) notFound()

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <PageHeader title="News & Announcements" subtitle="Latest updates from the DEFACERZONEID project" />
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2 mb-2">
            {news!.pinned && <Badge variant="default">Pinned</Badge>}
            <Badge variant="outline">{news!.author}</Badge>
            <span className="text-xs text-muted-foreground">
              {news!.createdAt.toISOString().slice(0, 10)}
            </span>
          </div>
          <CardTitle className="text-2xl">{news!.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <article className="prose prose-invert max-w-none whitespace-pre-wrap text-sm leading-relaxed">
            {news!.body}
          </article>
          {news!.updatedAt.getTime() !== news!.createdAt.getTime() && (
            <p className="text-xs text-muted-foreground mt-6">
              Updated: {news!.updatedAt.toISOString().slice(0, 10)}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
