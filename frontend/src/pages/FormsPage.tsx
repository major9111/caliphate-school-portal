/**
 * FUGUSAU Portal — Forms & Documents
 *
 * There is no /forms/ backend app. Forms are static PDF files served by
 * Nginx from /static/forms/<filename>.pdf
 *
 * To add a real form:
 *   1. Place the PDF in backend/static/forms/
 *   2. Add it to FORMS array below with the correct filename
 */
import { useState } from 'react'
import {
  IconForms, IconSearch, IconDownload, IconCourses,
  IconFees, IconHostel, IconProfile, IconGradCap, IconCalendar,
} from '@/components/icons'

type Form = {
  id: number
  category: string
  title: string
  desc: string
  filename: string          // actual PDF filename in /static/forms/
  Icon: React.FC<any>
  accent: string
}

// ── Form catalogue ────────────────────────────────────────────────────────────
// filename must match actual file in backend/static/forms/
const FORMS: Form[] = [
  // Academic
  { id:1,  category:'Academic',  title:'Course Registration Form',      desc:'Official course registration for the current semester',       filename:'course-registration.pdf',      Icon:IconCourses,   accent:'#00A85A' },
  { id:2,  category:'Academic',  title:'Course Deferral Form',          desc:'Apply to defer course registration to a later semester',      filename:'course-deferral.pdf',          Icon:IconCourses,   accent:'#00A85A' },
  { id:3,  category:'Academic',  title:'Change of Course Application',  desc:'Apply to change your programme of study',                     filename:'change-of-course.pdf',         Icon:IconCourses,   accent:'#3B82F6' },
  { id:4,  category:'Academic',  title:'Add/Drop Course Form',          desc:'Add or drop a registered course within the allowed period',    filename:'add-drop-course.pdf',          Icon:IconCourses,   accent:'#3B82F6' },
  { id:5,  category:'Academic',  title:'Exam Malpractice Declaration',  desc:'Mandatory declaration to be signed before each examination',   filename:'exam-declaration.pdf',         Icon:IconGradCap,   accent:'#8B5CF6' },
  { id:6,  category:'Academic',  title:'Special Examination Request',   desc:'Apply to sit an exam outside the scheduled period',           filename:'special-exam-request.pdf',     Icon:IconCalendar,  accent:'#8B5CF6' },
  { id:7,  category:'Academic',  title:'Result Correction Form',        desc:'Report an error in a published exam result',                  filename:'result-correction.pdf',        Icon:IconGradCap,   accent:'#EF4444' },
  // Financial
  { id:8,  category:'Financial', title:'Fee Waiver Application',        desc:'Apply for a full or partial school fee waiver',               filename:'fee-waiver.pdf',               Icon:IconFees,      accent:'#D4A017' },
  { id:9,  category:'Financial', title:'Bursary Application Form',      desc:'Apply for university financial assistance / bursary',         filename:'bursary-application.pdf',      Icon:IconFees,      accent:'#D4A017' },
  { id:10, category:'Financial', title:'Fee Refund Request',            desc:'Request a refund for overpayment or withdrawal',              filename:'fee-refund.pdf',               Icon:IconFees,      accent:'#F97316' },
  // Medical
  { id:11, category:'Medical',   title:'Medical Exemption Form',        desc:'Medical certificate required for exam/course deferral',       filename:'medical-exemption.pdf',        Icon:IconProfile,   accent:'#EC4899' },
  { id:12, category:'Medical',   title:'Annual Health Declaration',     desc:'Mandatory annual student health declaration',                 filename:'health-declaration.pdf',       Icon:IconProfile,   accent:'#EC4899' },
  // Hostel
  { id:13, category:'Hostel',    title:'Hostel Transfer Request',       desc:'Request to be transferred to another hostel or block',        filename:'hostel-transfer.pdf',          Icon:IconHostel,    accent:'#8B5CF6' },
  { id:14, category:'Hostel',    title:'Room Maintenance Report',       desc:'Report a maintenance issue in your room to facilities',       filename:'room-maintenance.pdf',         Icon:IconHostel,    accent:'#8B5CF6' },
  // General
  { id:15, category:'General',   title:'Identity Verification Form',   desc:'Required for document collection at the registry',            filename:'identity-verification.pdf',    Icon:IconForms,     accent:'#F97316' },
  { id:16, category:'General',   title:'Student Clearance Form',       desc:'General clearance form for graduating / exiting students',    filename:'student-clearance.pdf',        Icon:IconGradCap,   accent:'#F97316' },
  { id:17, category:'General',   title:'Name Correction Form',         desc:'Apply to correct an error in your official name',             filename:'name-correction.pdf',          Icon:IconProfile,   accent:'#3B82F6' },
  { id:18, category:'General',   title:'Deferment of Admission',       desc:'Apply to defer your admission to the next academic session',  filename:'admission-deferment.pdf',      Icon:IconGradCap,   accent:'#EF4444' },
]

const CATEGORIES = ['All', ...Array.from(new Set(FORMS.map(f => f.category)))]

