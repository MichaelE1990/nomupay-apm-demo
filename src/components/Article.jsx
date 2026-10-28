import { Prose } from '@/components/Prose'

// Page wrapper from the Protocol template's MDX layout
export function Article({ children }) {
  return (
    <article className="flex h-full flex-col pt-16 pb-10">
      <Prose className="flex-auto">{children}</Prose>
    </article>
  )
}
