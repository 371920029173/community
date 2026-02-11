'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/components/layout/Navbar'
import { useAuth } from '@/components/providers/AuthProvider'
import { supabase } from '@/lib/supabase'
import { Folder, File, ArrowLeft, Eye, Download } from 'lucide-react'
import toast from 'react-hot-toast'

interface FileItem {
  id: string
  original_name: string
  file_size: number
  mime_type: string
  created_at: string
}

interface FolderItem {
  id: string
  name: string
  created_at: string
}

export default function DriveFolderPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const [folderId, setFolderId] = useState<string>('')
  const [folder, setFolder] = useState<{ id: string; name: string } | null>(null)
  const [files, setFiles] = useState<FileItem[]>([])
  const [subfolders, setSubfolders] = useState<FolderItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const p = params as { id?: string }
    if (p?.id) setFolderId(p.id)
  }, [params])

  useEffect(() => {
    if (!folderId || !user) {
      if (!user) router.push('/login')
      return
    }
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        toast.error('请先登录')
        router.push('/login')
        return
      }
      const res = await fetch(`/api/drive/user-files?folderId=${folderId}`, {
        headers: { Authorization: `Bearer ${session.access_token}` }
      })
      const data = await res.json()
      if (data.success) {
        setFiles(data.files || [])
        setSubfolders(data.folders || [])
        setFolder(data.currentFolder ? { id: folderId, name: data.currentFolder.name } : { id: folderId, name: '文件夹' })
      } else {
        toast.error(data.error || '加载失败')
      }
      setLoading(false)
    }
    load()
  }, [folderId, user, router])

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + ['B','KB','MB','GB'][i]
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <Navbar />
      <div className="container mx-auto px-4 py-8 relative z-10">
        <Link href="/files" className="inline-flex items-center gap-2 text-gray-600 hover:text-blue-600 mb-6">
          <ArrowLeft className="w-4 h-4" /> 返回云盘
        </Link>
        <div className="bg-white/60 backdrop-blur-sm rounded-lg shadow-sm p-6">
          <h1 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Folder className="w-6 h-6 text-amber-500" /> {folder?.name || '文件夹'}
          </h1>
          {loading ? (
            <div className="p-8 text-center text-gray-500">加载中...</div>
          ) : (
            <div className="space-y-2">
              {subfolders.map((f) => (
                <Link
                  key={f.id}
                  href={`/drive-folder/${f.id}`}
                  className="flex items-center gap-4 p-3 rounded-lg hover:bg-amber-50 transition-colors"
                >
                  <Folder className="w-8 h-8 text-amber-500" />
                  <div>
                    <p className="font-medium text-gray-900">{f.name}</p>
                    <p className="text-sm text-gray-500">文件夹</p>
                  </div>
                  <Eye className="w-4 h-4 text-gray-400 ml-auto" />
                </Link>
              ))}
              {files.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center gap-4 p-3 rounded-lg hover:bg-blue-50"
                >
                  <File className="w-8 h-8 text-blue-500" />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{file.original_name}</p>
                    <p className="text-sm text-gray-500">{formatSize(file.file_size)}</p>
                  </div>
                  <a
                    href={`/drive-file/${file.id}`}
                    className="p-2 text-green-600 hover:bg-green-100 rounded"
                    title="下载"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                </div>
              ))}
              {subfolders.length === 0 && files.length === 0 && (
                <p className="text-center text-gray-500 py-8">此文件夹为空</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
