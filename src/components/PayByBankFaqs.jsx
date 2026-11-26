'use client'

import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/react'

import { SUPPORT_EMAIL } from '@/lib/openBanking'

// Shoppers' questions, from Token.io's sample FAQs for merchants to add to their own help pages
// (the account and registration one left out)
const FAQS = [
  {
    q: 'What is Pay by Bank?',
    a: 'Pay by Bank lets you pay directly from your bank account. There’s no need to enter card details or create an account. Just select your bank, confirm the payment with your bank (we’ll redirect you there so it’s easy), and you’re done.',
  },
  {
    q: 'Is it safe?',
    a: 'Yes. Every payment is authenticated by your own bank using the same security you use for mobile banking (like Face ID or fingerprint) or online banking. Your card numbers or bank account details are never shared.',
  },
  {
    q: 'Which banks are supported?',
    a: 'Pay by Bank works with nearly all major UK and European banks. You’ll easily be able to find your bank listed when you select Pay by Bank at checkout.',
  },
  {
    q: 'Why should I use Pay by Bank instead of card?',
    a: 'Pay by Bank is a fast, secure alternative. There are no card details to type in, no risk of card fraud, and payments confirm instantly. It’s especially useful for larger purchases, or if you prefer not to share card information online.',
  },
]

function ChevronDownIcon(props) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="m4 6 4 4 4-4" />
    </svg>
  )
}

// The FAQ chapter: a short intro and a contact button on the left, the questions as toggles on the right
export function PayByBankFaqs() {
  return (
    <div className="not-prose my-8 grid grid-cols-1 gap-x-16 gap-y-8 lg:grid-cols-5 xl:max-w-none">
      <div className="lg:col-span-2">
        <p className="text-base/7 text-zinc-700 dark:text-zinc-300">
          Questions shoppers often ask about Pay by Bank. Add them to your own help pages, and change the answers to suit your checkout.
        </p>
        <p className="mt-4 text-base/7 text-zinc-700 dark:text-zinc-300">Have a question that isn’t here? Get in touch.</p>
        <a
          href={`mailto:${SUPPORT_EMAIL}`}
          className="mt-6 inline-flex items-center rounded-full px-5 py-2 text-sm font-medium text-zinc-900 ring-1 ring-zinc-900/15 transition hover:bg-zinc-50 dark:text-white dark:ring-white/20 dark:hover:bg-white/5"
        >
          Contact us
        </a>
      </div>
      <div className="divide-y divide-zinc-900/7.5 border-y border-zinc-900/7.5 lg:col-span-3 dark:divide-white/10 dark:border-white/10">
        {FAQS.map((f) => (
          <Disclosure key={f.q} as="div">
            <DisclosureButton className="group flex w-full items-center justify-between gap-6 py-4 text-left text-sm font-medium text-zinc-900 dark:text-white">
              {f.q}
              <ChevronDownIcon className="size-4 flex-none text-zinc-400 transition group-data-open:rotate-180 dark:text-zinc-500" />
            </DisclosureButton>
            <DisclosurePanel className="pr-10 pb-5 text-sm/6 text-zinc-600 dark:text-zinc-400">{f.a}</DisclosurePanel>
          </Disclosure>
        ))}
      </div>
    </div>
  )
}
