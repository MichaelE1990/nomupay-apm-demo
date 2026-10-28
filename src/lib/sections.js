// Page sections shown under the active item in the sidebar (Protocol style)
export const navigation = [
  {
    title: 'Guides',
    links: [
      { title: 'Introduction', href: '/' },
      { title: 'COPYandPAY', href: '/copyandpay' },
      { title: 'Server-to-server', href: '/server-to-server' },
    ],
  },
  {
    title: 'Reference',
    links: [
      { title: 'Payment methods', href: '/payment-methods' },
      { title: 'Result codes', href: '/result-codes' },
    ],
  },
]

export const allSections = {
  '/': [
    { id: 'environment', title: 'Environment' },
    { id: 'guides', title: 'Guides' },
    { id: 'reference', title: 'Reference' },
  ],
  '/copyandpay': [
    { id: 'prepare-the-checkout', title: 'Prepare the checkout', tag: 'POST' },
    { id: 'render-the-payment-form', title: 'Render the payment form' },
    { id: 'get-the-payment-result', title: 'Get the payment result', tag: 'GET' },
    { id: 'pay-again-with-saved-details', title: 'Pay again with saved details', tag: 'POST' },
  ],
  '/server-to-server': [
    { id: 'create-the-payment', title: 'Create the payment', tag: 'POST' },
    { id: 'redirect-the-shopper', title: 'Redirect the shopper' },
    { id: 'get-the-payment-result', title: 'Get the payment result', tag: 'GET' },
  ],
  '/payment-methods': [
    { id: 'cards', title: 'Cards' },
    { id: 'europe', title: 'Europe' },
    { id: 'international', title: 'International' },
  ],
  '/result-codes': [],
}

// Return pages (/copyandpay/return) belong to their parent guide
export function basePath(pathname) {
  return (pathname || '/').replace(/\/return\/?$/, '') || '/'
}
