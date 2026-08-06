import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { toast } from '@/components/ui/toast'
import { CheckCircle, Loader2 } from 'lucide-react'
import api from '@/lib/api'
import { useHeroReveal, useScrollReveal, useScrollStagger } from '@/hooks/useGsapPublic'
import { SectionHead, Blobs, GeoPattern } from '@/components/public/PublicUI'

interface FormState {
  applicant_name: string; email: string; phone: string; class_applying: string
  date_of_birth: string; gender: string; parent_name: string; parent_phone: string; address: string
}

const CLASSES = ['Nursery 1','Nursery 2','Primary 1','Primary 2','Primary 3','Primary 4','Primary 5','Primary 6',
  'JSS 1','JSS 2','JSS 3','SSS 1','SSS 2','SSS 3']

const steps = [
  { tag: 'Step 1', title: 'Submit application', desc: 'Complete the online form below with applicant and parent/guardian details.' },
  { tag: 'Step 2', title: 'Entrance assessment', desc: 'Shortlisted applicants are invited for a short subject-appropriate assessment.' },
  { tag: 'Step 3', title: 'Parent interview', desc: 'A brief conversation with school leadership to understand your child\u2019s needs.' },
  { tag: 'Step 4', title: 'Offer & enrollment', desc: 'Successful applicants receive an offer letter and complete enrollment.' },
]

