import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { parseAdminCookie, adminCredentials } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// GET /api/news — public list, pinned first then newest
export async function GET() {
  const db = await getDb()
  const items = await db.news.findMany({
    orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
    take: 50,
  })
  return NextResponse.json({
    items: items.map((n) => ({
      id: n.id,
      title: n.title,
      body: n.body,
      author: n.author,
      pinned: n.pinned,
      createdAt: n.createdAt.toISOString(),
      updatedAt: n.updatedAt.toISOString(),
    })),
  })
}

// POST /api/news { title, body, pinned? } — admin only
export async function POST(req: NextRequest) {
  const cookie = req.headers.get('cookie')
  if (!parseAdminCookie(cookie)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const db = await getDb()
    const { title, body, pinned } = await req.json()
    if (!title || !body) {
      return NextResponse.json({ ok: false, error: 'Title and body required' }, { status: 400 })
    }
    const cred = adminCredentials()
    const news = await db.news.create({
      data: {
        title: String(title).trim(),
        body: String(body).trim(),
        author: cred.username,
        pinned: !!pinned,
      },
    })
    return NextResponse.json({
      ok: true,
      id: news.id,
      createdAt: news.createdAt.toISOString(),
    })
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 })
  }
}
