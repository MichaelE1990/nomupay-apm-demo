'use client'

import { CloseButton, Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react'
import { useState } from 'react'

import { SUPPORT_EMAIL } from '@/lib/openBanking'

// The account settings, from the Help Centre's Account Setup article (the Word form that
// scripts/settings-form.cjs builds lists the same settings)
const GROUPS = [
  {
    title: 'Your business',
    items: [
      { term: 'Business name', details: 'Your business’s legal name.' },
      { term: 'Display name', details: 'The name shoppers see when they choose their bank.' },
      { term: 'Logo', details: 'Shown to shoppers when they choose Pay by Bank.' },
      { term: 'Domain name', details: 'The website you take payments on, such as https://www.mysite.co.uk/.' },
    ],
  },
  {
    title: 'Your payouts',
    items: [
      { term: 'Currencies', details: 'GBP, EUR or both.' },
      { term: 'Account details', details: 'Where we pay your funds: account number and sort code for GBP, IBAN for EUR.' },
    ],
  },
  {
    title: 'Your checkout',
    items: [
      { term: 'Integration type', details: 'Pay by link from your Nomupay Dashboard, or the API.' },
      { term: 'Pay by link payment methods', details: 'Pay by Bank only, or Pay by Bank and cards.' },
      { term: 'Default country', details: 'The country already selected when the shopper starts paying.' },
      { term: 'Destination countries', details: 'The countries shoppers can pay from.' },
    ],
  },
]

function SlidersIcon(props) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true" {...props}>
      <path d="M3.75 6h6.5M14.25 6h2M3.75 14h2M9.75 14h6.5" />
      <circle cx="12.25" cy="6" r="2" />
      <circle cx="7.75" cy="14" r="2" />
    </svg>
  )
}

function XIcon(props) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true" {...props}>
      <path d="m5.5 5.5 9 9m0-9-9 9" />
    </svg>
  )
}

// A raised pill on Get started's Account setup that opens the settings in a modal
export function PayByBankSettings() {
  let [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group not-prose inline-flex items-center gap-2 rounded-full bg-linear-to-b from-white to-zinc-50 py-1.5 pr-4 pl-3.5 text-sm font-semibold text-zinc-900 shadow-[0_1px_2px_rgb(23_33_71/0.08),0_2px_6px_rgb(23_33_71/0.06)] ring-1 ring-zinc-900/7.5 transition hover:to-white dark:from-zinc-700 dark:to-zinc-800 dark:text-white dark:ring-white/10 dark:hover:to-zinc-700"
      >
        <SlidersIcon className="size-4 flex-none text-emerald-600 dark:text-emerald-400" />
        Account settings
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} className="relative z-[60]">
        <DialogBackdrop
          transition
          className="fixed inset-0 bg-zinc-900/30 backdrop-blur-xs transition-opacity duration-200 ease-out data-closed:opacity-0 dark:bg-black/50"
        />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel
            transition
            className="max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl ring-1 ring-zinc-900/10 transition duration-200 ease-out data-closed:scale-95 data-closed:opacity-0 sm:p-8 dark:bg-zinc-900 dark:ring-white/10"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <DialogTitle className="text-base font-semibold text-zinc-900 dark:text-white">Account settings</DialogTitle>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                  What we set up for your Pay by Bank account. Have these ready when you apply.
                </p>
              </div>
              <CloseButton
                aria-label="Close"
                className="-mt-1 -mr-1 flex size-8 flex-none items-center justify-center rounded-full text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-white"
              >
                <XIcon className="size-5" />
              </CloseButton>
            </div>
            <div className="mt-6 grid grid-cols-1 gap-8 border-t border-zinc-900/7.5 pt-6 sm:grid-cols-3 dark:border-white/10">
              {GROUPS.map((g) => (
                <section key={g.title}>
                  <h3 className="text-xs font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">{g.title}</h3>
                  <dl className="mt-3 space-y-4">
                    {g.items.map((f) => (
                      <div key={f.term}>
                        <dt className="text-sm font-medium text-zinc-900 dark:text-white">{f.term}</dt>
                        <dd className="mt-0.5 text-sm/6 text-zinc-600 dark:text-zinc-400">{f.details}</dd>
                      </div>
                    ))}
                  </dl>
                </section>
              ))}
            </div>
            <p className="mt-8 rounded-xl bg-zinc-50 px-4 py-3 text-sm text-zinc-600 ring-1 ring-zinc-900/5 dark:bg-white/2.5 dark:text-zinc-400 dark:ring-white/10">
              To change a setting later, email{' '}
              <a href={`mailto:${SUPPORT_EMAIL}`} className="font-medium text-emerald-600 dark:text-emerald-400">
                {SUPPORT_EMAIL}
              </a>{' '}
              with the setting and its new value.
            </p>
          </DialogPanel>
        </div>
      </Dialog>
    </>
  )
}
