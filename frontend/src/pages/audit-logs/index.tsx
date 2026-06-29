import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Loader2, Shield, RefreshCw } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'

export default function AuditLogsPage() {
  const [filters, setFilters] = useState({ module: '', user_id: '' })
  
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['audit-logs', filters],
    queryFn: async () => {
      const params: any = { limit: 50 }
      if (filters.module) params.module = filters.module
      if (filters.user_id) params.user_id = filters.user_id
      const response = await api.get('/audit/audit-logs', { params })
      return response.data
    }
  })

  const logs = data?.items || []

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Shield className="h-8 w-8 text-primary-600" />
            Audit Trail
          </h1>
          <p className="text-secondary-500 mt-1">Immutable log of all system actions</p>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" /> Refresh
        </Button>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <div>
              <Label>Filter by Module</Label>
              <Input value={filters.module} onChange={e => setFilters({...filters, module: e.target.value})} placeholder="e.g., auth, students" />
            </div>
            <div>
              <Label>Filter by User ID</Label>
              <Input value={filters.user_id} onChange={e => setFilters({...filters, user_id: e.target.value})} placeholder="User UUID" />
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary-600" /></div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-secondary-500">
              <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No audit logs found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-secondary-50">
                    <th className="text-left p-3 text-xs uppercase">Timestamp</th>
                    <th className="text-left p-3 text-xs uppercase">User</th>
                    <th className="text-left p-3 text-xs uppercase">Action</th>
                    <th className="text-left p-3 text-xs uppercase">Module</th>
                    <th className="text-left p-3 text-xs uppercase">IP Address</th>
                    <th className="text-left p-3 text-xs uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-secondary-100">
                  {logs.map((log: any) => (
                    <tr key={log.id} className="hover:bg-secondary-50 text-sm">
                      <td className="p-3 text-secondary-600 whitespace-nowrap">{new Date(log.created_at).toLocaleString()}</td>
                      <td className="p-3 font-mono text-xs">{log.user_id ? `${log.user_id.substring(0, 8)}...` : 'System'}</td>
                      <td className="p-3 font-medium">{log.action.replace(/_/g, ' ')}</td>
                      <td className="p-3"><Badge variant="outline">{log.module}</Badge></td>
                      <td className="p-3 font-mono text-xs">{log.ip_address}</td>
                      <td className="p-3">
                        <Badge variant={log.success ? 'success' : 'danger'}>
                          {log.success ? 'Success' : 'Failed'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
