'use client'

import { useMotionValue } from 'framer-motion'
import Link from 'next/link'

import { Heading } from '@/components/Heading'
import { ResourceIcon, ResourcePattern } from '@/components/Resources'

function WidgetIcon(props) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" {...props}>
      <rect x="2.75" y="3.75" width="14.5" height="12.5" rx="2" strokeWidth="1.25" />
      <path fill="none" strokeWidth="1.25" strokeLinecap="round" d="M2.75 7.25h14.5M5.75 10.25h8.5M5.75 13h5" />
    </svg>
  )
}

function ServerIcon(props) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" {...props}>
      <rect x="3.25" y="3.25" width="13.5" height="5.5" rx="1.5" strokeWidth="1.25" />
      <rect x="3.25" y="11.25" width="13.5" height="5.5" rx="1.5" strokeWidth="1.25" />
      <path fill="none" strokeWidth="1.25" strokeLinecap="round" d="M6 6h.01M6 14h.01M9 6h4.5M9 14h4.5" />
    </svg>
  )
}

function BankIcon(props) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" {...props}>
      <path strokeWidth="1.25" strokeLinejoin="round" d="M2.75 7.25 10 3.25l7.25 4H2.75Z" />
      <path fill="none" strokeWidth="1.25" strokeLinecap="round" d="M4.75 9.5v5M8.25 9.5v5M11.75 9.5v5M15.25 9.5v5M2.75 16.75h14.5" />
    </svg>
  )
}

function RepeatIcon(props) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" {...props}>
      <path
        fill="none"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4.25 9.25A5.75 5.75 0 0 1 14.6 5.8l1.15 1.2m0-3.25V7h-3.25M15.75 10.75A5.75 5.75 0 0 1 5.4 14.2l-1.15-1.2m0 3.25V13H7.5"
      />
    </svg>
  )
}

const guides = [
  {
    href: '/copyandpay',
    name: 'Nomupay PPRO Copy & Pay',
    description: 'Create a checkout, render the hosted payment form with cards and payment brands, and get the payment result.',
    icon: WidgetIcon,
    pattern: { y: 16, squares: [[0, 1], [1, 3]] },
  },
  {
    href: '/server-to-server',
    name: 'Nomupay PPRO Server to Server APMs',
    description: 'Send the payment from your server, redirect the shopper to the payment brand, get the payment status and refund it.',
    icon: ServerIcon,
    pattern: { y: -6, squares: [[-1, 2], [1, 3]] },
  },
  {
    href: '/open-banking',
    name: 'Pay by Bank',
    description: 'Let shoppers pay from their bank account with Open Banking: set up your account, then take payments by link or at your checkout.',
    icon: BankIcon,
    pattern: { y: 10, squares: [[0, 3], [1, 1]] },
  },
  {
    href: '/recurring-payments',
    name: 'Nomupay Server to Server Recurring Payments',
    description: 'Store a card with an initial payment, charge it again without the shopper, and simulate declines on the subsequent payments.',
    icon: RepeatIcon,
    pattern: { y: 22, squares: [[0, 2], [1, 4]] },
  },
]

function GuideCard({ guide }) {
  let mouseX = useMotionValue(0)
  let mouseY = useMotionValue(0)
  function onMouseMove({ currentTarget, clientX, clientY }) {
    let { left, top } = currentTarget.getBoundingClientRect()
    mouseX.set(clientX - left)
    mouseY.set(clientY - top)
  }
  return (
    <div
      onMouseMove={onMouseMove}
      className="group relative flex rounded-2xl bg-zinc-50 transition-shadow hover:shadow-md hover:shadow-zinc-900/5 dark:bg-white/2.5 dark:hover:shadow-black/5"
    >
      <ResourcePattern {...guide.pattern} mouseX={mouseX} mouseY={mouseY} />
      <div className="absolute inset-0 rounded-2xl ring-1 ring-zinc-900/7.5 ring-inset group-hover:ring-zinc-900/10 dark:ring-white/10 dark:group-hover:ring-white/20" />
      <div className="relative rounded-2xl px-4 pt-16 pb-4">
        <ResourceIcon icon={guide.icon} />
        <h3 className="mt-4 text-sm/7 font-semibold text-zinc-900 dark:text-white">
          <Link href={guide.href}>
            <span className="absolute inset-0 rounded-2xl" />
            {guide.name}
          </Link>
        </h3>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{guide.description}</p>
      </div>
    </div>
  )
}

export function Guides() {
  return (
    <div className="my-16 xl:max-w-none">
      <Heading level={2} id="guides">
        Guides
      </Heading>
      <div className="not-prose mt-4 grid grid-cols-1 gap-8 border-t border-zinc-900/5 pt-10 sm:grid-cols-2 dark:border-white/5">
        {guides.map((guide) => (
          <GuideCard key={guide.href} guide={guide} />
        ))}
      </div>
    </div>
  )
}
