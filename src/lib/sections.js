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
]

export const allSections = {
  '/': [
    { id: 'getting-started', title: 'Getting started' },
    { id: 'credentials', title: 'Credentials' },
    { id: 'guides', title: 'Guides' },
  ],
  '/copyandpay': [
    { id: 'prepare-the-checkout', step: 1, title: 'Prepare the checkout', tag: 'POST' },
    { id: 'render-the-payment-form', step: 2, title: 'Render the payment form' },
    { id: 'get-the-payment-result', step: 3, title: 'Get the payment result', tag: 'GET' },
  ],
  // The steps follow the chosen flow; S2SFlow updates this list
  '/server-to-server': [
    { id: 'payment-workflow', title: 'Payment workflow' },
    { id: 'send-the-payment', step: 1, title: 'Perform debit payment', tag: 'POST' },
    { id: 'redirect-shopper', step: 2, title: 'Redirect shopper' },
    { id: 'get-the-payment-status', step: 3, title: 'Get the payment status', tag: 'GET' },
    { id: 'manage-the-payment', step: 4, title: 'Manage the payment', tag: 'POST' },
  ],
}

// Return pages (/copyandpay/return) belong to their parent guide
export function basePath(pathname) {
  return (pathname || '/').replace(/\/return\/?$/, '') || '/'
}
