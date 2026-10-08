import { TeamView } from '@/components/site/views/team-view'

export default async function Page({
  params,
}: {
  params: Promise<{ name: string }>
}) {
  const { name } = await params
  return <TeamView name={decodeURIComponent(name)} />
}
