/**
 * FUGUSAU Portal — Parent Dashboard
 * Read-only view of the linked ward's academic & fee status.
 */
import { useQuery } from '@tanstack/react-query'
import { studentsAPI, feesAPI, examsAPI } from '@/services/api'
import { gradeColor } from '@/utils'

function IconParent(p: any) {
  return (
    <svg width={p.size || 20} height={p.size || 20} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
      className={p.className}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}
function IconFee(p: any) {
  return (
    <svg width={p.size || 16} height={p.size || 16} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
      className={p.className}>
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  )
}
function IconResults(p: any) {
  return (
    <svg width={p.size || 16} height={p.size || 16} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
      className={p.className}>
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  )
}

const FEE_STATUS: Record<string, string> = {
  paid:    'bg-primary/15 text-primary-light border-primary/25',
  partial: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
  pending: 'bg-red-500/15 text-red-400 border-red-500/25',
  overdue: 'bg-red-700/15 text-red-300 border-red-700/25',
}

function StatCard({ label, value, sub, accent = '#00A85A' }: {
  label: string; value: string | number; sub?: string; accent?: string
}) {
  return (
    <div className="glass border border-white/[0.07] rounded-2xl p-5 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-0.5"
        style={{ background: `linear-gradient(90deg, ${accent}, transparent)` }} />
      <div className="text-xs text-white/40 mb-2 uppercase tracking-wider">{label}</div>
      <div className="text-3xl font-extrabold" style={{ color: accent }}>{value}</div>
      {sub && <div className="text-[11px] text-white/30 mt-1">{sub}</div>}
    </div>
  )
}

export default function ParentPage() {
  const { data: wardData, isLoading: wardLoading } = useQuery<any, any>({
    queryKey: ['ward-profile'],
    // parents hit /students/profile/ which the backend resolves to their linked ward
    queryFn:  studentsAPI.getProfile,
  })

  const { data: resultsData, isLoading: resultsLoading } = useQuery<any, any>({
    queryKey: ['ward-results'],
    queryFn:  () => examsAPI.getResults({}),
  })

  const { data: feesData, isLoading: feesLoading } = useQuery<any, any>({
    queryKey: ['ward-fees'],
    queryFn:  feesAPI.getInvoices,
  })

  const ward    = wardData?.data ?? null
  const results: any[] = resultsData?.data?.results ?? resultsData?.data ?? []
  const invoices: any[] = feesData?.data?.results ?? feesData?.data ?? []

  const latestInvoice = invoices[0] ?? null
  const cgpa = ward?.cgpa ?? 0

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg,#006B3F,#00A85A)' }}>
          <IconParent size={18} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Ward Overview</h1>
          <p className="text-xs text-white/40">Academic and fee status for your linked ward</p>
        </div>
      </div>

      {/* Ward profile card */}
      {wardLoading ? (
        <div className="glass border border-white/[0.07] rounded-2xl p-6 animate-pulse">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/10" />
            <div className="space-y-2 flex-1">
              <div className="h-4 w-40 bg-white/10 rounded" />
              <div className="h-3 w-28 bg-white/5 rounded" />
              <div className="h-3 w-32 bg-white/5 rounded" />
            </div>
          </div>
        </div>
      ) : ward ? (
        <div className="glass-strong border border-primary/20 rounded-2xl p-6">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center font-bold text-xl flex-shrink-0"
              style={{ background: 'linear-gradient(135deg,#006B3F,#00A85A)' }}>
              {ward.profile_photo
                ? <img src={ward.profile_photo} alt="" className="w-full h-full rounded-2xl object-cover" />
                : (ward.full_name ?? 'W')[0].toUpperCase()
              }
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-white">{ward.full_name}</h2>
              <p className="text-xs text-white/50">{ward.matric_number}</p>
              <p className="text-xs text-white/40 mt-0.5">{ward.department_name}</p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full border bg-primary/15 text-primary-light border-primary/25">
                  {ward.level}L
                </span>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border capitalize ${
                  ward.status === 'active'
                    ? 'bg-primary/15 text-primary-light border-primary/25'
                    : 'bg-red-500/15 text-red-400 border-red-500/25'
                }`}>
                  {ward.status}
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="glass border border-white/[0.07] rounded-2xl p-8 text-center">
          <IconParent size={32} className="mx-auto mb-2 text-white/20" />
          <p className="text-sm text-white/40">No linked ward found on this account.</p>
          <p className="text-xs text-white/25 mt-1">Contact the admissions office to link your ward.</p>
        </div>
      )}

      {ward && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard
              label="CGPA"
              value={cgpa.toFixed(2)}
              sub="Cumulative"
              accent={cgpa >= 4.5 ? '#00A85A' : cgpa >= 3.5 ? '#3B82F6' : cgpa >= 2.4 ? '#D4A017' : '#EF4444'}
            />
            <StatCard
              label="Credit Units"
              value={ward.total_credit_units_earned ?? 0}
              sub="Earned so far"
              accent="#3B82F6"
            />
            <StatCard
              label="Level"
              value={`${ward.level}L`}
              sub={`${ward.admission_session ?? ''}`}
              accent="#8B5CF6"
            />
            <StatCard
              label="Fee Balance"
              value={latestInvoice ? `N${(latestInvoice.balance ?? 0).toLocaleString()}` : 'N/A'}
              sub={latestInvoice?.status ?? 'No invoice'}
              accent={latestInvoice?.status === 'paid' ? '#00A85A' : '#EF4444'}
            />
          </div>

          {/* Recent results */}
          <div className="glass border border-white/[0.07] rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <IconResults />
              <span className="text-sm font-semibold text-white">Recent Results</span>
            </div>
            {resultsLoading ? (
              <div className="space-y-2">
                {[1,2,3].map(i => <div key={i} className="h-10 bg-white/5 rounded-xl animate-pulse" />)}
              </div>
            ) : results.length === 0 ? (
              <p className="text-sm text-white/40 text-center py-4">No results published yet.</p>
            ) : (
              <div className="space-y-2">
                {results.slice(0, 8).map((r: any) => (
                  <div key={r.id} className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white">{r.course_code}</p>
                      <p className="text-[11px] text-white/40 truncate">{r.course_title}</p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-sm font-bold text-white">{r.total_score}</span>
                      <span className="text-xs font-bold w-7 text-center" style={{ color: gradeColor(r.grade) }}>
                        {r.grade}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Fee invoices */}
          <div className="glass border border-white/[0.07] rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <IconFee />
              <span className="text-sm font-semibold text-white">Fee Invoices</span>
            </div>
            {feesLoading ? (
              <div className="space-y-2">
                {[1,2].map(i => <div key={i} className="h-14 bg-white/5 rounded-xl animate-pulse" />)}
              </div>
            ) : invoices.length === 0 ? (
              <p className="text-sm text-white/40 text-center py-4">No invoices found.</p>
            ) : (
              <div className="space-y-3">
                {invoices.map((inv: any) => (
                  <div key={inv.id} className="flex items-center justify-between px-4 py-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                    <div>
                      <p className="text-sm font-medium text-white">{inv.invoice_no}</p>
                      <p className="text-xs text-white/40">{inv.generated_at?.slice(0, 10)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-white">N{(inv.total_amount ?? 0).toLocaleString()}</p>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border capitalize ${FEE_STATUS[inv.status] ?? ''}`}>
                        {inv.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
