import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
      <div className="min-h-screen bg-secondary-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Application Submitted!</h2>
          <p className="text-secondary-600 mb-4">Your application has been received. Keep this reference number for follow-up.</p>
          <div className="bg-secondary-50 rounded-xl p-4 mb-6">
            <p className="text-sm text-secondary-500">Application Number</p>
            <p className="text-2xl font-bold font-mono text-primary-700">{submitted.application_number}</p>
          </div>
          <p className="text-sm text-secondary-500 mb-6">We will contact you by email regarding the next steps, including entrance assessment dates.</p>
          <Link to="/"><Button className="w-full">Return to Home</Button></Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-secondary-50">
      {/* Hero */}
      <div ref={heroRef} className="relative bg-primary-700 text-white py-16 text-center px-4 overflow-hidden">
        <img src="/images/swing-pair.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-primary-800/85" />
        <div className="relative">
          <h1 data-reveal className="text-4xl font-bold mb-3">Apply for Admission</h1>
          <p data-reveal className="text-primary-200 text-lg max-w-xl mx-auto">Join our community of learners. Complete the form below to begin your application to Caliphate International Schools.</p>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div ref={formRef} className="bg-white rounded-2xl shadow-sm p-8">
          <h2 className="text-xl font-bold mb-6">Admission Application Form</h2>

          {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-6 text-sm">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <h3 className="font-semibold text-secondary-700 mb-3 pb-2 border-b">Applicant Information</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2"><Label>Full Name of Applicant <span className="text-red-500">*</span></Label><Input value={form.applicant_name} onChange={e => f('applicant_name', e.target.value)} placeholder="First name and surname" required /></div>
                <div><Label>Date of Birth</Label><Input type="date" value={form.date_of_birth} onChange={e => f('date_of_birth', e.target.value)} /></div>
                <div><Label>Gender</Label>
                  <select value={form.gender} onChange={e => f('gender', e.target.value)} className="flex h-10 w-full rounded-lg border border-secondary-300 bg-white px-3 py-2">
                    <option value="">Select</option><option value="male">Male</option><option value="female">Female</option>
                  </select>
                </div>
                <div><Label>Class Applying For <span className="text-red-500">*</span></Label>
                  <select value={form.class_applying} onChange={e => f('class_applying', e.target.value)} className="flex h-10 w-full rounded-lg border border-secondary-300 bg-white px-3 py-2" required>
                    {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div><Label>Applicant Email</Label><Input type="email" value={form.email} onChange={e => f('email', e.target.value)} placeholder="For portal access" /></div>
                <div><Label>Phone</Label><Input value={form.phone} onChange={e => f('phone', e.target.value)} /></div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-secondary-700 mb-3 pb-2 border-b">Parent / Guardian Information</h3>
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
              <p className="text-xs text-secondary-500 text-center mt-3">By submitting, you agree to our terms and conditions. You will be contacted within 3 working days.</p>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
