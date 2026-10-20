import { DefacerView } from '@/components/site/views/defacer-view'
import { getDefacerData } from '@/lib/defacer'

export const revalidate = 300

export default async function Page({
  params,
}: {
  params: Promise<{ handle: string }>
}) {
  const { handle } = await params
  const decoded = decodeURIComponent(handle)
  const initialData = await getDefacerData(decoded).catch(() => null)
  return <DefacerView handle={decoded} initialData={initialData} />
}
