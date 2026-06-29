import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { School, Users, GraduationCap, Award, BookOpen } from 'lucide-react'

export function PublicHome() {
  return (
    <div>
      <section className="relative bg-gradient-to-br from-primary-600 to-primary-900 text-white py-20 md:py-32">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">Welcome to Caliphate International Schools</h1>
            <p className="text-lg md:text-xl text-blue-100 mb-8">Providing quality Islamic and Western education in Gusau, Zamfara State since 2013.</p>
            <div className="flex flex-wrap gap-4">
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
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: GraduationCap, title: 'Excellence', desc: 'Outstanding academic results' },
              { icon: Users, title: 'Expert Teachers', desc: 'Qualified and experienced staff' },
              { icon: BookOpen, title: 'Islamic Values', desc: 'Strong moral foundation' },
              { icon: Award, title: 'Modern Facilities', desc: 'State-of-the-art campus' },
            ].map((item, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 shadow-soft border border-secondary-200">
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
    </div>
  )
}

export default PublicHome
