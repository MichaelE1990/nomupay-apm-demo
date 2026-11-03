'use client'

import { useEffect } from 'react'
import { create } from 'zustand'

// The language chosen in any request panel applies to all of them (as in the Protocol template)
const KEY = 'nomupayApmDemo.codeLanguage'

export const useCodeLanguage = create((set) => ({
  lang: 'curl',
  setLang: (lang) => {
    set({ lang })
    try {
      window.localStorage.setItem(KEY, lang)
    } catch {}
  },
}))

let loaded = false
export function useRememberedCodeLanguage() {
  useEffect(() => {
    if (loaded) return
    loaded = true
    try {
      let saved = window.localStorage.getItem(KEY)
      if (saved) useCodeLanguage.setState({ lang: saved })
    } catch {}
  }, [])
}
