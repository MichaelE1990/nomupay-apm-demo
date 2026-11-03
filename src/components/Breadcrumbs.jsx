'use client'

import { usePathname } from 'next/navigation'

import { basePath, trail } from '@/lib/sections'

// Category › Section › Article, above the article (as in a help centre)
export function Breadcrumbs() {
  let crumbs = trail(basePath(usePathname()))
  if (!crumbs) return null
  return (
    <nav aria-label="Breadcrumb" className="not-prose relative mb-6">
      <ol role="list" className="flex flex-wrap items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
        {crumbs.map((c, i) => (
          <li key={c} className="flex items-center gap-1.5">
            {i > 0 && (
              <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="size-3 text-zinc-400 dark:text-zinc-500">
                <path d="m6.5 4.5 3.5 3.5-3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
            <span className={i === crumbs.length - 1 ? 'font-medium text-zinc-700 dark:text-zinc-300' : undefined} aria-current={i === crumbs.length - 1 ? 'page' : undefined}>
              {c}
            </span>
          </li>
        ))}
      </ol>
    </nav>
  )
}
