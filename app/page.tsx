import { getUserProfile } from "@/lib/supabase/profile"
import { redirect } from "next/navigation"
import LandingPageClient from "./LandingPageClient"

export default async function RootPage() {
  const profile = await getUserProfile()

  if (profile) {
    redirect("/home")
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Placetrix',
    url: 'https://placetrix.app',
    description: 'Educational Assessment Platform for mock tests and study groups.',
    sameAs: [
      'https://www.linkedin.com/company/360-view-tech/',
      'https://www.instagram.com/360viewtech/',
      'https://github.com/360viewtech',
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <LandingPageClient />
    </>
  )
}
