'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Navbar from '@/components/layout/Navbar'
import { useAuth } from '@/components/providers/AuthProvider'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import {
  FolderOpen,
  Plus,
  ChevronRight,
  Trash2,
  FileText,
  Image,
  Video,
  Music,
  File
} from 'lucide-react'
import { displayNameWithoutExt } from '@/lib/utils'

interface Collection {
  id: string
  name: string
  created_at: string
}

interface FileItem {
  id: string
  original_name: string
  file_size: number
  mime_type?: string
  author_name?: string
  description?: string
}

export default function FavoritesPage() {
  const { user } = useAuth()
  const [collections, setCollections] = useState<Collection[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [files, setFiles] = useState<FileItem[]>([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)

  const fetchCollections = useCallback(async () => {
    if (!user?.id) return
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const res = await fetch('/api/favorites/collections', {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      })
      const json = await res.json()
      if (json.success) setCollections(json.data || [])
    } catch (e) {
      console.error(e)
      toast.error('加载收藏夹失败')
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  const fetchCollectionFiles = useCallback(async (id: string) => {
    if (!user?.id) return
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const res = await fetch(`/api/favorites/collections/${id}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      })
      const json = await res.json()
      if (json.success) setFiles(json.data?.files || [])
    } catch (e) {
      console.error(e)
      setFiles([])
    }
  }, [user?.id])

  useEffect(() => {
    fetchCollections()
  }, [fetchCollections])

  useEffect(() => {
    if (selectedId) fetchCollectionFiles(selectedId)
    else setFiles([])
  }, [selectedId, fetchCollectionFiles])

  const createCollection = async () => {
    if (!newName.trim()) {
      toast.error('请输入收藏夹名称')
      return
    }
    try {
      setCreating(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        toast.error('请先登录')
        return
      }
      const res = await fetch('/api/favorites/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ name: newName.trim() })
      })
      const json = await res.json()
      if (json.success) {
        toast.success('创建成功')
        setNewName('')
        fetchCollections()
      } else {
        toast.error(json.error || '创建失败')
      }
    } catch (e) {
      toast.error('创建失败')
    } finally {
      setCreating(false)
    }
  }

  const deleteCollection = async (id: string) => {
    if (!confirm('确定删除此收藏夹？')) return
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const res = await fetch(`/api/favorites/collections/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      })
      const json = await res.json()
      if (json.success) {
        toast.success('已删除')
        if (selectedId === id) setSelectedId(null)
        fetchCollections()
      } else {
        toast.error(json.error || '删除失败')
      }
    } catch (e) {
      toast.error('删除失败')
    }
  }

  const getFileIcon = (mime?: string, name?: string) => {
    const ext = (name || '').toLowerCase().split('.').pop()
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) return <Image className="w-5 h-5 text-green-500" />
    if (['mp4', 'webm', 'mov'].includes(ext || '')) return <Video className="w-5 h-5 text-purple-500" />
    if (['mp3', 'wav'].includes(ext || '')) return <Music className="w-5 h-5 text-orange-500" />
    return <FileText className="w-5 h-5 text-blue-500" />
  }

  const formatSize = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-gray-600">请先登录</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 relative z-10">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 py-8 relative z-10">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FolderOpen className="w-7 h-7 text-amber-500" />
            我的收藏
          </h1>
          <Link href="/profile" className="text-sm text-blue-600 hover:text-blue-700">
            返回个人中心
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
          <div className="md:col-span-1 space-y-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 relative z-10">
              <div className="flex gap-2 mb-4">
                <input
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="新建收藏夹"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  onKeyDown={e => e.key === 'Enter' && createCollection()}
                />
                <button
                  onClick={createCollection}
                  disabled={creating || !newName.trim()}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" /> 创建
                </button>
              </div>
              {loading ? (
                <p className="text-sm text-gray-500">加载中...</p>
              ) : collections.length === 0 ? (
                <p className="text-sm text-gray-500">暂无收藏夹</p>
              ) : (
                <ul className="space-y-1">
                  {collections.map(c => (
                    <li key={c.id}>
                      <div className="flex items-center justify-between group">
                        <button
                          onClick={() => setSelectedId(c.id)}
                          className={`flex-1 text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between truncate ${
                            selectedId === c.id ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'
                          }`}
                        >
                          <span className="truncate">{c.name}</span>
                          <ChevronRight className="w-4 h-4 shrink-0" />
                        </button>
                        <button
                          onClick={() => deleteCollection(c.id)}
                          className="p-2 text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="删除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="md:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6 relative z-10">
            {!selectedId ? (
              <div className="text-center py-12 text-gray-500">
                <FolderOpen className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>选择收藏夹查看文件</p>
                <p className="text-sm mt-1">在文件详情页可将文件收藏到收藏夹</p>
              </div>
            ) : files.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <File className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>此收藏夹暂无文件</p>
              </div>
            ) : (
              <div className="space-y-3">
                {files.map(f => (
                  <Link
                    key={f.id}
                    href={`/file/${f.id}`}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 border border-transparent hover:border-gray-200 transition-colors"
                  >
                    {getFileIcon(f.mime_type, f.original_name)}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{displayNameWithoutExt(f.original_name)}</p>
                      <p className="text-xs text-gray-500">{formatSize(f.file_size)} · {f.author_name || '未知'}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
