'use client'

import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import { TutorialModal, getTutorialCompleted, getTutorialPlayOnLogin } from '@/components/tutorial/TutorialModal'
import { useAuth } from '@/components/providers/AuthProvider'

interface TutorialContextType {
  openTutorial: () => void
}

const TutorialContext = createContext<TutorialContextType | undefined>(undefined)

export function TutorialProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const showedThisSession = useRef(false)

  const openTutorial = useCallback(() => {
    setOpen(true)
  }, [])

  useEffect(() => {
    if (!user?.id || showedThisSession.current) return
    const completed = getTutorialCompleted()
    const playOnLogin = getTutorialPlayOnLogin()
    if (!completed || playOnLogin) {
      showedThisSession.current = true
      setOpen(true)
    }
  }, [user?.id])

  const handleClose = useCallback(() => {
    setOpen(false)
  }, [])

  return (
    <TutorialContext.Provider value={{ openTutorial }}>
      {children}
      <TutorialModal open={open} onClose={handleClose} showPlayChoice={!getTutorialCompleted()} />
    </TutorialContext.Provider>
  )
}

export function useTutorial() {
  const ctx = useContext(TutorialContext)
  if (ctx === undefined) {
    return { openTutorial: () => {} }
  }
  return ctx
}
