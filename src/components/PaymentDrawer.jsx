'use client'

import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react'
import { useCallback, useRef } from 'react'

import { redirectMethod, sendShopper } from '@/lib/redirect'

export const PAYMENT_FRAME = 'nomupay-apm-payment-frame'

function XIcon(props) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" {...props}>
      <path d="m5 5 10 10M15 5 5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function WindowIcon(props) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" {...props}>
      <path d="M11 3.5h5.5V9M16.5 3.5 9.5 10.5M8 4.5H5a1.5 1.5 0 0 0-1.5 1.5v9A1.5 1.5 0 0 0 5 16.5h9a1.5 1.5 0 0 0 1.5-1.5v-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function Spinner(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.2" strokeWidth="2.5" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}

// The payment brand's page from redirect.url, shown in a slide-over so the
// merchant stays on the demo. The return page tells this page when the shopper is back.
export function PaymentDrawer({ open, onClose, redirect, title, onOpenWindow }) {
  let sentFor = useRef(null)
  let host = ''
  try {
    host = redirect?.url ? new URL(redirect.url).host : ''
  } catch {}

  // Navigate the frame once it's in the page; the parameters are posted to it like a normal redirect
  // (a stable ref callback, so re-renders don't post the redirect twice)
  let frameRef = useCallback(
    (el) => {
      if (!el) {
        sentFor.current = null
        return
      }
      if (!redirect || sentFor.current === redirect) return
      sentFor.current = redirect
      setTimeout(() => sendShopper(redirect, PAYMENT_FRAME), 0)
    },
    [redirect],
  )

  return (
    <Dialog open={open} onClose={onClose} className="relative z-[60]">
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-zinc-900/30 backdrop-blur-xs transition-opacity duration-300 ease-out data-closed:opacity-0 dark:bg-black/50"
      />
      <div className="fixed inset-0 overflow-hidden">
        <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full sm:pl-10">
          <DialogPanel
            transition
            className="pointer-events-auto flex h-full w-screen max-w-lg flex-col bg-white shadow-xl ring-1 ring-zinc-900/10 transition duration-300 ease-in-out data-closed:translate-x-full dark:bg-zinc-900 dark:ring-white/10"
          >
            <div className="flex items-start gap-3 border-b border-zinc-900/7.5 px-4 py-3 dark:border-white/10">
              <div className="min-w-0 flex-auto">
                <DialogTitle className="text-sm font-semibold text-zinc-900 dark:text-white">{title}</DialogTitle>
                <p className="truncate font-mono text-xs text-zinc-500 dark:text-zinc-400">
                  {redirect ? `${redirectMethod(redirect)} ${host}` : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={onOpenWindow}
                className="flex flex-none items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium text-zinc-600 ring-1 ring-zinc-900/10 transition ring-inset hover:bg-zinc-900/2.5 hover:text-zinc-900 dark:text-zinc-400 dark:ring-white/10 dark:hover:bg-white/5 dark:hover:text-white"
              >
                <WindowIcon className="size-3.5" />
                New window
              </button>
              <button
                type="button"
                onClick={onClose}
                className="-mr-1 flex size-7 flex-none items-center justify-center rounded-lg text-zinc-500 transition hover:bg-zinc-900/5 hover:text-zinc-900 dark:hover:bg-white/5 dark:hover:text-white"
              >
                <span className="sr-only">Close</span>
                <XIcon className="size-5" />
              </button>
            </div>

            <div className="relative flex-auto bg-zinc-50 dark:bg-zinc-950">
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-sm text-zinc-500 dark:text-zinc-400">
                <Spinner className="size-6 animate-spin text-emerald-500" />
                Loading the payment page…
              </div>
              {open && redirect && (
                <iframe ref={frameRef} name={PAYMENT_FRAME} title={title} allow="payment" className="relative block size-full border-0" />
              )}
            </div>

            <div className="border-t border-zinc-900/7.5 px-4 py-3 text-xs/5 text-zinc-500 dark:border-white/10 dark:text-zinc-400">
              When the shopper finishes, the gateway sends them to your <code className="font-mono text-[0.6875rem] text-zinc-700 dark:text-zinc-300">shopperResultUrl</code>.
              The drawer then closes and step 3 checks the result. Page blank or refusing to load? Some payment pages can&rsquo;t be shown inside another
              site, so use <span className="font-medium text-zinc-700 dark:text-zinc-300">New window</span>.
            </div>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  )
}
