import { Providers } from '@/app/providers'

import '@/styles/tailwind.css'

export const metadata = {
  title: {
    template: '%s · NomuPay APM Demo',
    default: 'NomuPay APM Demo',
  },
  description:
    'Test payment brands and cards the way a merchant integrates them: build the request, send it, and use the response in the next step.',
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
