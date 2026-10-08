import { DefacerView } from '@/components/site/views/defacer-view'

export default async function Page({
  params,
}: {
  params: Promise<{ handle: string }>
}) {
  const { handle } = await params
  return <DefacerView handle={decodeURIComponent(handle)} />
}
