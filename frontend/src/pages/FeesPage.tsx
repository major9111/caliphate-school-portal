/**
 * FUGUSAU Portal — Fees & Payments (Full)
 *
 * POST /fees/pay/              → { invoice_id } → { authorization_url, reference }
 * POST /fees/verify-payment/   → { reference } → { status }
 * POST /fees/generate-invoice/ → { semester }  → Invoice
 * GET  /fees/invoices/         → Invoice list
 * GET  /fees/payment-history/  → Payment list
 * GET  /fees/types/            → FeeType list
 */
import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { feesAPI } from '@/services/api'
import { formatDate, formatNaira } from '@/utils'
import { useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { MobileRow, MobileListMeta } from '@/components/mobile'

// ── Icons ──────────────────────────────────────────────────────
const IconFees    = (p:any)=><svg width={p.size||20} height={p.size||20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={p.className}><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
const IconCheck   = (p:any)=><svg width={p.size||20} height={p.size||20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={p.className}><polyline points="20 6 9 17 4 12"/></svg>
const IconClock   = (p:any)=><svg width={p.size||20} height={p.size||20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={p.className}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
const IconWarning = (p:any)=><svg width={p.size||20} height={p.size||20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={p.className}><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
const IconReceipt = (p:any)=><svg width={p.size||20} height={p.size||20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={p.className}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>

type Tab = 'invoice' | 'history' | 'types'

const STATUS_META: Record<string,{label:string;color:string;cls:string}> = {
  paid:    { label:'Paid',    color:'#00A85A', cls:'bg-primary/15 text-primary-light border-primary/25'  },
  partial: { label:'Partial', color:'#D4A017', cls:'bg-amber-500/15 text-amber-400 border-amber-500/25' },
  pending: { label:'Pending', color:'#3B82F6', cls:'bg-blue-500/15 text-blue-400 border-blue-500/25'    },
  overdue: { label:'Overdue', color:'#EF4444', cls:'bg-red-500/15 text-red-400 border-red-500/25'       },
}

const GlassTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="glass rounded-xl px-4 py-3 border border-white/[0.1] text-xs">
      <p className="text-white/50">{payload[0].name}</p>
      <p className="font-bold" style={{color:payload[0].payload.color}}>
        ₦{Number(payload[0].value).toLocaleString()}
      </p>
    </div>
  )
}

export default function FeesPage() {
  const [tab,       setTab]       = useState<Tab>('invoice')
  const [semester,  setSemester]  = useState('second')
  const [verifying, setVerifying] = useState(false)
  const [searchParams]            = useSearchParams()
  const qc                        = useQueryClient()

  // Check if returning from Paystack with a reference
  useEffect(() => {
    const ref = searchParams.get('ref') || searchParams.get('reference')
    if (ref) {
      setVerifying(true)
      feesAPI.verifyPayment(ref)
        .then(res => {
          if ((res as any)?.data?.status === 'success') toast.success('Payment verified successfully! 🎉')
          else toast.error('Payment verification failed.')
        })
        .catch(() => toast.error('Could not verify payment. Contact the Bursary.'))
        .finally(() => { setVerifying(false); qc.invalidateQueries({ queryKey:['invoices'] }) })
    }
  }, [])

  const { data: invRes,  isLoading: loadInv  } = useQuery<any, any>({ queryKey:['invoices'],         queryFn: feesAPI.getInvoices })
  const { data: histRes, isLoading: loadHist  } = useQuery<any, any>({ queryKey:['payment-history'], queryFn: feesAPI.getHistory, enabled: tab==='history' })
  const { data: typesRes,isLoading: loadTypes } = useQuery<any, any>({ queryKey:['fee-types'],       queryFn: feesAPI.getTypes,   enabled: tab==='types'   })

  const invoices: any[] = invRes?.data?.results  || invRes?.data  || []
  const payments: any[] = histRes?.data?.results || histRes?.data || []
  const feeTypes: any[] = typesRes?.data?.results|| typesRes?.data|| []

  const currentInvoice = invoices[0]

  // Generate invoice
  const generateMut = useMutation({
    mutationFn: () => feesAPI.generateInvoice(semester),
    onSuccess:  () => { toast.success('Invoice generated!'); qc.invalidateQueries({ queryKey:['invoices'] }) },
    onError:    (e:any) => toast.error(e?.response?.data?.error || 'Could not generate invoice.'),
  })

  // Initiate Paystack payment
  const payMut = useMutation({
    mutationFn: (invoiceId: string) => feesAPI.initiatePayment(invoiceId),
    onSuccess: (res) => {
      const url = (res as any)?.data?.authorization_url
      if (url) {
        toast.success('Redirecting to Paystack...')
        window.location.href = url  // redirect to Paystack
      } else {
        toast.success('Payment initiated. Check your email for next steps.')
      }
    },
    onError: (e:any) => toast.error(e?.response?.data?.error || 'Payment failed. Try again.'),
  })

  const balance   = currentInvoice ? parseFloat(currentInvoice.total_amount) - parseFloat(currentInvoice.amount_paid||0) : 0
  const pieData   = currentInvoice ? [
    { name:'Paid',        value: parseFloat(currentInvoice.amount_paid||0),                color:'#00A85A' },
    { name:'Outstanding', value: Math.max(0, parseFloat(currentInvoice.total_amount) - parseFloat(currentInvoice.amount_paid||0)), color:'#EF4444' },
  ] : []

  const CAT_COLORS: Record<string,string> = {
    tuition:'#00A85A', acceptance:'#3B82F6', library:'#D4A017',
    exam:'#8B5CF6', departmental:'#F97316', hostel:'#EC4899',
    medical:'#EF4444', sport:'#06B6D4', other:'#888',
  }

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Paystack verification banner */}
      {verifying && (
        <div className="glass border border-primary/25 rounded-2xl px-5 py-4 flex items-center gap-3">
          <span className="w-5 h-5 border-2 border-primary/40 border-t-primary-light rounded-full animate-spin flex-shrink-0"/>
          <p className="text-sm text-white/70">Verifying your payment, please wait…</p>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center">
            <IconFees size={20} className="text-primary-light"/>
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-white">Fees & Payments</h2>
            <p className="text-xs text-white/40">2025/2026 Academic Session</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="glass rounded-xl p-1 flex gap-1 border border-white/[0.07] w-fit">
        {([
          { key:'invoice', label:'My Invoice',     Icon:IconReceipt },
          { key:'history', label:'Payment History', Icon:IconCheck   },
          { key:'types',   label:'Fee Schedule',    Icon:IconFees    },
        ] as const).map(({ key, label, Icon }) => (
          <button key={key} onClick={()=>setTab(key)}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab===key ? 'bg-primary text-white shadow-glow-sm' : 'text-white/45 hover:text-white/70'
            }`}>
            <Icon size={14}/> {label}
          </button>
        ))}
      </div>

      {/* ── INVOICE TAB ── */}
      {tab==='invoice' && (
        loadInv ? (
          <div className="space-y-4">{Array.from({length:2}).map((_,i)=><div key={i} className="glass rounded-2xl h-40 skeleton"/>)}</div>
        ) : !currentInvoice ? (
          <div className="glass border border-white/[0.07] rounded-2xl p-16 text-center">
            <IconFees size={52} className="text-white/10 mx-auto mb-5"/>
            <h3 className="font-bold text-white/50 text-base mb-2">No Invoice Generated</h3>
            <p className="text-white/30 text-sm mb-6">Generate your semester invoice to view fees and make payments.</p>
            <div className="flex items-center justify-center gap-3">
              <select value={semester} onChange={e=>setSemester(e.target.value)}
                className="glass-input rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none">
                <option value="first">First Semester</option>
                <option value="second">Second Semester</option>
              </select>
              <button onClick={()=>generateMut.mutate()} disabled={generateMut.isPending}
                className="btn-primary rounded-xl px-6 py-2.5 text-sm font-bold text-white disabled:opacity-40 flex items-center gap-2">
                {generateMut.isPending
                  ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Generating…</>
                  : <><IconReceipt size={14}/>Generate Invoice</>}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label:'Total Amount', value:formatNaira(currentInvoice.total_amount), accent:'#3B82F6' },
                { label:'Amount Paid',  value:formatNaira(currentInvoice.amount_paid),  accent:'#00A85A' },
                { label:'Balance Due',  value:formatNaira(balance),                     accent: balance>0?'#EF4444':'#00A85A' },
                { label:'Due Date',     value:formatDate(currentInvoice.due_date, true), accent:'#D4A017' },
              ].map(({ label, value, accent }) => (
                <div key={label} className="glass border border-white/[0.07] rounded-2xl p-5 relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-0.5" style={{background:`linear-gradient(90deg,${accent},transparent)`}}/>
                  <div className="text-xs text-white/40 mb-1">{label}</div>
                  <div className="text-lg font-extrabold" style={{color:accent}}>{value}</div>
                </div>
              ))}
            </div>

            {/* Invoice card */}
            <div className="glass border border-white/[0.07] rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
                <div>
                  <p className="font-bold text-sm text-white">{currentInvoice.invoice_no}</p>
                  <p className="text-xs text-white/40 mt-0.5">Generated {formatDate(currentInvoice.generated_at, true)}</p>
                </div>
                <div className="flex items-center gap-3">
                  {currentInvoice.rrr && (
                    <div className="glass border border-white/[0.08] rounded-xl px-3 py-1.5">
                      <p className="text-[10px] text-white/35 uppercase tracking-wider">Remita RRR</p>
                      <p className="font-mono text-sm text-amber-400 font-bold">{currentInvoice.rrr}</p>
                    </div>
                  )}
                  <span className={`text-xs font-bold px-3 py-1.5 rounded-full border capitalize ${STATUS_META[currentInvoice.status]?.cls}`}>
                    {STATUS_META[currentInvoice.status]?.label}
                  </span>
                </div>
              </div>

              {/* Fee breakdown */}
              {currentInvoice.fee_types?.length > 0 && (
                <div className="divide-y divide-white/[0.04]">
                  {currentInvoice.fee_types.map((ft:any) => (
                    <div key={ft.id} className="flex items-center justify-between px-5 py-3.5">
                      <div>
                        <p className="text-sm text-white/80">{ft.name}</p>
                        <p className="text-[11px] text-white/35 capitalize mt-0.5">{ft.category} · {ft.is_mandatory?'Mandatory':'Optional'}</p>
                      </div>
                      <span className="font-bold text-sm text-white">{formatNaira(ft.amount)}</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between px-5 py-4 bg-white/[0.02]">
                    <span className="font-bold text-sm text-white">Total</span>
                    <span className="font-extrabold text-lg text-white">{formatNaira(currentInvoice.total_amount)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Chart + payment action */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Pie chart */}
              <div className="glass border border-white/[0.07] rounded-2xl p-5 flex items-center gap-5">
                <div className="h-36 w-36 flex-shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={36} outerRadius={60}
                        dataKey="value" paddingAngle={2} strokeWidth={0}>
                        {pieData.map((e,i)=><Cell key={i} fill={e.color} opacity={0.9}/>)}
                      </Pie>
                      <Tooltip content={<GlassTooltip/>}/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2">
                  {pieData.map(p=>(
                    <div key={p.name} className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{background:p.color}}/>
                      <span className="text-xs text-white/50">{p.name}:</span>
                      <span className="text-sm font-bold text-white">{formatNaira(p.value)}</span>
                    </div>
                  ))}
                  <div className="pt-1 border-t border-white/[0.06]">
                    <p className="text-[11px] text-white/30">
                      {parseFloat(currentInvoice.amount_paid)>0
                        ? `${((parseFloat(currentInvoice.amount_paid)/parseFloat(currentInvoice.total_amount))*100).toFixed(0)}% paid`
                        : 'No payment made yet'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Payment action */}
              <div className="glass border border-primary/20 rounded-2xl p-6 flex flex-col justify-between">
                {currentInvoice.status === 'paid' ? (
                  <div className="h-full flex flex-col items-center justify-center text-center gap-3">
                    <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center">
                      <IconCheck size={28} className="text-primary-light"/>
                    </div>
                    <p className="font-bold text-white">All fees cleared!</p>
                    <p className="text-xs text-white/40">Your account is in good standing.</p>
                  </div>
                ) : (
                  <>
                    <div className="mb-5">
                      <p className="text-xs text-white/40 mb-1">Amount Due</p>
                      <p className="text-4xl font-extrabold text-red-400">{formatNaira(balance)}</p>
                      {currentInvoice.rrr && (
                        <p className="text-xs text-white/40 mt-2">
                          Pay via Remita using RRR: <span className="font-mono font-bold text-amber-400">{currentInvoice.rrr}</span>
                        </p>
                      )}
                    </div>

                    <div className="space-y-3">
                      {/* Pay via Paystack */}
                      <button
                        onClick={()=>payMut.mutate(currentInvoice.id)}
                        disabled={payMut.isPending||balance<=0}
                        className="btn-primary w-full rounded-xl py-3.5 text-sm font-bold text-white disabled:opacity-40 flex items-center justify-center gap-2">
                        {payMut.isPending
                          ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Connecting to Paystack…</>
                          : <>💳 Pay {formatNaira(balance)} via Paystack</>}
                      </button>

                      <p className="text-[11px] text-white/25 text-center">
                        You will be redirected to Paystack's secure payment page.
                        Supports cards, bank transfer, and USSD.
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )
      )}

      {/* ── PAYMENT HISTORY TAB ── */}
      {tab==='history' && (
        loadHist ? (
          <div className="space-y-2">{Array.from({length:4}).map((_,i)=><div key={i} className="glass rounded-xl h-12 skeleton"/>)}</div>
        ) : payments.length===0 ? (
          <div className="glass border border-white/[0.07] rounded-2xl p-16 text-center">
            <IconReceipt size={48} className="text-white/15 mx-auto mb-4"/>
            <p className="text-white/40">No payment records yet.</p>
          </div>
        ) : (
          <div className="glass border border-white/[0.07] rounded-2xl overflow-hidden">
            {/* Mobile card list */}
            <div className="md:hidden p-3 flex flex-col gap-2.5">
              <MobileListMeta>{payments.length} payments</MobileListMeta>
              {payments.map((p: any) => (
                <MobileRow
                  key={p.id}
                  chevron={false}
                  leading={<IconReceipt size={16} />}
                  leadingClassName="bg-primary/15 text-primary-light"
                  title={formatNaira(p.amount)}
                  subtitle={p.transaction_ref}
                  caption={`${formatDate(p.payment_date || p.created_at, true)} · ${p.gateway}`}
                  badge={{
                    label: p.is_verified ? 'Verified' : 'Pending',
                    className: p.is_verified ? 'bg-primary/15 text-primary-light' : 'bg-amber-500/15 text-amber-400',
                  }}
                />
              ))}
            </div>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] text-[11px] uppercase tracking-wider text-white/30">
                    {['Date','Reference','Amount','Gateway','Status'].map(h=>(
                      <th key={h} className="px-5 py-3.5 font-semibold text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {payments.map((p:any)=>(
                    <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-5 py-3.5 text-xs text-white/50">{formatDate(p.payment_date||p.created_at, true)}</td>
                      <td className="px-5 py-3.5 font-mono text-xs text-cyan-400">{p.transaction_ref}</td>
                      <td className="px-5 py-3.5 font-bold text-white">{formatNaira(p.amount)}</td>
                      <td className="px-5 py-3.5 text-xs text-white/50 capitalize">{p.gateway}</td>
                      <td className="px-5 py-3.5">
                        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border flex items-center gap-1 w-fit ${
                          p.is_verified
                            ? 'bg-primary/15 text-primary-light border-primary/25'
                            : 'bg-amber-500/15 text-amber-400 border-amber-500/25'
                        }`}>
                          {p.is_verified ? <><IconCheck size={10}/>Verified</> : <><IconClock size={10}/>Pending</>}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {/* ── FEE TYPES TAB ── */}
      {tab==='types' && (
        loadTypes ? (
          <div className="space-y-2">{Array.from({length:5}).map((_,i)=><div key={i} className="glass rounded-xl h-12 skeleton"/>)}</div>
        ) : feeTypes.length===0 ? (
          <div className="glass border border-white/[0.07] rounded-2xl p-16 text-center">
            <IconFees size={48} className="text-white/15 mx-auto mb-4"/>
            <p className="text-white/40">No fee schedule published yet.</p>
          </div>
        ) : (
          <div className="glass border border-white/[0.07] rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/[0.06]">
              <h3 className="font-bold text-sm text-white">Current Session Fee Schedule</h3>
            </div>
            <div className="divide-y divide-white/[0.04]">
              {feeTypes.map((ft:any)=>{
                const color = CAT_COLORS[ft.category]||'#888'
                return (
                  <div key={ft.id} className="flex items-center gap-4 px-5 py-4">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{background:color}}/>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white font-medium">{ft.name}</p>
                      <div className="flex gap-2 mt-0.5 text-[11px] text-white/35">
                        <span className="capitalize">{ft.category}</span>
                        {ft.semester && <span>· {ft.semester} sem</span>}
                        {ft.level && <span>· {ft.level} Level only</span>}
                        {ft.description && <span>· {ft.description}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {!ft.is_mandatory && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/40 border border-white/15">
                          Optional
                        </span>
                      )}
                      <span className="font-bold text-sm text-white">{formatNaira(ft.amount)}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      )}
    </div>
  )
}
