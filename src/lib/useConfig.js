'use client'

import { useEffect, useState } from 'react'

let cached = null
let pending = null

// Environment summary and catalogue from /api/config, fetched once per page load
export function useConfig() {
  let [config, setConfig] = useState(cached)
  useEffect(() => {
    if (cached) return
    pending = pending || fetch('/api/config').then((r) => r.json())
    pending
      .then((c) => {
        cached = c
        setConfig(c)
      })
      .catch(() => setConfig({ error: true, configured: false, environment: 'TEST', apiHost: '' }))
  }, [])
  return config
}