const CAT_COLOR: Record<string, string> = {
  Academic:'#00A85A', Financial:'#D4A017',
  Medical:'#EC4899',  Hostel:'#8B5CF6', General:'#F97316',
}

// Resolve the actual download URL
// Forms live at /static/forms/<filename> served by Nginx
function formUrl(filename: string): string {
  return `/static/forms/${filename}`
}

function FormCard({ form }: { form: Form }) {
  const { Icon, accent, title, desc, category, filename } = form

  const handleDownload = () => {
    // Open in new tab — browser will either display or download the PDF
    window.open(formUrl(filename), '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="glass glass-hover border border-white/[0.07] rounded-2xl p-5 flex flex-col gap-4 relative overflow-hidden group">
      {/* Top accent line */}
      <div className="absolute top-0 left-0 right-0 h-0.5"
        style={{ background: `linear-gradient(90deg, ${accent}, transparent)` }} />

      {/* Icon + category */}
      <div className="flex items-start justify-between gap-2">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${accent}18`, border: `1px solid ${accent}30` }}>
          <Icon size={18}  color={accent } />
        </div>
        <span className="text-[10px] font-semibold px-2 py-1 rounded-lg capitalize flex-shrink-0"
          style={{ background: `${CAT_COLOR[category] || accent}15`, color: CAT_COLOR[category] || accent, border: `1px solid ${CAT_COLOR[category] || accent}30` }}>
          {category}
        </span>
      </div>

      {/* Title + description */}
      <div className="flex-1">
        <h3 className="font-bold text-sm text-white leading-snug mb-1.5">{title}</h3>
        <p className="text-xs text-white/40 leading-relaxed">{desc}</p>
      </div>

      {/* Download button */}
      <button onClick={handleDownload}
        className="flex items-center gap-2 text-xs font-bold transition-all group-hover:gap-3 mt-auto pt-3 border-t border-white/[0.05]"
        style={{ color: accent }}>
        <IconDownload size={13} />
        Download PDF
        <span className="text-[10px] text-white/25 ml-auto font-normal font-mono">{filename}</span>
      </button>
    </div>
  )
}

export default function FormsPage() {
  const [activeCategory, setActiveCategory] = useState('All')
  const [search, setSearch] = useState('')

  const filtered = FORMS.filter(f => {
    const matchCat    = activeCategory === 'All' || f.category === activeCategory
    const matchSearch = f.title.toLowerCase().includes(search.toLowerCase()) ||
                        f.desc.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-500/15 border border-orange-500/25 flex items-center justify-center">
            <IconForms size={20} className="text-orange-400" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-white">Forms & Documents</h2>
            <p className="text-xs text-white/40">Download official university forms as PDF</p>
          </div>
        </div>
      </div>

      {/* Info banner */}
      <div className="glass border border-primary/20 rounded-2xl px-5 py-4 flex items-start gap-3">
        <div className="w-1.5 h-1.5 rounded-full bg-primary-light mt-1.5 flex-shrink-0" />
        <p className="text-xs text-white/50 leading-relaxed">
          All forms open as PDF in a new tab. Print, fill by hand, and submit to the relevant office.
          For digital submission, attach the scanned form to a credential request in the{' '}
          <span className="text-primary-light font-semibold">Credential Verifier</span> section.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <IconSearch size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search forms…"
            className="glass-input w-full rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-white/25" />
        </div>

        {/* Category tabs */}
        <div className="glass rounded-xl p-1 flex gap-1 border border-white/[0.07] flex-wrap">
          {CATEGORIES.map(cat => {
            const color = cat === 'All' ? undefined : CAT_COLOR[cat]
            const isActive = activeCategory === cat
            return (
              <button key={cat} onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                  isActive ? 'text-white' : 'text-white/40 hover:text-white/70'
                }`}
                style={isActive ? {
                  background: color ? `${color}22` : 'rgba(0,107,63,0.25)',
                  color: color || '#00A85A',
                } : {}}>
                {cat}
              </button>
            )
          })}
        </div>
      </div>

      {/* Count */}
      <p className="text-xs text-white/30">
        {filtered.length} form{filtered.length !== 1 ? 's' : ''} available
      </p>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="glass border border-white/[0.07] rounded-2xl p-20 text-center">
          <IconForms size={48} className="text-white/15 mx-auto mb-4" />
          <p className="text-white/40">No forms match your search.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(form => <FormCard key={form.id} form={form} />)}
        </div>
      )}

      {/* Footer note for admins */}
      <div className="glass border border-white/[0.05] rounded-xl px-5 py-3">
        <p className="text-[11px] text-white/25 leading-relaxed">
          <span className="text-white/40 font-semibold">Admin note:</span> To add or update forms, place PDF files in{' '}
          <code className="font-mono text-primary-light/60">backend/static/forms/</code> and run{' '}
          <code className="font-mono text-primary-light/60">python manage.py collectstatic</code>.
          Then add the entry to the FORMS array in{' '}
          <code className="font-mono text-primary-light/60">frontend/src/pages/FormsPage.tsx</code>.
        </p>
      </div>
    </div>
  )
}
