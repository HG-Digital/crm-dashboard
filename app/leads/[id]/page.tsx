import LeadDetailClient from './LeadDetailClient'

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return <LeadDetailClient id={id} />
}
