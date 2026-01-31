import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { materialsApi } from '@/api/materials'
import { chaptersApi, type ChapterUpdateBody } from '@/api/chapters'
import { useAuthStore } from '@/store/authStore'
import { useChapters } from '@/hooks/useChapters'
import type { MaterialSubmissionWithUser, Chapter } from '@/types'
import {
  FileText,
  Eye,
  CheckCircle2,
  XCircle,
  Trash2,
  ListOrdered,
  Pencil,
  ChevronUp,
  ChevronDown,
  X,
  Save,
  FolderOpen,
  RefreshCw,
} from 'lucide-react'

export default function AdminPage() {
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const [rejectingId, setRejectingId] = useState<number | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [editingChapter, setEditingChapter] = useState<Chapter | null>(null)
  const [editForm, setEditForm] = useState<ChapterUpdateBody>({})
  const [deletingChapterId, setDeletingChapterId] = useState<number | null>(null)
  const [deletingSubmissionId, setDeletingSubmissionId] = useState<number | null>(null)

  const { data: pending = [], isLoading: pendingLoading } = useQuery({
    queryKey: ['admin-pending'],
    queryFn: () => materialsApi.getPendingSubmissions().then((r) => r.data),
    enabled: !!user && user.role === 'admin',
  })

  const { data: allSubmissions = [], isLoading: allLoading } = useQuery({
    queryKey: ['admin-all-submissions'],
    queryFn: () => materialsApi.getAllSubmissions().then((r) => r.data),
    enabled: !!user && user.role === 'admin',
  })

  const { data: chapters = [], isLoading: chaptersLoading } = useChapters()

  const approveMutation = useMutation({
    mutationFn: (id: number) => materialsApi.approve(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-pending'] })
      queryClient.invalidateQueries({ queryKey: ['admin-all-submissions'] })
      queryClient.invalidateQueries({ queryKey: ['chapters'] })
    },
  })

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason?: string }) =>
      materialsApi.reject(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-pending'] })
      queryClient.invalidateQueries({ queryKey: ['admin-all-submissions'] })
      setRejectingId(null)
      setRejectReason('')
    },
  })

  const adminDeleteSubmissionMutation = useMutation({
    mutationFn: (id: number) => materialsApi.adminDelete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-pending'] })
      queryClient.invalidateQueries({ queryKey: ['admin-all-submissions'] })
      setDeletingSubmissionId(null)
    },
  })

  const updateChapterMutation = useMutation({
    mutationFn: ({ id, body }: { id: number; body: ChapterUpdateBody }) =>
      chaptersApi.update(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chapters'] })
      setEditingChapter(null)
      setEditForm({})
    },
  })

  const reorderMutation = useMutation({
    mutationFn: (orderedIds: number[]) => chaptersApi.reorder(orderedIds),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['chapters'] }),
  })

  const deleteChapterMutation = useMutation({
    mutationFn: (id: number) => chaptersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chapters'] })
      setDeletingChapterId(null)
    },
  })

  const regenerateMutation = useMutation({
    mutationFn: (chapterId: number) => chaptersApi.regenerateContent(chapterId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chapters'] })
      queryClient.invalidateQueries({ queryKey: ['chapter'] })
    },
  })

  const handlePreview = async (s: MaterialSubmissionWithUser) => {
    try {
      const { data } = await materialsApi.getPreview(s.id)
      const blob = new Blob([data], {
        type:
          s.file_type === 'pdf'
            ? 'application/pdf'
            : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
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

  const startEdit = (chapter: Chapter) => {
    setEditingChapter(chapter)
    setEditForm({
      title: chapter.title,
      description: chapter.description ?? undefined,
      chapter_number: chapter.chapter_number,
      notebook_path: chapter.notebook_path ?? undefined,
      readme_path: chapter.readme_path ?? undefined,
      pdf_path: chapter.pdf_path ?? undefined,
    })
  }

  const submitEdit = () => {
    if (!editingChapter) return
    const body: ChapterUpdateBody = {}
    if (editForm.title !== undefined) body.title = editForm.title
    if (editForm.description !== undefined) body.description = editForm.description
    if (editForm.chapter_number !== undefined) body.chapter_number = editForm.chapter_number
    if (editForm.notebook_path !== undefined) body.notebook_path = editForm.notebook_path || null
    if (editForm.readme_path !== undefined) body.readme_path = editForm.readme_path || null
    if (editForm.pdf_path !== undefined) body.pdf_path = editForm.pdf_path || null
    updateChapterMutation.mutate({ id: editingChapter.id, body })
  }

  const moveChapter = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= chapters.length) return
    const ids = [...chapters.map((c) => c.id)]
    ;[ids[index], ids[newIndex]] = [ids[newIndex], ids[index]]
    reorderMutation.mutate(ids)
  }

  if (!user) {
    return (
      <div className="space-y-4 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold">管理员中心</h1>
        <Card variant="glass">
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
        <h1 className="text-2xl font-bold">管理员中心</h1>
        <Card variant="glass">
          <CardContent className="pt-6">
            <p className="text-destructive">您没有管理员权限</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <FolderOpen className="h-6 w-6" />
        管理员中心
      </h1>
      <p className="text-muted-foreground text-sm">
        待审核、全部提交记录与学习目录管理
      </p>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="w-full flex-wrap h-auto gap-1">
          <TabsTrigger value="pending" className="flex-1 min-w-0">
            待审核 ({pending.length})
          </TabsTrigger>
          <TabsTrigger value="all" className="flex-1 min-w-0">
            全部提交记录
          </TabsTrigger>
          <TabsTrigger value="chapters" className="flex-1 min-w-0">
            学习目录管理
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-6">
          <Card variant="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                待审核列表
              </CardTitle>
              <CardDescription>共 {pending.length} 项待审核</CardDescription>
            </CardHeader>
            <CardContent>
              {pendingLoading ? (
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
                    <li key={s.id} className="p-4 rounded-lg border bg-muted/30 space-y-3">
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
                            {new Date(s.created_at).toLocaleString()} · {s.file_type.toUpperCase()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Button variant="outline" size="sm" onClick={() => handlePreview(s)} className="gap-1">
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
        </TabsContent>

        <TabsContent value="all" className="mt-6">
          <Card variant="glass">
            <CardHeader>
              <CardTitle>全部提交记录</CardTitle>
              <CardDescription>含用户已删除记录；可预览、通过、驳回或彻底删除</CardDescription>
            </CardHeader>
            <CardContent>
              {allLoading ? (
                <ul className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <li key={i} className="p-4 rounded-lg border bg-muted/30">
                      <Skeleton className="h-5 w-48 mb-2" />
                      <Skeleton className="h-4 w-64" />
                    </li>
                  ))}
                </ul>
              ) : allSubmissions.length === 0 ? (
                <p className="text-muted-foreground text-sm">暂无提交记录</p>
              ) : (
                <ul className="space-y-4">
                  {allSubmissions.map((s) => (
                    <li key={s.id} className="p-4 rounded-lg border bg-muted/30 space-y-3">
                      <div className="flex justify-between items-start gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-lg">{s.title}</p>
                            {s.deleted_by_user_at && (
                              <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">
                                用户已删除
                              </span>
                            )}
                            {s.status === 'pending' && (
                              <span className="text-xs text-amber-600">待审核</span>
                            )}
                            {s.status === 'approved' && (
                              <span className="text-xs text-green-600">已通过</span>
                            )}
                            {s.status === 'rejected' && (
                              <span className="text-xs text-destructive">已驳回</span>
                            )}
                          </div>
                          {s.description && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                              {s.description}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-2">
                            提交人：{s.user_nickname || s.user_username || '-'} ·{' '}
                            {new Date(s.created_at).toLocaleString()} · {s.file_type.toUpperCase()}
                            {s.chapter_id && (
                              <>
                                {' · '}
                                <Link
                                  to={`/chapters/${s.chapter_id}`}
                                  className="text-primary hover:underline"
                                >
                                  查看章节
                                </Link>
                              </>
                            )}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                          {s.status === 'pending' && (
                            <>
                              <Button variant="outline" size="sm" onClick={() => handlePreview(s)} className="gap-1">
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
                            </>
                          )}
                          {s.status !== 'pending' && (
                            <Button variant="outline" size="sm" onClick={() => handlePreview(s)} className="gap-1">
                              <Eye className="h-4 w-4" /> 预览
                            </Button>
                          )}
                          {deletingSubmissionId === s.id ? (
                            <>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => adminDeleteSubmissionMutation.mutate(s.id)}
                                disabled={adminDeleteSubmissionMutation.isPending}
                              >
                                确认删除
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setDeletingSubmissionId(null)}
                              >
                                取消
                              </Button>
                            </>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setDeletingSubmissionId(s.id)}
                              disabled={adminDeleteSubmissionMutation.isPending}
                              title="彻底删除记录"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="chapters" className="mt-6">
          {editingChapter && (
            <Card variant="glass" className="mb-6">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle>编辑章节</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditingChapter(null)
                    setEditForm({})
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">序号</label>
                  <Input
                    type="number"
                    min={1}
                    value={editForm.chapter_number ?? ''}
                    onChange={(e) =>
                      setEditForm((f) => ({
                        ...f,
                        chapter_number: parseInt(e.target.value, 10) || undefined,
                      }))
                    }
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">标题</label>
                  <Input
                    value={editForm.title ?? ''}
                    onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">简介</label>
                  <Input
                    value={editForm.description ?? ''}
                    onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Notebook 路径</label>
                  <Input
                    value={editForm.notebook_path ?? ''}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, notebook_path: e.target.value || null }))
                    }
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">README 路径</label>
                  <Input
                    value={editForm.readme_path ?? ''}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, readme_path: e.target.value || null }))
                    }
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">PDF 路径</label>
                  <Input
                    value={editForm.pdf_path ?? ''}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, pdf_path: e.target.value || null }))
                    }
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={submitEdit}
                    disabled={updateChapterMutation.isPending}
                    className="gap-1"
                  >
                    <Save className="h-4 w-4" /> 保存
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditingChapter(null)
                      setEditForm({})
                    }}
                  >
                    取消
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Card variant="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ListOrdered className="h-5 w-5" />
                章节列表
              </CardTitle>
              <CardDescription>共 {chapters.length} 章，可编辑、调整顺序或删除</CardDescription>
            </CardHeader>
            <CardContent>
              {chaptersLoading ? (
                <p className="text-muted-foreground text-sm">加载中...</p>
              ) : chapters.length === 0 ? (
                <p className="text-muted-foreground text-sm">暂无章节</p>
              ) : (
                <ul className="space-y-3">
                  {chapters.map((chapter, index) => (
                    <li key={chapter.id} className="p-4 rounded-lg border bg-muted/30 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <span className="text-muted-foreground text-sm mr-2">
                            #{chapter.chapter_number}
                          </span>
                          <span className="font-medium">{chapter.title}</span>
                          {chapter.source_type === 'user_submitted' && (
                            <span className="ml-2 text-xs text-muted-foreground">(用户提交)</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => moveChapter(index, 'up')}
                            disabled={index === 0 || reorderMutation.isPending}
                            title="上移"
                          >
                            <ChevronUp className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => moveChapter(index, 'down')}
                            disabled={index === chapters.length - 1 || reorderMutation.isPending}
                            title="下移"
                          >
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => startEdit(chapter)}
                            className="gap-1"
                          >
                            <Pencil className="h-4 w-4" /> 编辑
                          </Button>
                          {chapter.source_type === 'user_submitted' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => regenerateMutation.mutate(chapter.id)}
                              disabled={regenerateMutation.isPending}
                              className="gap-1"
                              title="补生成 README、Notebook、考核题"
                            >
                              <RefreshCw className="h-4 w-4" /> 补生成
                            </Button>
                          )}
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setDeletingChapterId(chapter.id)}
                            disabled={deleteChapterMutation.isPending}
                            className="gap-1"
                          >
                            <Trash2 className="h-4 w-4" /> 删除
                          </Button>
                        </div>
                      </div>
                      {chapter.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {chapter.description}
                        </p>
                      )}
                      {deletingChapterId === chapter.id && (
                        <div className="pt-2 border-t flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">确认删除该章节？</span>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => deleteChapterMutation.mutate(chapter.id)}
                            disabled={deleteChapterMutation.isPending}
                          >
                            确认删除
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setDeletingChapterId(null)}
                          >
                            取消
                          </Button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
