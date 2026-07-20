import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { DataTable } from '@/components/ui/data-table'
import { RefreshCw, Shield } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'

interface AuditLog {
  id: number; user_id: string | null; action: string; module: string
  resource_id: string | null; details: string | null; ip_address: string | null
  user_agent: string | null; success: boolean; created_at: string
}

export default function AuditLogsPage() {
  const [filters, setFilters] = useState({ module: '', action: '' })
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['audit-logs', filters],
    queryFn: async () => {
      const params: Record<string, string | number> = { limit: 100 }
      if (filters.module) params.module = filters.module
      if (filters.action) params.action = filters.action
      return (await api.get<{ items: AuditLog[]; total: number }>('/audit/audit-logs', { params })).data
    },
  })

  const logs = data?.items || []

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div><h1 className="text-3xl font-bold">Audit Logs</h1><p className="text-secondary-500 mt-1">{data?.total || 0} total log entries</p></div>
        <Button variant="outline" onClick={() => refetch()}><RefreshCw className="h-4 w-4 mr-2" />Refresh</Button>
      </div>

      <Card><CardContent className="p-4 grid sm:grid-cols-2 gap-4">
        <div><Label>Filter by Module</Label><Input className="mt-1" placeholder="e.g. students, auth, finance" value={filters.module} onChange={e => setFilters(f => ({ ...f, module: e.target.value }))} /></div>
        <div><Label>Filter by Action</Label><Input className="mt-1" placeholder="e.g. login, create, delete" value={filters.action} onChange={e => setFilters(f => ({ ...f, action: e.target.value }))} /></div>
      </CardContent></Card>

      <Card><CardContent className="p-6">
        <DataTable
          isLoading={isLoading}
          data={logs}
          rowKey={l => String(l.id)}
          emptyIcon={<Shield className="h-10 w-10" />}
          emptyTitle="No audit logs"
          emptyDescription="Audit logs will appear here as users interact with the system."
          columns={[
            { key: 'time', header: 'Time', render: l => <span className="text-xs font-mono whitespace-nowrap">{new Date(l.created_at).toLocaleString()}</span> },
            { key: 'module', header: 'Module', render: l => <Badge variant="secondary">{l.module}</Badge> },
            { key: 'action', header: 'Action', render: l => l.action },
            { key: 'user', header: 'User ID', render: l => <span className="text-xs font-mono">{l.user_id ? l.user_id.slice(0, 8) + '…' : 'system'}</span> },
            { key: 'ip', header: 'IP', render: l => <span className="text-xs">{l.ip_address || '—'}</span> },
            { key: 'status', header: 'Status', render: l => <Badge variant={l.success ? 'success' : 'danger'}>{l.success ? 'OK' : 'FAIL'}</Badge> },
            { key: 'detail', header: '', render: l => (
              <button onClick={() => setSelectedLog(l)} className="text-xs text-primary-600 hover:underline whitespace-nowrap">View Details</button>
            )},
          ]}
        />
      </CardContent></Card>

      {/* Detail modal */}
      <Modal open={!!selectedLog} onOpenChange={() => setSelectedLog(null)} title="Audit Log Detail">
        {selectedLog && (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div><p className="text-xs text-secondary-500 mb-1">ID</p><p className="font-mono">{selectedLog.id}</p></div>
              <div><p className="text-xs text-secondary-500 mb-1">Status</p><Badge variant={selectedLog.success ? 'success' : 'danger'}>{selectedLog.success ? 'Success' : 'Failed'}</Badge></div>
              <div><p className="text-xs text-secondary-500 mb-1">Module</p><p className="font-medium">{selectedLog.module}</p></div>
              <div><p className="text-xs text-secondary-500 mb-1">Action</p><p className="font-medium">{selectedLog.action}</p></div>
              <div><p className="text-xs text-secondary-500 mb-1">User ID</p><p className="font-mono text-xs">{selectedLog.user_id || 'system'}</p></div>
              <div><p className="text-xs text-secondary-500 mb-1">Resource ID</p><p className="font-mono text-xs">{selectedLog.resource_id || '—'}</p></div>
              <div><p className="text-xs text-secondary-500 mb-1">IP Address</p><p>{selectedLog.ip_address || '—'}</p></div>
              <div><p className="text-xs text-secondary-500 mb-1">Timestamp</p><p>{new Date(selectedLog.created_at).toLocaleString()}</p></div>
            </div>
            {selectedLog.details && (
              <div><p className="text-xs text-secondary-500 mb-1">Details</p>
                <pre className="bg-secondary-50 p-3 rounded-lg text-xs overflow-x-auto whitespace-pre-wrap">{selectedLog.details}</pre>
              </div>
            )}
            {selectedLog.user_agent && (
              <div><p className="text-xs text-secondary-500 mb-1">User Agent</p>
                <p className="text-xs text-secondary-600 break-all">{selectedLog.user_agent}</p>
              </div>
            )}
            <div className="flex justify-end pt-4 border-t">
              <Button variant="outline" onClick={() => setSelectedLog(null)}>Close</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
