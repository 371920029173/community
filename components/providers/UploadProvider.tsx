'use client'

import React, { createContext, useCallback, useContext, useState } from 'react'
import { runWithConcurrency } from '@/lib/uploadUtils'
import { Upload } from 'lucide-react'

export interface UploadTask {
  id: string
  name: string
  run: () => Promise<void>
}

interface UploadProviderValue {
  addTasks: (tasks: UploadTask[], options?: { concurrency?: number; onComplete?: () => void }) => Promise<void>
  isUploading: boolean
}

const UploadContext = createContext<UploadProviderValue | null>(null)

export function useUpload() {
  const ctx = useContext(UploadContext)
  return ctx
}

export function UploadProvider({ children }: { children: React.ReactNode }) {
  const [active, setActive] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0, currentName: '' })
  const addTasks = useCallback(async (tasks: UploadTask[], options?: { concurrency?: number; onComplete?: () => void }) => {
    if (tasks.length === 0) return
    const concurrency = options?.concurrency ?? 4
    const onComplete = options?.onComplete
    setActive(true)
    setProgress({ done: 0, total: tasks.length, currentName: tasks[0]?.name || '' })

    try {
      await runWithConcurrency(tasks, concurrency, async (task) => {
        setProgress((p) => ({ ...p, currentName: task.name }))
        await task.run()
        setProgress((p) => ({ ...p, done: p.done + 1 }))
      })
      onComplete?.()
    } finally {
      setActive(false)
      setProgress({ done: 0, total: 0, currentName: '' })
    }
  }, [])

  const value: UploadProviderValue = { addTasks, isUploading: active }

  return (
    <UploadContext.Provider value={value}>
      {children}
      {active && (
        <div className="fixed bottom-6 right-6 z-[9999] flex items-center gap-3 rounded-lg bg-gray-900 text-white px-4 py-3 shadow-lg">
          <Upload className="w-5 h-5 animate-pulse" />
          <div>
            <p className="text-sm font-medium">上传中…</p>
            <p className="text-xs text-gray-300 truncate max-w-[200px]" title={progress.currentName}>
              {progress.currentName}
            </p>
            <p className="text-xs text-gray-400">
              {progress.done} / {progress.total}
            </p>
          </div>
        </div>
      )}
    </UploadContext.Provider>
  )
}
