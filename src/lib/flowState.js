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

// The merchant's own test credentials, from the Playground. Kept for this browser tab
// only (sessionStorage), so they survive the redirect to the payment page and back.
const CREDS_KEY = 'nomupayApmDemo.credentials'
export const EMPTY_CREDENTIALS = { useOwn: false, entityId: '', accessToken: '' }
export const ENTITY_PATTERN = /^[a-f0-9]{32}$/
export const TOKEN_PATTERN = /^[A-Za-z0-9+/=._-]{20,512}$/

export function useSessionCredentials() {
  let [creds, setCreds] = useState(EMPTY_CREDENTIALS)
  let [ready, setReady] = useState(false)
  useEffect(() => {
    try {
      let raw = window.sessionStorage.getItem(CREDS_KEY)
      if (raw) setCreds({ ...EMPTY_CREDENTIALS, ...JSON.parse(raw) })
    } catch {}
    setReady(true)
  }, [])
  useEffect(() => {
    if (!ready) return
    try {
      if (creds.useOwn || creds.entityId || creds.accessToken) window.sessionStorage.setItem(CREDS_KEY, JSON.stringify(creds))
      else window.sessionStorage.removeItem(CREDS_KEY)
    } catch {}
  }, [creds, ready])
  return [creds, setCreds]
}

// What goes to this demo's server with each request: nothing when using the demo's credentials
export function credentialsPayload(creds) {
  if (!creds?.useOwn) return undefined
  return { entityId: creds.entityId.trim(), accessToken: creds.accessToken.trim() }
}

export function credentialsReady(creds) {
  return !creds?.useOwn || (ENTITY_PATTERN.test(creds.entityId.trim()) && TOKEN_PATTERN.test(creds.accessToken.trim()))
}
