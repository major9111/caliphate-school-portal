import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Card } from '@/components/ui/card'
import { toast } from '@/components/ui/toast'
import { CheckCircle, Loader2 } from 'lucide-react'
import api from '@/lib/api'
import { useHeroReveal, useScrollReveal } from '@/hooks/useGsapPublic'

interface FormState {
  applicant_name: string; email: string; phone: string; class_applying: string
  date_of_birth: string; gender: string; parent_name: string; parent_phone: string; address: string
}

const CLASSES = ['Nursery 1','Nursery 2','Primary 1','Primary 2','Primary 3','Primary 4','Primary 5','Primary 6',
  'JSS 1','JSS 2','JSS 3','SSS 1','SSS 2','SSS 3']

export default function PublicAdmissions() {
  const heroRef = useHeroReveal()
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
      const res = await api.post('/admin/admissions', form)
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
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <div className="h-16 w-16 rounded-full bg-success-500/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-success-600 dark:text-success-300" />
          </div>
          <h2 className="font-display font-bold text-2xl mb-2 text-[var(--text)]">Application Submitted!</h2>
          <p className="text-[var(--text-2)] mb-4">Your application has been received. Keep this reference number for follow-up.</p>
          <div className="bg-[var(--surface-2)] rounded-xl p-4 mb-6">
            <p className="text-sm text-[var(--text-3)]">Application Number</p>
            <p className="text-2xl font-bold font-mono text-[var(--indigo)]">{submitted.application_number}</p>
          </div>
          <p className="text-sm text-[var(--text-3)] mb-6">We will contact you by email regarding the next steps, including entrance assessment dates.</p>
          <Link to="/"><Button className="w-full">Return to Home</Button></Link>
        </Card>
      </div>
    )
  }

  return (
    <div>
      {/* Hero */}
      <div ref={heroRef} className="relative overflow-hidden py-16 text-center px-4 text-white" style={{ background: 'linear-gradient(135deg, #1B1F3B 0%, #12162A 55%, #0B0F14 100%)' }}>
        <div
          className="absolute inset-0 opacity-55"
          style={{
            background:
              'radial-gradient(circle at 15% 20%, rgba(79,70,229,.55), transparent 45%), radial-gradient(circle at 85% 15%, rgba(6,182,212,.35), transparent 40%), radial-gradient(circle at 60% 90%, rgba(16,185,129,.25), transparent 45%)',
          }}
        />
        <div className="relative">
          <h1 data-reveal className="font-display font-bold text-4xl mb-3">Apply for Admission</h1>
          <p data-reveal className="text-white/70 text-lg max-w-xl mx-auto">Join our community of learners. Complete the form below to begin your application to Caliphate International Schools.</p>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div ref={formRef}>
          <Card className="p-8">
            <h2 className="font-display font-bold text-xl mb-6 text-[var(--text)]">Admission Application Form</h2>

            {error && <div className="bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-xl p-4 mb-6 text-sm">{error}</div>}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <h3 className="font-display font-semibold text-[var(--text)] mb-3 pb-2 border-b border-[var(--border)]">Applicant Information</h3>
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
                <h3 className="font-display font-semibold text-[var(--text)] mb-3 pb-2 border-b border-[var(--border)]">Parent / Guardian Information</h3>
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
                <p className="text-xs text-[var(--text-3)] text-center mt-3">By submitting, you agree to our terms and conditions. You will be contacted within 3 working days.</p>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </div>
  )
}
