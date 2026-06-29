import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { CheckCircle } from 'lucide-react'

export function PublicAdmissions() {
  const sections = ['Nursery (ages 2-5)', 'Primary (Class 1-6)', 'Junior Secondary (JSS 1-3)', 'Senior Secondary (SS 1-3)']
  const requirements = ['Application form', 'Birth certificate', '4 passport photos', 'Previous school report (if transferring)']
  const fees = [
    { section: 'Nursery', amount: '150,000' },
    { section: 'Primary', amount: '200,000' },
    { section: 'Junior Secondary', amount: '250,000' },
    { section: 'Senior Secondary', amount: '280,000' },
  ]

  return (
    <div className="py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">Admissions</h1>
          <p className="text-lg text-secondary-600 mb-8">Admissions are currently open for the 2026/2027 academic session.</p>

          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <div className="bg-white rounded-2xl p-6 shadow-soft border border-secondary-200">
              <h2 className="text-2xl font-bold mb-4">Sections</h2>
              <ul className="space-y-2">
                {sections.map((s, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-soft border border-secondary-200">
              <h2 className="text-2xl font-bold mb-4">Requirements</h2>
              <ul className="space-y-2">
                {requirements.map((r, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-soft border border-secondary-200 mb-8">
            <h2 className="text-2xl font-bold mb-4">School Fees (per term)</h2>
            <div className="grid md:grid-cols-4 gap-4">
              {fees.map((f, i) => (
                <div key={i} className="bg-secondary-50 rounded-xl p-4">
                  <p className="text-sm text-secondary-600">{f.section}</p>
                  <p className="text-2xl font-bold text-primary-700">{f.amount}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="text-center">
            <Link to="/register"><Button size="lg">Start Application</Button></Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PublicAdmissions
