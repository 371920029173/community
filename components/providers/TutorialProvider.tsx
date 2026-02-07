'use client'

import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import { TutorialSpotlight } from '@/components/tutorial/TutorialSpotlight'
import { getTutorialCompleted, getTutorialPlayOnLogin, setTutorialCompleted, setTutorialPlayOnLogin } from '@/components/tutorial/TutorialModal'
import { useAuth } from '@/components/providers/AuthProvider'

interface TutorialContextType {
  openTutorial: () => void
  tutorialPlayOnLogin: boolean
  setTutorialPlayOnLogin: (v: boolean) => void
}

const TutorialContext = createContext<TutorialContextType | undefined>(undefined)

export function TutorialProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [playOnLogin, setPlayOnLogin] = useState(false)
  const showedThisSession = useRef(false)

  useEffect(() => {
    setPlayOnLogin(getTutorialPlayOnLogin())
  }, [])

  const openTutorial = useCallback(() => {
    setOpen(true)
  }, [])

  const setTutorialPlayOnLoginFromContext = useCallback((v: boolean) => {
    setTutorialPlayOnLogin(v)
    setPlayOnLogin(v)
  }, [])

  useEffect(() => {
    if (!user?.id || showedThisSession.current) return
    const completed = getTutorialCompleted()
    const stored = getTutorialPlayOnLogin()
    if (!completed || stored) {
      showedThisSession.current = true
      setOpen(true)
    }
  }, [user?.id])

  const handleClose = useCallback(() => {
    setOpen(false)
  }, [])

  const handlePlayChoice = useCallback((v: boolean) => {
    setTutorialPlayOnLogin(v)
    setPlayOnLogin(v)
  }, [])

  return (
    <TutorialContext.Provider value={{ openTutorial, tutorialPlayOnLogin: playOnLogin, setTutorialPlayOnLogin: setTutorialPlayOnLoginFromContext }}>
      {children}
      <TutorialSpotlight
        open={open}
        onClose={handleClose}
        showPlayChoice={!getTutorialCompleted()}
        onComplete={() => setTutorialCompleted(true)}
        onPlayChoice={handlePlayChoice}
      />
    </TutorialContext.Provider>
  )
}

export function useTutorial() {
  const ctx = useContext(TutorialContext)
  if (ctx === undefined) {
    return {
      openTutorial: () => {},
      tutorialPlayOnLogin: false,
      setTutorialPlayOnLogin: (_v: boolean) => {},
    }
  }
  return ctx
}
