import { useState } from 'react'
import { Phone, Mail, MapPin, Clock } from 'lucide-react'
import { useScrollReveal, useScrollStagger } from '@/hooks/useGsapPublic'
import { Button } from '@/components/ui/button'
import { SectionHead, GeoPattern } from '@/components/public/PublicUI'

const visitCards = [
  { icon: MapPin, title: 'Our Address', value: 'No. 3, Eastern Bypass Road, Gusau, Zamfara State, Nigeria' },
  { icon: Phone, title: 'Phone', value: '+234 800 000 0000' },
  { icon: Mail, title: 'Email', value: 'info@caliphateschools.edu.ng' },
  { icon: Clock, title: 'Office Hours', value: 'Monday – Friday: 8:00 AM – 4:00 PM' },
]

export function PublicContact() {
  const heroRef = useScrollReveal<HTMLDivElement>()
  const visitRef = useScrollStagger<HTMLDivElement>()
  const formRef = useScrollReveal<HTMLDivElement>()
  const [sent, setSent] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const subject = encodeURIComponent(`Website enquiry from ${name}`)
    const body = encodeURIComponent(`${message}\n\n— ${name} (${email})`)
    window.location.href = `mailto:info@caliphateschools.edu.ng?subject=${subject}&body=${body}`
    setSent(true)
  }

  return (
    <div>
      <section ref={heroRef} className="pub-hero" style={{ padding: '60px 0 48px', textAlign: 'center' }}>
        <GeoPattern />
        <div className="wrap max-w-[720px] mx-auto px-4 relative">
          <span data-reveal className="pub-eyebrow light" style={{ justifyContent: 'center' }}><StarSvg color="#E7CD8C" /> Get In Touch</span>
          <h1 data-reveal className="pub-hero-title" style={{ fontSize: 'clamp(30px,4.5vw,46px)' }}>Contact Us</h1>
          <p data-reveal className="pub-hero-sub" style={{ margin: '0 auto' }}>We'd love to hear from you — reach out with any questions.</p>
        </div>
      </section>

      {/* ================= VISIT US ================= */}
      <section className="pub-section-pad pub-visit" style={{ position: 'relative' }}>
        <GeoPattern />
        <div className="wrap max-w-[1240px] mx-auto px-4 relative">
          <SectionHead light eyebrow="Come See Us" title="Visit our campus in Gusau." />
          <div ref={visitRef} className="pub-visit-grid">
            <div className="pub-visit-map" data-reveal-item>
              <iframe
                title="School location"
                src="https://www.google.com/maps?q=Gusau,Zamfara+State,Nigeria&output=embed"
                loading="lazy"
              />
            </div>
            <div className="pub-visit-side">
              {visitCards.map((item) => (
                <div key={item.title} className="pub-visit-card" data-reveal-item>
                  <div className="pub-ic"><item.icon className="h-[18px] w-[18px]" /></div>
                  <div>
                    <h4>{item.title}</h4>
                    <p>{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ================= MESSAGE FORM ================= */}
      <section className="pub-section-pad" style={{ background: 'var(--pub-paper-2)' }}>
        <div className="max-w-xl mx-auto px-4">
          <div ref={formRef}>
            <div className="pub-bento-card" style={{ minHeight: 0, padding: 32 }} data-reveal>
              <h2 style={{ fontSize: 22, marginBottom: 16, color: 'var(--pub-ink)' }}>Send us a message</h2>
              {sent ? (
                <p style={{ color: 'var(--pub-slate)', fontSize: 14.5 }}>
                  Your email app should now be open with your message ready to send. If it didn't open, email us
                  directly at <a href="mailto:info@caliphateschools.edu.ng" style={{ color: 'var(--pub-sapphire)' }}>info@caliphateschools.edu.ng</a>.
                </p>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Your Name" className="flex h-11 w-full px-3.5 py-2 text-sm" required />
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Your Email" className="flex h-11 w-full px-3.5 py-2 text-sm" required />
                  <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Your Message" rows={4} className="flex w-full px-3.5 py-2 text-sm" required />
                  <Button type="submit" className="w-full h-11">Send Message</Button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

function StarSvg({ color = '#1D4ED8' }: { color?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" width="12" height="12">
      <path d="M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8L12 2z" fill={color} />
    </svg>
  )
}

export default PublicContact
