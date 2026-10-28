import { Button } from '@/components/Button'
import { Heading } from '@/components/Heading'

const guides = [
  {
    href: '/copyandpay',
    name: 'COPYandPAY',
    description: 'Create a checkout, render the hosted payment form with cards and APMs, read the result, and charge saved details again.',
  },
  {
    href: '/server-to-server',
    name: 'Server-to-server',
    description: 'Send one APM straight to /v1/payments, redirect the shopper with the response, and read the result.',
  },
]

export function Guides() {
  return (
    <div className="my-16 xl:max-w-none">
      <Heading level={2} id="guides">
        Guides
      </Heading>
      <div className="not-prose mt-4 grid grid-cols-1 gap-8 border-t border-zinc-900/5 pt-10 sm:grid-cols-2 dark:border-white/5">
        {guides.map((guide) => (
          <div key={guide.href}>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">{guide.name}</h3>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{guide.description}</p>
            <p className="mt-4">
              <Button href={guide.href} variant="text" arrow="right">
                Start testing
              </Button>
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
