import HeroSlider from '@/components/home/HeroSlider'
import StatsCounter from '@/components/home/StatsCounter'
import SiteSearchBar from '@/components/home/SiteSearchBar'
import QuickAccess from '@/components/home/QuickAccess'
import VCWelcome from '@/components/home/VCWelcome'
import NewsEventsNotices from '@/components/home/NewsEventsNotices'
import TestimonialsPartners from '@/components/home/TestimonialsPartners'

export default function HomePage() {
  return (
    <>
      <HeroSlider />
      <StatsCounter />
      <SiteSearchBar />
      <QuickAccess />
      <VCWelcome />
      <NewsEventsNotices />
      <TestimonialsPartners />
    </>
  )
}