export default function PublicAdmissions() {
  const heroRef = useHeroReveal()
  const timelineRef = useScrollStagger<HTMLDivElement>()
  const formRef = useScrollReveal<HTMLDivElement>()
  const [form, setForm] = useState<FormState>({ applicant_name: '', email: '', phone: '', class_applying: 'JSS 1', date_of_birth: '', gender: '', parent_name: '', parent_phone: '', address: '' })
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState<{ application_number: string } | null>(null)
  const [error, setError] = useState('')

  const f = (k: keyof FormState, v: string) => setForm(prev => ({ ...prev, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!form.applicant_name || !form.email || !form.parent_name) { setError('Please fill in all required fields.'); return }
    setLoading(true)
    try {
      const res = await api.post('/public/admissions', form)
      setSubmitted(res.data)
      toast('Application submitted successfully!', 'success')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Submission failed. Please try again.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="pub min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--pub-paper)' }}>
        <div className="max-w-md w-full text-center pub-bento-card" style={{ minHeight: 0, padding: 40 }}>
          <div className="h-16 w-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: 'rgba(29,78,216,.08)' }}>
            <CheckCircle className="h-8 w-8" style={{ color: 'var(--pub-sapphire)' }} />
          </div>
          <h2 style={{ fontSize: 24, color: 'var(--pub-ink)', marginBottom: 8 }}>Application Submitted!</h2>
          <p style={{ color: 'var(--pub-slate)', marginBottom: 16 }}>Your application has been received. Keep this reference number for follow-up.</p>
          <div style={{ background: 'var(--pub-paper)', borderRadius: 14, padding: 16, marginBottom: 22 }}>
            <p style={{ fontSize: 12.5, color: 'var(--pub-slate)' }}>Application Number</p>
            <p style={{ fontSize: 22, fontWeight: 700, color: 'var(--pub-sapphire)', fontFamily: 'monospace' }}>{submitted.application_number}</p>
          </div>
          <p style={{ fontSize: 13, color: 'var(--pub-slate)', marginBottom: 22 }}>We will contact you by email regarding the next steps, including entrance assessment dates.</p>
          <Link to="/"><Button className="w-full">Return to Home</Button></Link>
        </div>
      </div>
    )
  }

  return (
    <div>
      <section ref={heroRef} className="pub-hero" style={{ padding: '64px 0 56px', textAlign: 'center' }}>
        <Blobs />
        <GeoPattern />
        <div className="wrap max-w-[900px] mx-auto px-4 relative">
          <span data-reveal className="pub-eyebrow light" style={{ justifyContent: 'center' }}><StarSvg color="#E7CD8C" /> Admissions Open for 2026/2027</span>
          <h1 data-reveal className="pub-hero-title" style={{ fontSize: 'clamp(32px,5vw,50px)' }}>Apply for Admission</h1>
          <p data-reveal className="pub-hero-sub" style={{ margin: '0 auto' }}>
            Join our community of learners. Complete the form below to begin your child's application to
            Caliphate International Schools.
          </p>
        </div>
      </section>

      <section className="pub-section-pad pub-timeline-section">
        <div className="wrap max-w-[1240px] mx-auto px-4">
          <SectionHead light eyebrow="How It Works" title="A simple, four-step path to enrollment." />
          <div ref={timelineRef} className="pub-tl">
            {steps.map((s) => (
              <div key={s.tag} className="pub-tl-item" data-reveal-item>
                <div className="pub-tl-dot" />
                <span className="pub-tl-tag">{s.tag}</span>
                <h4>{s.title}</h4>
                <p>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="pub-section-pad" style={{ background: 'var(--pub-paper)' }}>
        <div className="wrap max-w-[1240px] mx-auto px-4">
          <SectionHead eyebrow="Plan Ahead" title="Key dates for the 2026/2027 academic year." body="Provisional — exact dates will be confirmed in your offer letter." />
          <div className="pub-term-grid">
            {terms.map((t) => (
              <div key={t.tag} className="pub-term-card">
                <span className="pub-term-tag">{t.tag}</span>
                {t.dates.map(([lbl, val]) => (
                  <div key={lbl} className="pub-term-row"><span className="pub-lbl">{lbl}</span><span className="pub-val">{val}</span></div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="pub-section-pad" style={{ background: 'var(--pub-paper-2)' }}>
        <div className="max-w-2xl mx-auto px-4">
          <div ref={formRef} className="pub-bento-card" style={{ minHeight: 0, padding: 32 }}>
            <h2 style={{ fontSize: 22, marginBottom: 20, color: 'var(--pub-ink)' }}>Admission Application Form</h2>

            {error && <div className="bg-red-500/10 border border-red-500/20 text-red-600 rounded-xl p-4 mb-6 text-sm">{error}</div>}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <h3 className="font-semibold mb-3 pb-2 border-b" style={{ color: 'var(--pub-ink)', borderColor: 'var(--pub-mist)' }}>Applicant Information</h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2"><Label>Full Name of Applicant <span className="text-red-500">*</span></Label><Input value={form.applicant_name} onChange={e => f('applicant_name', e.target.value)} placeholder="First name and surname" required /></div>
                  <div><Label>Date of Birth</Label><Input type="date" value={form.date_of_birth} onChange={e => f('date_of_birth', e.target.value)} /></div>
                  <div><Label>Gender</Label>
                    <Select value={form.gender} onChange={e => f('gender', e.target.value)}>
                      <option value="">Select</option><option value="male">Male</option><option value="female">Female</option>
                    </Select>
                  </div>
                  <div><Label>Class Applying For <span className="text-red-500">*</span></Label>
                    <Select value={form.class_applying} onChange={e => f('class_applying', e.target.value)} required>
                      {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                    </Select>
                  </div>
                  <div><Label>Applicant Email</Label><Input type="email" value={form.email} onChange={e => f('email', e.target.value)} placeholder="For portal access" /></div>
                  <div><Label>Phone</Label><Input value={form.phone} onChange={e => f('phone', e.target.value)} /></div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3 pb-2 border-b" style={{ color: 'var(--pub-ink)', borderColor: 'var(--pub-mist)' }}>Parent / Guardian Information</h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2"><Label>Parent / Guardian Full Name <span className="text-red-500">*</span></Label><Input value={form.parent_name} onChange={e => f('parent_name', e.target.value)} required /></div>
                  <div><Label>Parent Phone</Label><Input value={form.parent_phone} onChange={e => f('parent_phone', e.target.value)} /></div>
                  <div className="sm:col-span-2"><Label>Home Address</Label><Input value={form.address} onChange={e => f('address', e.target.value)} /></div>
                </div>
              </div>

              <div className="pt-2">
                <Button type="submit" className="w-full h-12 text-base" disabled={loading}>
                  {loading ? <><Loader2 className="h-5 w-5 mr-2 animate-spin" />Submitting…</> : 'Submit Application'}
                </Button>
                <p style={{ fontSize: 12, color: 'var(--pub-slate)', textAlign: 'center', marginTop: 12 }}>By submitting, you agree to our terms and conditions. You will be contacted within 3 working days.</p>
              </div>
            </form>
          </div>
        </div>
      </section>

      <section className="pub-section-pad">
        <div className="max-w-2xl mx-auto px-4">
          <SectionHead eyebrow="Common Questions" title="Frequently asked questions." />
          <div>
            {faqs.map((item) => <FaqItem key={item.q} q={item.q} a={item.a} />)}
          </div>
        </div>
      </section>
    </div>
  )
}

const terms = [
  { tag: 'First Term', dates: [['Resumption', 'Mon, 8 Sept 2026'], ['Mid-Term Break', '19 – 23 Oct 2026'], ['Term Ends', 'Fri, 11 Dec 2026']] },
  { tag: 'Second Term', dates: [['Resumption', 'Mon, 5 Jan 2027'], ['Mid-Term Break', '15 – 19 Feb 2027'], ['Term Ends', 'Fri, 26 Mar 2027']] },
  { tag: 'Third Term', dates: [['Resumption', 'Mon, 12 Apr 2027'], ['WAEC/NECO Exams', 'May – Jun 2027'], ['Term Ends', 'Fri, 16 Jul 2027']] },
]

const faqs = [
  { q: 'What ages does each section accept?', a: 'Nursery accepts children aged 3–5, Primary accepts ages 6–11, and Secondary accepts ages 12–17. Placement also depends on the entrance assessment.' },
  { q: 'Is there an entrance assessment for every class?', a: 'Yes — all applicants beyond Nursery 1 sit a short, age-appropriate assessment in literacy and numeracy as part of the admissions process.' },
  { q: 'Do you offer transportation or boarding?', a: 'Please contact our admissions office directly to discuss transportation arrangements and current availability for your area.' },
  { q: 'When should I apply?', a: 'We accept applications throughout the year, but early application is encouraged as seats are limited and fill on a rolling basis ahead of each new session.' },
  { q: 'How will I be notified of the outcome?', a: 'You will be contacted by phone and email within a few working days of your entrance assessment and interview.' },
]

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className={`pub-faq-item${open ? ' pub-open' : ''}`}>
      <button className="pub-faq-q" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        {q}
        <span className="pub-plus" />
      </button>
      <div className="pub-faq-a" style={{ maxHeight: open ? 200 : 0 }}>
        <p>{a}</p>
      </div>
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
