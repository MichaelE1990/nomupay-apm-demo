'use client'

import { useEffect, useRef, useState } from 'react'

// Flow state that survives the round trip to the payment page and back
// Returns [state, setState, ready]; ready turns true once storage has been read
export function usePersistentState(key, initial) {
  let [state, setState] = useState(initial)
  let [ready, setReady] = useState(false)
  let loaded = useRef(false)

  useEffect(() => {
    try {
      let raw = window.localStorage.getItem(key)
      if (raw) {
        let saved = JSON.parse(raw)
        setState({ ...initial, ...saved, form: { ...initial.form, ...saved.form, extras: { ...initial.form?.extras, ...saved.form?.extras } } })
      }
    } catch {}
    loaded.current = true
    setReady(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  useEffect(() => {
    if (!ready) return
    try {
      window.localStorage.setItem(key, JSON.stringify(state))
    } catch {}
  }, [key, state, ready])

  return [state, setState, ready]
}

export async function postJson(url, body) {
  let res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  let data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
  return data
}

export async function getJson(url) {
  let res = await fetch(url, { cache: 'no-store' })
  let data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
  return data
}

export function newMerchantTransactionId() {
  return `order-${Date.now().toString(36)}`
}
