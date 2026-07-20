import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

import { Loader2, Users, BookOpen, DollarSign, Bell } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { portalApi } from '@/lib/api'

export default function ParentPortalPage() {
  const [parentId, setParentId] = useState('')
  const [submitted, setSubmitted] = useState(false)
  
  const { data, isLoading } = useQuery({ 
    queryKey: ['parent-portal', parentId], 
    queryFn: () => portalApi.getParentData(parentId),
    enabled: submitted
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
  }

  if (!submitted) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8">
            <div className="text-center mb-6">
              <Users className="h-12 w-12 mx-auto mb-4 text-primary-600" />
              <h2 className="text-2xl font-bold mb-2">Parent Portal</h2>
              <p className="text-secondary-500">Access your children's information</p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div><Label>Parent ID *</Label><Input value={parentId} onChange={e => setParentId(e.target.value)} placeholder="Enter your parent ID" required /></div>
              <Button type="submit" className="w-full">Access Portal</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>

  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-bold">Parent Portal</h1><p className="text-secondary-500 mt-1">Welcome, Parent</p></div>

      <div className="grid md:grid-cols-4 gap-4">
        <Card><CardContent className="p-6 flex items-center gap-4"><Users className="h-8 w-8 text-blue-600" /><div><p className="text-sm text-secondary-500">Children</p><p className="text-2xl font-bold">{data?.children?.length || 0}</p></div></CardContent></Card>
        <Card><CardContent className="p-6 flex items-center gap-4"><BookOpen className="h-8 w-8 text-green-600" /><div><p className="text-sm text-secondary-500">Results</p><p className="text-2xl font-bold">{data?.children?.reduce((sum: number, c) => sum + (c.results?.length || 0), 0) || 0}</p></div></CardContent></Card>
        <Card><CardContent className="p-6 flex items-center gap-4"><DollarSign className="h-8 w-8 text-orange-600" /><div><p className="text-sm text-secondary-500">Outstanding Fees</p><p className="text-2xl font-bold">0</p></div></CardContent></Card>
        <Card><CardContent className="p-6 flex items-center gap-4"><Bell className="h-8 w-8 text-purple-600" /><div><p className="text-sm text-secondary-500">Notifications</p><p className="text-2xl font-bold">{data?.notifications?.length || 0}</p></div></CardContent></Card>
      </div>

      {data?.notifications && data.notifications.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <h3 className="text-xl font-bold mb-4">Recent Notifications</h3>
            <div className="space-y-3">
              {data.notifications.slice(0, 5).map((n, i: number) => (
                <div key={i} className="p-3 border rounded-lg">
                  <p className="font-medium">{n.title}</p>
                  <p className="text-sm text-secondary-600">{n.message}</p>
                  <p className="text-xs text-secondary-500 mt-1">{new Date(n.created_at).toLocaleString()}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
