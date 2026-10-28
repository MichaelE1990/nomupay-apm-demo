import { Layout } from '@/components/Layout'

// Docs pages share the Protocol sidebar layout; the playground runs full screen
export default function DocsLayout({ children }) {
  return <Layout>{children}</Layout>
}
