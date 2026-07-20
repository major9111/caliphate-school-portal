import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Users, GraduationCap, Award, BookOpen } from 'lucide-react'
import { useHeroReveal, useScrollStagger } from '@/hooks/useGsapPublic'

const gallery = [
  { src: '/images/hero-playground.jpg', alt: 'Students playing on the playground' },
  { src: '/images/classroom-1.jpg', alt: 'Students in class' },
  { src: '/images/classroom-2.jpg', alt: 'Students at their desks' },
  { src: '/images/swing-single.jpg', alt: 'Student on the swing' },
]

export function PublicHome() {
  const heroRef = useHeroReveal()
  const cardsRef = useScrollStagger()
  const galleryRef = useScrollStagger()

  return (
    <div>
      <section
        ref={heroRef}
        className="relative text-white py-20 md:py-32 overflow-hidden bg-secondary-900"
      >
        <img
          src="/images/hero-playground.jpg"
          alt="Students playing at Caliphate International Schools"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-primary-900/90 via-primary-800/80 to-primary-900/90" />
        <div className="container mx-auto px-4 relative">
          <div className="max-w-3xl">
            <h1 data-reveal className="text-4xl md:text-6xl font-bold mb-6">Welcome to Caliphate International Schools</h1>
            <p data-reveal className="text-lg md:text-xl text-blue-100 mb-8">Providing quality Islamic and Western education in Gusau, Zamfara State since 2013.</p>
            <div data-reveal className="flex flex-wrap gap-4">
              <Link to="/admissions"><Button size="lg" className="bg-white text-primary-700 hover:bg-secondary-50">Apply Now</Button></Link>
              <Link to="/about"><Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">Learn More</Button></Link>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Why Choose Us</h2>
            <p className="text-secondary-600 max-w-2xl mx-auto">We combine excellence in education with strong Islamic values.</p>
          </div>
          <div ref={cardsRef} className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: GraduationCap, title: 'Excellence', desc: 'Outstanding academic results' },
              { icon: Users, title: 'Expert Teachers', desc: 'Qualified and experienced staff' },
              { icon: BookOpen, title: 'Islamic Values', desc: 'Strong moral foundation' },
              { icon: Award, title: 'Modern Facilities', desc: 'State-of-the-art campus' },
            ].map((item, i) => (
              <div key={i} data-reveal-item className="bg-white rounded-2xl p-6 shadow-soft border border-secondary-200">
                <div className="h-12 w-12 rounded-xl bg-primary-100 text-primary-600 flex items-center justify-center mb-4">
                  <item.icon className="h-6 w-6" />
                </div>
                <h3 className="font-bold text-lg mb-2">{item.title}</h3>
                <p className="text-secondary-600 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 bg-secondary-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Life at Caliphate</h2>
            <p className="text-secondary-600 max-w-2xl mx-auto">A glimpse into our classrooms and campus life.</p>
          </div>
          <div ref={galleryRef} className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {gallery.map((img, i) => (
              <div key={i} data-reveal-item className="aspect-[3/4] rounded-2xl overflow-hidden shadow-soft">
                <img src={img.src} alt={img.alt} className="h-full w-full object-cover hover:scale-105 transition-transform duration-500" />
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

export default PublicHome
