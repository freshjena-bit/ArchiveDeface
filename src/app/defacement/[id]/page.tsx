import { DefacementView } from '@/components/site/views/defacement-view'

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <DefacementView id={id} />
}
