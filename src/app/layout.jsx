import '@fontsource-variable/montserrat'

import { Providers } from '@/app/providers'

import '@/styles/tailwind.css'

export const metadata = {
  title: {
    template: '%s · Nomupay Payment Methods',
    default: 'Nomupay Payment Methods',
  },
  description:
    'Test the payment methods merchants can offer through Nomupay: build each request, send it to the test gateway, and use the response in the next step.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body className="flex min-h-full bg-white antialiased dark:bg-zinc-900">
        <Providers>
          <div className="w-full">{children}</div>
        </Providers>
      </body>
    </html>
  )
}
