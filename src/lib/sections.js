// The sidebar, organised like a help centre: a category, its sections, and the
// articles in each section. The open article lists its own chapters (the page
// sections below) under it.
export const navigation = [
  {
    title: 'Guides',
    sections: [
      { title: 'Introduction', links: [{ title: 'Overview', href: '/' }] },
      {
        title: 'Integrations',
        links: [
          { title: 'COPYandPAY', href: '/copyandpay' },
          { title: 'Server-to-server', href: '/server-to-server' },
        ],
      },
    ],
  },
]

// Every article in sidebar order
export const allPages = navigation.flatMap((category) => category.sections.flatMap((section) => section.links))

// Category, section and article for a path (the breadcrumbs above an article)
export function trail(pathname) {
  for (let category of navigation)
    for (let section of category.sections)
      for (let link of section.links) if (link.href === pathname) return [category.title, section.title, link.title]
  return null
}

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
