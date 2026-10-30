'use client'

import { useEffect } from 'react'

import { RETURN_MESSAGE } from '@/lib/redirect'

// Tells the demo page that opened the payment page that the shopper is back,
// with the id and resourcePath the gateway added to the shopperResultUrl
export function ReturnBridge() {
  useEffect(() => {
    let framed = window.self !== window.top
    let target = framed ? window.parent : window.opener
    let ours = false
    try {
      ours = Boolean(target && target !== window && target.location.origin === window.location.origin)
    } catch {}
    // Opened some other way: show the normal return page
    if (!ours) {
      document.documentElement.removeAttribute('data-embedded')
      return
    }
    let params = new URLSearchParams(window.location.search)
    target.postMessage({ type: RETURN_MESSAGE, id: params.get('id'), resourcePath: params.get('resourcePath') }, window.location.origin)
    if (!framed) setTimeout(() => window.close(), 600)
  }, [])

  return (
    <div className="embedded-return fixed inset-0 z-[100] hidden flex-col items-center justify-center gap-2 bg-white p-6 text-center dark:bg-zinc-900">
      <span className="flex size-10 items-center justify-center rounded-full bg-emerald-500/10 ring-1 ring-emerald-500/25">
        <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="size-5 text-emerald-600 dark:text-emerald-400">
          <path d="m5 10.5 3 3 7-7" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <p className="text-sm font-semibold text-zinc-900 dark:text-white">Back at your shopperResultUrl</p>
      <p className="max-w-xs text-sm text-zinc-500 dark:text-zinc-400">The demo is checking the payment result in step 3.</p>
    </div>
  )
}
