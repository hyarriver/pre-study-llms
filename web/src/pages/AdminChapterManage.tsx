import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { chaptersApi, type ChapterUpdateBody } from '@/api/chapters'
import { useAuthStore } from '@/store/authStore'
import { useChapters } from '@/hooks/useChapters'
import type { Chapter } from '@/types'
import {
  Pencil,
  Trash2,
  ChevronUp,
  ChevronDown,
  ListOrdered,
  X,
  Save,
  RefreshCw,
} from 'lucide-react'

export default function AdminChapterManage() {
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const { data: chapters = [], isLoading } = useChapters()
  const [editingChapter, setEditingChapter] = useState<Chapter | null>(null)
  const [editForm, setEditForm] = useState<ChapterUpdateBody>({})
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [regeneratingId, setRegeneratingId] = useState<number | null>(null)

  const updateMutation = useMutation({
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chapters'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => chaptersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chapters'] })
      setDeletingId(null)
    },
  })

  const regenerateMutation = useMutation({
    mutationFn: (chapterId: number) => chaptersApi.regenerateContent(chapterId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chapters'] })
    },
    onSettled: () => {
      setRegeneratingId(null)
    },
  })

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
    updateMutation.mutate({ id: editingChapter.id, body })
  }

  const moveChapter = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= chapters.length) return
    const ids = [...chapters.map((c) => c.id)]
    ;[ids[index], ids[newIndex]] = [ids[newIndex], ids[index]]
    reorderMutation.mutate(ids)
  }

  const confirmDelete = (id: number) => {
    deleteMutation.mutate(id)
  }

  if (!user) {
    return (
      <div className="space-y-4 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold">学习目录管理</h1>
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
        <h1 className="text-2xl font-bold">学习目录管理</h1>
        <Card>
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
        <ListOrdered className="h-6 w-6" />
        学习目录管理
      </h1>
      <p className="text-muted-foreground text-sm">
        编辑、排序或删除章节；变更后首页与教程列表将同步更新
      </p>

      {editingChapter && (
        <Card>
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
                  setEditForm((f) => ({ ...f, chapter_number: parseInt(e.target.value, 10) || undefined }))
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
                onChange={(e) => setEditForm((f) => ({ ...f, notebook_path: e.target.value || null }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">README 路径</label>
              <Input
                value={editForm.readme_path ?? ''}
                onChange={(e) => setEditForm((f) => ({ ...f, readme_path: e.target.value || null }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">PDF 路径</label>
              <Input
                value={editForm.pdf_path ?? ''}
                onChange={(e) => setEditForm((f) => ({ ...f, pdf_path: e.target.value || null }))}
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={submitEdit}
                disabled={updateMutation.isPending}
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

      <Card>
        <CardHeader>
          <CardTitle>章节列表</CardTitle>
          <CardDescription>共 {chapters.length} 章，可编辑、调整顺序或删除</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-sm">加载中...</p>
          ) : chapters.length === 0 ? (
            <p className="text-muted-foreground text-sm">暂无章节</p>
          ) : (
            <ul className="space-y-3">
              {chapters.map((chapter, index) => (
                <li
                  key={chapter.id}
                  className="p-4 rounded-lg border bg-muted/30 space-y-2"
                >
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
                          onClick={() => {
                            setRegeneratingId(chapter.id)
                            regenerateMutation.mutate(chapter.id)
                          }}
                          disabled={regenerateMutation.isPending}
                          className="gap-1"
                          title="补生成 README、Notebook、考核题"
                        >
                          {regeneratingId === chapter.id ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            <RefreshCw className="h-4 w-4" />
                          )}
                          补生成
                        </Button>
                      )}
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setDeletingId(chapter.id)}
                        disabled={deleteMutation.isPending}
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
                  {deletingId === chapter.id && (
                    <div className="pt-2 border-t flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">确认删除该章节？</span>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => confirmDelete(chapter.id)}
                        disabled={deleteMutation.isPending}
                      >
                        确认删除
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setDeletingId(null)}
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
    </div>
  )
}
