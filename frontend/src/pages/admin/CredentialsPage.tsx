/**
 * FUGUSAU Portal — Credentials Page (fixed)
 *
 * Root cause: Backend uses MultiPartParser and expects:
 *   - doc_type  (string, one of the Credential.DOC_TYPE_CHOICES)
 *   - file      (actual file upload)
 *
 * Previous version was sending credential_type + request_reason as JSON
 * to a form-parser endpoint → 400 every time.
 *
 * Also fixed:
 *   - doc_type values now match backend choices (WAEC, NECO, JAMB, etc.)
 *   - Upload uses FormData, not plain object
 *   - Download link calls /credentials/<id>/download/
 *   - Status badges use backend status values (pending, reviewing, authentic, etc.)
 */
import { useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { credentialsAPI } from '@/services/api'
import { formatDate } from '@/utils'
import toast from 'react-hot-toast'
import {
  IconCredentials, IconPlus, IconCheck, IconClock,
  IconDownload, IconWarning, IconAI, IconX,
} from '@/components/icons'

// Must match Credential.DOC_TYPE_CHOICES on the backend
const DOC_TYPES = [
  { value: 'WAEC',       label: 'WAEC SSCE Result'             },
  { value: 'NECO',       label: 'NECO SSCE Result'             },
  { value: 'JAMB',       label: 'JAMB Result'                  },
  { value: 'BIRTH_CERT', label: 'Birth Certificate'            },
  { value: 'LGC',        label: 'Local Government Certificate' },
  { value: 'NYSC',       label: 'NYSC Certificate'             },
  { value: 'DEGREE',     label: 'University Degree'            },
  { value: 'OTHER',      label: 'Other'                        },
]

function StatusIcon({ status, size=11 }: { status: string; size?: number }) {
  if (status === 'authentic') return <IconCheck size={size} />
  if (status === 'pending') return <IconClock size={size} />
  if (status === 'reviewing') return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
  if (status === 'suspicious') return <IconWarning size={size} />
  return <IconX size={size} />
}

// Must match Credential.STATUS_CHOICES on the backend
const STATUS_META: Record<string, { cls: string; label: string }> = {
  pending:    { cls: 'bg-amber-500/15 text-amber-400 border-amber-500/25',   label: 'Pending'         },
  reviewing:  { cls: 'bg-blue-500/15 text-blue-400 border-blue-500/25',      label: 'Under Review'    },
  authentic:  { cls: 'bg-primary/15 text-primary-light border-primary/25',   label: 'Verified'        },
  suspicious: { cls: 'bg-orange-500/15 text-orange-400 border-orange-500/25',label: 'Suspicious'      },
  forged:     { cls: 'bg-red-500/15 text-red-400 border-red-500/25',         label: 'Rejected/Forged' },
  rejected:   { cls: 'bg-red-500/15 text-red-400 border-red-500/25',         label: 'Rejected'        },
}

export default function CredentialsPage() {
  const [showForm, setShowForm] = useState(false)
  const [docType, setDocType]   = useState('')
  const [file, setFile]         = useState<File | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const qc = useQueryClient()

  const { data, isLoading } = useQuery<any, any>({
    queryKey: ['credentials'],
    queryFn:  credentialsAPI.getAll,
  })

  const uploadMutation = useMutation({
    mutationFn: () => {
      if (!file || !docType) throw new Error('Missing fields')
      const fd = new FormData()
      fd.append('doc_type', docType)
      fd.append('file', file)
      return credentialsAPI.request(fd)    // api.ts: api.post('/credentials/', data)
    },
    onSuccess: () => {
      toast.success('Document uploaded successfully.')
      setShowForm(false)
      setDocType('')
      setFile(null)
      qc.invalidateQueries({ queryKey: ['credentials'] })
    },
    onError: (err: any) => {
      const msg =
        err?.response?.data?.doc_type?.[0] ||
        err?.response?.data?.file?.[0] ||
        err?.response?.data?.detail ||
        'Upload failed. Try again.'
      toast.error(msg)
    },
  })

  const credentials: any[] = data?.data?.results || data?.data || []

  function handleCancel() {
    setShowForm(false)
    setDocType('')
    setFile(null)
  }

  function handleDownload(id: string, filename: string) {
    // calls GET /api/v1/credentials/<id>/download/
    credentialsAPI.download(id).then((res: any) => {
      const url  = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href  = url
      link.setAttribute('download', filename || 'credential')
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    }).catch(() => toast.error('Download failed.'))
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center">
            <IconCredentials size={20} className="text-primary-light" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-white">My Documents</h2>
            <p className="text-xs text-white/40">{credentials.length} uploaded</p>
          </div>
        </div>
        <button
          onClick={() => (showForm ? handleCancel() : setShowForm(true))}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all ${
            showForm
              ? 'glass border border-white/[0.1] text-white/60'
              : 'btn-primary text-white'
          }`}
        >
          {showForm ? <><IconX size={14} /> Cancel</> : <><IconPlus size={14} /> Upload Document</>}
        </button>
      </div>

      {/* Upload form */}
      {showForm && (
        <div className="glass border border-white/[0.07] rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <IconAI size={14} className="text-gold-light" />
            <h3 className="font-bold text-sm text-white">Upload New Document</h3>
            <span className="text-[11px] text-white/30 ml-auto">
              AI analysis runs automatically after upload
            </span>
          </div>

          <div>
            <label className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/35 block mb-2">
              Document Type *
            </label>
            <select
              value={docType}
              onChange={e => setDocType(e.target.value)}
              className="glass-input w-full rounded-xl px-4 py-3 text-sm text-white focus:outline-none"
            >
              <option value="">Select document type…</option>
              {DOC_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/35 block mb-2">
              File (PDF or Image) *
            </label>
            <div
              onClick={() => fileRef.current?.click()}
              className={`glass-input w-full rounded-xl px-4 py-6 text-sm text-center cursor-pointer transition-colors border-2 border-dashed ${
                file
                  ? 'border-primary/40 text-primary-light'
                  : 'border-white/10 text-white/30 hover:border-white/25'
              }`}
            >
              {file ? (
                <span className="flex items-center justify-center gap-2">
                  <IconCheck size={14} />
                  {file.name} ({(file.size / 1024).toFixed(1)} KB)
                </span>
              ) : (
                'Click to choose file (PDF, JPG, PNG)'
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              className="hidden"
              onChange={e => setFile(e.target.files?.[0] || null)}
            />
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={() => uploadMutation.mutate()}
              disabled={!docType || !file || uploadMutation.isPending}
              className="btn-primary rounded-xl px-6 py-2.5 text-sm font-bold text-white disabled:opacity-40 flex items-center gap-2"
            >
              {uploadMutation.isPending ? (
                <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Uploading…</>
              ) : (
                <><IconCheck size={14} /> Upload Document</>
              )}
            </button>
            <p className="text-[11px] text-white/30">Max 10 MB per file.</p>
          </div>
        </div>
      )}

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="glass rounded-2xl h-24 skeleton" />
          ))}
        </div>
      ) : credentials.length === 0 ? (
        <div className="glass border border-white/[0.07] rounded-2xl p-20 text-center">
          <IconCredentials size={48} className="text-white/15 mx-auto mb-4" />
          <p className="text-white/40">No documents uploaded yet.</p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-4 btn-primary rounded-xl px-6 py-2.5 text-sm font-bold text-white flex items-center gap-2 mx-auto"
          >
            <IconPlus size={14} /> Upload your first document
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {credentials.map((c: any) => {
            const meta = STATUS_META[c.status] || STATUS_META.pending
            const typeLabel = DOC_TYPES.find(t => t.value === c.doc_type)?.label || c.doc_type_display || c.doc_type
            return (
              <div
                key={c.id}
                className="glass glass-hover border border-white/[0.07] rounded-2xl p-5 flex items-center gap-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <p className="font-semibold text-sm text-white">{typeLabel}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${meta.cls} flex items-center gap-1`}>
                      <StatusIcon status={c.status} size={11} />
                      <span>{meta.label}</span>
                    </span>
                    {c.ai_verdict && (
                      <span className="text-[10px] text-white/30 font-mono">
                        AI: {c.ai_verdict} ({c.forgery_risk_score}/100)
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-white/30 truncate">{c.original_filename}</p>
                  <p className="text-[11px] text-white/25 mt-0.5">
                    Uploaded {formatDate(c.uploaded_at, true)}
                    {c.reviewed_at && ` · Reviewed ${formatDate(c.reviewed_at, true)}`}
                  </p>
                  {c.review_notes && (
                    <p className="text-[11px] text-amber-400/70 mt-1 italic">
                      Note: {c.review_notes}
                    </p>
                  )}
                </div>

                <button
                  onClick={() => handleDownload(c.id, c.original_filename)}
                  className="flex-shrink-0 flex items-center gap-1.5 text-[11px] text-white/40 hover:text-primary-light transition-colors font-semibold"
                >
                  <IconDownload size={13} /> Download
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
