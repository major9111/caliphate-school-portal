import { useState } from 'react'

const FAQS = [
  { q: 'How do I apply for admission?', a: 'Use the "Apply Now" button under Admissions — it takes you to the official POST-UTME application form on the student portal.' },
  { q: 'How do I check my admission status?', a: 'Go to Admissions → Admission Status and enter your application number and email address.' },
  { q: 'I forgot my student portal password — what do I do?', a: 'On the student portal login page, use "Forgot password?" to reset it via your registered email.' },
  { q: 'Where can I find the academic calendar?', a: 'It will be published under Downloads → Academic Calendar once available.' },
]

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' })
  const [sent, setSent] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(0)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // NOTE: no contact-form backend endpoint exists yet. Wire this up to a
    // real endpoint (e.g. POST /api/v1/contact/) when one is added — for now
    // this falls back to opening the visitor's email client.
    const mailto = `mailto:ict@fugusau.edu.ng?subject=${encodeURIComponent(form.subject || 'Website inquiry')}&body=${encodeURIComponent(`From: ${form.name} <${form.email}>\n\n${form.message}`)}`
    window.location.href = mailto
    setSent(true)
  }

  return (
    <div className="pt-32 pb-20">
      <div className="container-page">
        <p className="section-label mb-3">Get in touch</p>
        <h1 className="text-3xl md:text-5xl font-extrabold mb-4">Contact Us</h1>
        <p className="text-muted max-w-xl mb-12">
          Questions about admissions, academics, or anything else — reach out and we'll point you the right way.
        </p>

        <div className="grid lg:grid-cols-5 gap-10">
          <div className="lg:col-span-2 space-y-4">
            {[
              { icon: 'geo-alt', label: 'Address', value: 'Federal University Gusau, Gusau, Zamfara State, Nigeria' },
              { icon: 'envelope', label: 'Email', value: 'info@fugusau.edu.ng · admissions@fugusau.edu.ng' },
              { icon: 'telephone', label: 'Phone', value: '+234 (0) 000 000 0000' },
            ].map(c => (
              <div key={c.label} className="glass-card rounded-2xl p-5 flex items-start gap-4">
                <span className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                  <i className={`bi bi-${c.icon}`} />
                </span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-muted">{c.label}</p>
                  <p className="text-sm font-semibold mt-0.5">{c.value}</p>
                </div>
              </div>
            ))}

            <div className="glass-card rounded-2xl overflow-hidden h-56">
              <iframe
                title="FUGUSAU campus map"
                className="w-full h-full border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                src="https://www.google.com/maps?q=Federal+University+Gusau,+Zamfara&output=embed"
              />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="lg:col-span-3 glass-card rounded-2xl p-6 md:p-8 space-y-4">
            {sent && (
              <div className="rounded-xl bg-primary/10 text-primary text-sm font-semibold px-4 py-3">
                Opening your email client to send this message…
              </div>
            )}
            <div className="grid sm:grid-cols-2 gap-4">
              <input required placeholder="Full name" value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="glass-card rounded-xl px-4 py-3 text-sm outline-none focus:border-primary/50 border" />
              <input required type="email" placeholder="Email address" value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="glass-card rounded-xl px-4 py-3 text-sm outline-none focus:border-primary/50 border" />
            </div>
            <input required placeholder="Subject" value={form.subject}
              onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
              className="glass-card rounded-xl px-4 py-3 text-sm outline-none focus:border-primary/50 border w-full" />
            <textarea required rows={5} placeholder="Your message" value={form.message}
              onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
              className="glass-card rounded-xl px-4 py-3 text-sm outline-none focus:border-primary/50 border w-full resize-none" />
            <button type="submit" className="btn-primary">
              <i className="bi bi-send" /> Send Message
            </button>
          </form>
        </div>

        <div className="mt-20 max-w-3xl">
          <h2 className="text-2xl font-extrabold mb-6">Frequently Asked Questions</h2>
          <div className="space-y-3">
            {FAQS.map((f, i) => (
              <div key={f.q} className="glass-card rounded-2xl overflow-hidden">
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left font-semibold text-sm">
                  {f.q}
                  <i className={`bi bi-chevron-down transition-transform ${openFaq === i ? 'rotate-180' : ''}`} />
                </button>
                {openFaq === i && <p className="px-5 pb-4 text-sm text-muted leading-relaxed">{f.a}</p>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
