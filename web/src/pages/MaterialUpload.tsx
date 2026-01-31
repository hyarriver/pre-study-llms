import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { materialsApi } from '@/api/materials'
import { useAuthStore } from '@/store/authStore'
import { getApiErrorMessage } from '@/lib/utils'
import { Upload, FileText, Clock, CheckCircle2, XCircle, Trash2 } from 'lucide-react'

export default function MaterialUpload() {
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState('')

  const { data: submissions = [], isLoading } = useQuery({
    queryKey: ['my-submissions'],
    queryFn: () => materialsApi.getMySubmissions().then((r) => r.data),
    enabled: !!user,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => materialsApi.deleteMySubmission(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-submissions'] })
    },
  })

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error('请选择文件')
      const formData = new FormData()
      formData.append('title', title.trim())
      formData.append('description', description.trim())
      formData.append('file', file)
      return materialsApi.submit(formData)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-submissions'] })
      queryClient.invalidateQueries({ queryKey: ['chapters'] })
      setTitle('')
      setDescription('')
      setFile(null)
      setError('')
    },
    onError: (err: unknown) => {
      setError(getApiErrorMessage(err, '提交失败，请重试'))
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!title.trim()) {
      setError('请输入标题')
      return
    }
    if (!file) {
      setError('请选择 PDF 或 DOCX 文件')
      return
    }
    const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'))
    if (!['.pdf', '.docx'].includes(ext)) {
      setError('仅支持 PDF 和 DOCX 格式')
      return
    }
    submitMutation.mutate()
  }

  if (!user) {
    return (
      <div className="space-y-4 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold">上传学习资料</h1>
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground mb-4">请先登录后再上传学习资料</p>
            <Button asChild>
              <Link to={`/login?redirect=${encodeURIComponent('/materials/upload')}`}>登录</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold">上传学习资料</h1>
      <p className="text-muted-foreground text-sm">
        上传 PDF 或 DOCX 格式的学习文档，经管理员审核通过后将作为新章节加入平台，支持文档下载和章节考核。
      </p>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            提交新资料
          </CardTitle>
          <CardDescription>支持 PDF、DOCX，单个文件不超过 20MB</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">标题</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="请输入资料标题"
                maxLength={200}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">描述（选填）</label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="简短描述资料内容"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">文件</label>
              <Input
                type="file"
                accept=".pdf,.docx"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={submitMutation.isPending}>
              {submitMutation.isPending ? '提交中...' : '提交审核'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            我的提交
          </CardTitle>
          <CardDescription>查看您提交的资料审核状态</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <ul className="space-y-3">
              {[1, 2, 3].map((i) => (
                <li key={i} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                  <div className="min-w-0 flex-1 space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                  <Skeleton className="h-5 w-16 rounded" />
                </li>
              ))}
            </ul>
          ) : submissions.length === 0 ? (
            <p className="text-muted-foreground text-sm">暂无提交记录</p>
          ) : (
            <ul className="space-y-3">
              {submissions.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{s.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(s.created_at).toLocaleString()} · {s.file_type.toUpperCase()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {s.status === 'pending' && (
                      <span className="flex items-center gap-1 text-amber-600 text-sm">
                        <Clock className="h-4 w-4" /> 待审核
                      </span>
                    )}
                    {s.status === 'approved' && (
                      <span className="flex items-center gap-1 text-green-600 text-sm">
                        <CheckCircle2 className="h-4 w-4" /> 已通过
                        {s.chapter_id && (
                          <Button variant="link" size="sm" asChild className="h-auto p-0 ml-1">
                            <Link to={`/chapters/${s.chapter_id}`}>查看</Link>
                          </Button>
                        )}
                      </span>
                    )}
                    {s.status === 'rejected' && (
                      <span className="flex items-center gap-1 text-destructive text-sm" title={s.reject_reason || ''}>
                        <XCircle className="h-4 w-4" /> 已驳回
                      </span>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                      onClick={() => deleteMutation.mutate(s.id)}
                      disabled={deleteMutation.isPending}
                      title="删除"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
