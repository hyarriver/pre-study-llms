import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { materialsApi } from '@/api/materials'
import { useAuthStore } from '@/store/authStore'
import type { MaterialSubmissionWithUser } from '@/types'
import { FileText, Eye, CheckCircle2, XCircle } from 'lucide-react'

export default function AdminMaterialReview() {
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const [rejectingId, setRejectingId] = useState<number | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  const { data: pending = [], isLoading } = useQuery({
    queryKey: ['admin-pending'],
    queryFn: () => materialsApi.getPendingSubmissions().then((r) => r.data),
    enabled: !!user && user.role === 'admin',
  })

  const approveMutation = useMutation({
    mutationFn: (id: number) => materialsApi.approve(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-pending'] })
      queryClient.invalidateQueries({ queryKey: ['chapters'] })
    },
  })

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason?: string }) =>
      materialsApi.reject(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-pending'] })
      queryClient.invalidateQueries({ queryKey: ['chapters'] })
      setRejectingId(null)
      setRejectReason('')
    },
  })

  const handlePreview = async (s: MaterialSubmissionWithUser) => {
    try {
      const { data } = await materialsApi.getPreview(s.id)
      const blob = new Blob([data], {
        type: s.file_type === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      })
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank', 'noopener,noreferrer')
      setTimeout(() => URL.revokeObjectURL(url), 60000)
    } catch (err) {
      console.error('预览失败:', err)
    }
  }

  const handleRejectConfirm = () => {
    if (rejectingId === null) return
    rejectMutation.mutate({ id: rejectingId, reason: rejectReason || undefined })
  }

  if (!user) {
    return (
      <div className="space-y-4 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold">管理审核</h1>
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground mb-4">请先登录</p>
            <Button asChild>
              <Link to="/login">登录</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (user.role !== 'admin') {
    return (
      <div className="space-y-4 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold">管理审核</h1>
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive">您没有管理员权限</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold">材料审核</h1>
      <p className="text-muted-foreground text-sm">
        审核用户提交的学习资料，通过后将作为新章节加入平台
      </p>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            待审核列表
          </CardTitle>
          <CardDescription>共 {pending.length} 项待审核</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <ul className="space-y-4">
              {[1, 2, 3].map((i) => (
                <li key={i} className="p-4 rounded-lg border bg-muted/30 space-y-3">
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0 flex-1 space-y-2">
                      <Skeleton className="h-5 w-48" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-3 w-64" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-8 w-16 rounded-md" />
                      <Skeleton className="h-8 w-14 rounded-md" />
                      <Skeleton className="h-8 w-14 rounded-md" />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : pending.length === 0 ? (
            <p className="text-muted-foreground text-sm">暂无待审核项</p>
          ) : (
            <ul className="space-y-4">
              {pending.map((s) => (
                <li
                  key={s.id}
                  className="p-4 rounded-lg border bg-muted/30 space-y-3"
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-lg">{s.title}</p>
                      {s.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {s.description}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        提交人：{s.user_nickname || s.user_username || '-'} ·{' '}
                        {new Date(s.created_at).toLocaleString()} ·{' '}
                        {s.file_type.toUpperCase()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePreview(s)}
                        className="gap-1"
                      >
                        <Eye className="h-4 w-4" /> 预览
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => approveMutation.mutate(s.id)}
                        disabled={approveMutation.isPending}
                        className="gap-1 bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle2 className="h-4 w-4" /> 通过
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setRejectingId(s.id)}
                        disabled={rejectMutation.isPending}
                        className="gap-1"
                      >
                        <XCircle className="h-4 w-4" /> 驳回
                      </Button>
                    </div>
                  </div>
                  {rejectingId === s.id && (
                    <div className="pt-3 border-t space-y-2">
                      <textarea
                        className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                        placeholder="驳回原因（选填）"
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                      />
                      <div className="flex gap-2">
                        <Button size="sm" variant="destructive" onClick={handleRejectConfirm}>
                          确认驳回
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setRejectingId(null)
                            setRejectReason('')
                          }}
                        >
                          取消
                        </Button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
