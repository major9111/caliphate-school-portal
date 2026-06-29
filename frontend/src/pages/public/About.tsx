import { School, Users, GraduationCap, Award } from 'lucide-react'

export function PublicAbout() {
  return (
    <div className="py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">About Caliphate Schools</h1>
          <p className="text-lg text-secondary-600 mb-8">Founded in 2013, Caliphate International Schools has been at the forefront of providing quality Islamic and Western education in Gusau, Zamfara State.</p>
          
          <div className="grid md:grid-cols-2 gap-6 mb-12">
            {[
              { icon: School, title: 'Our Mission', desc: 'To provide balanced education combining academic excellence with Islamic values.' },
              { icon: Award, title: 'Our Vision', desc: 'To be the leading institution producing well-rounded, morally upright leaders.' },
              { icon: Users, title: 'Our Values', desc: 'Knowledge, Faith, Excellence, Discipline, and Integrity.' },
              { icon: GraduationCap, title: 'Our Approach', desc: 'Holistic education nurturing mind, body, and spirit.' },
            ].map((item, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 shadow-soft border border-secondary-200">
                <div className="h-12 w-12 rounded-xl bg-primary-100 text-primary-600 flex items-center justify-center mb-4">
                  <item.icon className="h-6 w-6" />
                </div>
                <h3 className="font-bold text-xl mb-2">{item.title}</h3>
                <p className="text-secondary-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default PublicAbout
