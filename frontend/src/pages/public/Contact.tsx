import { Phone, Mail, MapPin, Clock } from 'lucide-react'
import { useScrollReveal, useScrollStagger } from '@/hooks/useGsapPublic'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

const contactItems = [
  { icon: MapPin, title: 'Address', value: 'No. 3, Eastern Bypass Road, Gusau, Zamfara State, Nigeria' },
  { icon: Phone, title: 'Phone', value: '+234 800 000 0000' },
  { icon: Mail, title: 'Email', value: 'info@caliphateschools.edu.ng' },
  { icon: Clock, title: 'Office Hours', value: 'Monday - Friday: 8:00 AM - 4:00 PM' },
]

export function PublicContact() {
  const headingRef = useScrollReveal<HTMLDivElement>()
  const infoRef = useScrollStagger()
  const formRef = useScrollReveal<HTMLDivElement>()

  return (
    <div className="py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div ref={headingRef}>
            <h1 className="font-display font-bold text-4xl md:text-5xl mb-6 text-[var(--text)]">Contact Us</h1>
            <p className="text-lg text-[var(--text-2)] mb-12">Get in touch with us for any inquiries.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div ref={infoRef} className="space-y-6">
              {contactItems.map((item) => (
                <div key={item.title} data-reveal-item className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-xl bg-primary-500/10 text-primary-600 dark:text-primary-300 flex items-center justify-center flex-shrink-0">
                    <item.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-display font-semibold text-lg mb-1 text-[var(--text)]">{item.title}</h3>
                    <p className="text-[var(--text-2)]">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>

            <div ref={formRef}>
              <Card className="p-6">
                <h2 className="font-display font-bold text-2xl mb-4 text-[var(--text)]">Send us a message</h2>
                <form className="space-y-4">
                  <input type="text" placeholder="Your Name" className="flex h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] placeholder:text-[var(--text-3)] transition-shadow focus-visible:outline-none focus-visible:border-primary-500 focus-visible:ring-4 focus-visible:ring-primary-500/10 px-3.5 py-2 text-sm" required />
                  <input type="email" placeholder="Your Email" className="flex h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] placeholder:text-[var(--text-3)] transition-shadow focus-visible:outline-none focus-visible:border-primary-500 focus-visible:ring-4 focus-visible:ring-primary-500/10 px-3.5 py-2 text-sm" required />
                  <textarea placeholder="Your Message" rows={4} className="flex w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] placeholder:text-[var(--text-3)] transition-shadow focus-visible:outline-none focus-visible:border-primary-500 focus-visible:ring-4 focus-visible:ring-primary-500/10 px-3.5 py-2 text-sm" required />
                  <Button type="submit" className="w-full h-11">Send Message</Button>
                </form>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PublicContact
