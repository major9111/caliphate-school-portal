import { Phone, Mail, MapPin, Clock } from 'lucide-react'
import { useScrollReveal, useScrollStagger } from '@/hooks/useGsapPublic'

export function PublicContact() {
  const headingRef = useScrollReveal<HTMLDivElement>()
  const infoRef = useScrollStagger()
  const formRef = useScrollReveal<HTMLDivElement>()

  return (
    <div className="py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div ref={headingRef}>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">Contact Us</h1>
            <p className="text-lg text-secondary-600 mb-12">Get in touch with us for any inquiries.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div ref={infoRef} className="space-y-6">
              <div data-reveal-item className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-xl bg-primary-100 text-primary-600 flex items-center justify-center flex-shrink-0">
                  <MapPin className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-1">Address</h3>
                  <p className="text-secondary-600">No. 3, Eastern Bypass Road, Gusau, Zamfara State, Nigeria</p>
                </div>
              </div>
              <div data-reveal-item className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-xl bg-primary-100 text-primary-600 flex items-center justify-center flex-shrink-0">
                  <Phone className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-1">Phone</h3>
                  <p className="text-secondary-600">+234 800 000 0000</p>
                </div>
              </div>
              <div data-reveal-item className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-xl bg-primary-100 text-primary-600 flex items-center justify-center flex-shrink-0">
                  <Mail className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-1">Email</h3>
                  <p className="text-secondary-600">info@caliphateschools.edu.ng</p>
                </div>
              </div>
              <div data-reveal-item className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-xl bg-primary-100 text-primary-600 flex items-center justify-center flex-shrink-0">
                  <Clock className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-1">Office Hours</h3>
                  <p className="text-secondary-600">Monday - Friday: 8:00 AM - 4:00 PM</p>
                </div>
              </div>
            </div>

            <div ref={formRef} className="bg-white rounded-2xl p-6 shadow-soft border border-secondary-200">
              <h2 className="text-2xl font-bold mb-4">Send us a message</h2>
              <form className="space-y-4">
                <input type="text" placeholder="Your Name" className="flex h-10 w-full rounded-lg border border-secondary-300 bg-white px-3 py-2 text-sm" required />
                <input type="email" placeholder="Your Email" className="flex h-10 w-full rounded-lg border border-secondary-300 bg-white px-3 py-2 text-sm" required />
                <textarea placeholder="Your Message" rows={4} className="flex w-full rounded-lg border border-secondary-300 bg-white px-3 py-2 text-sm" required />
                <button type="submit" className="w-full h-11 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700">Send Message</button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PublicContact
