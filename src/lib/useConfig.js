'use client'

import { useEffect, useSyncExternalStore } from 'react'

let cached = null
let pending = null
let listeners = new Set()

function load() {
  pending =
    pending ||
    fetch('/api/config')
      .then((r) => r.json())
      .catch(() => ({ error: true, configured: false, environment: 'TEST', apiHost: '' }))
      .then((c) => {
        cached = c
        listeners.forEach((l) => l())
      })
  return pending
}

function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

// Environment summary and catalogue from /api/config, fetched once per page load.
// The server snapshot is always null, so hydration matches the server HTML even
// when another component has already loaded the config.
export function useConfig() {
  let config = useSyncExternalStore(subscribe, () => cached, () => null)
  useEffect(() => {
    if (!cached) load()
  }, [])
  return config
}
