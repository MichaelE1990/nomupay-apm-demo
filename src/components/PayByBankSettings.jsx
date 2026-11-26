'use client'

import { CloseButton, Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react'
import { useState } from 'react'

import { SUPPORT_EMAIL } from '@/lib/openBanking'

// The integration preferences we set up for a merchant. The business details and logo come from
// Token.io's due diligence questionnaire, which sales send, so they're not asked for here
const PREFERENCES = [
  { term: 'Integration method', details: 'Pay by link from your Dashboard, the API, or both.' },
  { term: 'Currencies', details: 'GBP, EUR or both.' },
  { term: 'Pay by link payment methods', details: 'Pay by Bank only, or Pay by Bank and cards.' },
  { term: 'Default country', details: 'The country already selected when the shopper starts paying.' },
  { term: 'Destination countries', details: 'The countries shoppers can pay from.' },
  {
    term: 'Your own reference',
    details: 'Send your merchantTransactionId (up to 18 letters and numbers) to the bank as the payment reference, instead of ours.',
  },
]

function XIcon(props) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true" {...props}>
      <path d="m5.5 5.5 9 9m0-9-9 9" />
    </svg>
  )
}

// Inline link text in Getting started that opens the preferences in a modal
export function PayByBankSettings({ children }) {
  let [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
        className="cursor-pointer font-medium text-emerald-500 underline decoration-transparent transition hover:text-emerald-600 hover:decoration-emerald-500/30 dark:text-emerald-400 dark:hover:text-emerald-500"
      >
        {children}
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} className="relative z-[60]">
        <DialogBackdrop
          transition
          className="fixed inset-0 bg-zinc-900/30 backdrop-blur-xs transition-opacity duration-200 ease-out data-closed:opacity-0 dark:bg-black/50"
        />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel
            transition
            className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl ring-1 ring-zinc-900/10 transition duration-200 ease-out data-closed:scale-95 data-closed:opacity-0 sm:p-8 dark:bg-zinc-900 dark:ring-white/10"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <DialogTitle className="text-base font-semibold text-zinc-900 dark:text-white">Integration preferences</DialogTitle>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                  Tell us these when you apply. To change one later, email{' '}
                  <a href={`mailto:${SUPPORT_EMAIL}`} className="font-medium text-emerald-600 dark:text-emerald-400">
                    {SUPPORT_EMAIL}
                  </a>
                  .
                </p>
              </div>
              <CloseButton
                aria-label="Close"
                className="-mt-1 -mr-1 flex size-8 flex-none items-center justify-center rounded-full text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-white"
              >
                <XIcon className="size-5" />
              </CloseButton>
            </div>
            <dl className="mt-6 space-y-4 border-t border-zinc-900/7.5 pt-6 dark:border-white/10">
              {PREFERENCES.map((f) => (
                <div key={f.term}>
                  <dt className="text-sm font-medium text-zinc-900 dark:text-white">{f.term}</dt>
                  <dd className="mt-0.5 text-sm/6 text-zinc-600 dark:text-zinc-400">{f.details}</dd>
                </div>
              ))}
            </dl>
          </DialogPanel>
        </div>
      </Dialog>
    </>
  )
}
