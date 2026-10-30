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
    { id: 'prepare-the-checkout', step: 1, title: 'Prepare the checkout', tag: 'POST' },
    { id: 'render-the-payment-form', step: 2, title: 'Render the payment form' },
    { id: 'get-the-payment-result', step: 3, title: 'Get the payment result', tag: 'GET' },
  ],
  '/server-to-server': [
    { id: 'create-the-payment', step: 1, title: 'Create the payment', tag: 'POST' },
    { id: 'redirect-the-shopper', step: 2, title: 'Redirect the shopper' },
    { id: 'get-the-payment-result', step: 3, title: 'Get the payment result', tag: 'GET' },
  ],
  '/payment-methods': [
    { id: 'payment-brands', title: 'Payment brands' },
    { id: 'cards', title: 'Cards' },
  ],
  '/result-codes': [],
}

// Return pages (/copyandpay/return) belong to their parent guide
export function basePath(pathname) {
  return (pathname || '/').replace(/\/return\/?$/, '') || '/'
}
