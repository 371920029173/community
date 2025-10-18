"use client"
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'

type UiMode = 'desktop' | 'mobile'

interface UiContextValue {
  uiMode: UiMode
  toggleUiMode: () => void
  setUiMode: (mode: UiMode) => void
}

const UiContext = createContext<UiContextValue | undefined>(undefined)

export function UiProvider({ children }: { children: React.ReactNode }) {
  const [uiMode, setUiModeState] = useState<UiMode>('desktop')

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? (localStorage.getItem('ui-mode') as UiMode | null) : null
    if (stored === 'desktop' || stored === 'mobile') {
      setUiModeState(stored)
    }
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('ui-mode', uiMode)
      document.documentElement.setAttribute('data-ui', uiMode)
    }
  }, [uiMode])

  const setUiMode = (mode: UiMode) => setUiModeState(mode)
  const toggleUiMode = () => setUiModeState(prev => (prev === 'desktop' ? 'mobile' : 'desktop'))

  const value = useMemo(() => ({ uiMode, toggleUiMode, setUiMode }), [uiMode])

  return <UiContext.Provider value={value}>{children}</UiContext.Provider>
}

export function useUi() {
  const ctx = useContext(UiContext)
  if (!ctx) throw new Error('useUi must be used within UiProvider')
  return ctx
}



