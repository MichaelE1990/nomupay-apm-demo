'use client'

import { CloseButton } from '@headlessui/react'
import clsx from 'clsx'
import { AnimatePresence, motion } from 'framer-motion'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useRef, useState } from 'react'

import { useIsInsideMobileNavigation } from '@/components/MobileNavigation'
import { useSectionStore } from '@/components/SectionProvider'
import { Tag } from '@/components/Tag'
import { basePath, navigation } from '@/lib/sections'

// The sidebar as a help centre: category > sections > articles, with the open
// article's chapters under it (as in the Stripe API reference)

function useInitialValue(value, condition = true) {
  // eslint-disable-next-line react-hooks/refs
  let initialValue = useRef(value).current
  return condition ? initialValue : value
}

function ChevronIcon(props) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" {...props}>
      <path d="m4.5 6.5 3.5 3.5 3.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ArticleLink({ href, active, children }) {
  return (
    <CloseButton
      as={Link}
      href={href}
      aria-current={active ? 'page' : undefined}
      className={clsx(
        'block rounded-md py-1 pr-2 pl-3 text-sm transition',
        active ? 'font-medium text-zinc-900 dark:text-white' : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white',
      )}
    >
      {children}
    </CloseButton>
  )
}

function ChapterLink({ href, current, step, tag, children }) {
  return (
    <CloseButton
      as={Link}
      href={href}
      aria-current={current ? 'location' : undefined}
      className={clsx(
        'flex items-center justify-between gap-2 rounded-md py-1 pr-2 pl-3 text-[0.8125rem] transition',
        current
          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300'
          : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white',
      )}
    >
      <span className="truncate">
        {step && <span className="mr-2 font-mono text-xs tabular-nums opacity-70">{step}</span>}
        {children}
      </span>
      {tag && (
        <Tag variant="small" color="zinc">
          {tag}
        </Tag>
      )}
    </CloseButton>
  )
}

function NavSection({ section, pathname, chapters, current }) {
  let [open, setOpen] = useState(true)
  return (
    <li>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-2 rounded-md px-3 py-1.5 text-left text-sm font-semibold text-zinc-900 transition hover:bg-zinc-900/2.5 dark:text-white dark:hover:bg-white/2.5"
      >
        {section.title}
        <ChevronIcon className={clsx('size-4 flex-none text-zinc-400 transition', !open && '-rotate-90')} />
      </button>
      {open && (
        <ul role="list" className="mt-0.5 mb-2 ml-3 space-y-0.5 border-l border-zinc-900/10 pl-1.5 dark:border-white/10">
          {section.links.map((link) => {
            let active = link.href === pathname
            return (
              <li key={link.href}>
                <ArticleLink href={link.href} active={active}>
                  {link.title}
                </ArticleLink>
                <AnimatePresence initial={false}>
                  {active && chapters.length > 0 && (
                    <motion.ul
                      role="list"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1, transition: { delay: 0.1 } }}
                      exit={{ opacity: 0, transition: { duration: 0.15 } }}
                      className="mt-0.5 mb-1 ml-3 space-y-0.5"
                    >
                      {chapters.map((chapter) => (
                        <li key={chapter.id}>
                          <ChapterLink href={`${link.href}#${chapter.id}`} current={chapter.id === current} step={chapter.step} tag={chapter.tag}>
                            {chapter.title}
                          </ChapterLink>
                        </li>
                      ))}
                    </motion.ul>
                  )}
                </AnimatePresence>
              </li>
            )
          })}
        </ul>
      )}
    </li>
  )
}

export function Navigation(props) {
  // In the mobile navigation, keep what was there when it opened, so it doesn't
  // change during the close animation
  let isInsideMobileNavigation = useIsInsideMobileNavigation()
  let [pathname, chapters, visible] = useInitialValue(
    [basePath(usePathname()), useSectionStore((s) => s.sections), useSectionStore((s) => s.visibleSections)],
    isInsideMobileNavigation,
  )
  // The chapter being read: the first one on screen
  let current = visible.find((id) => id !== '_top') || null

  return (
    <nav {...props}>
      <ul role="list">
        {navigation.map((category, i) => (
          <li key={category.title} className={clsx(i > 0 && 'mt-8')}>
            <h2 className="px-3 text-xs font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">{category.title}</h2>
            <ul role="list" className="mt-2 space-y-1">
              {category.sections.map((section) => (
                <NavSection key={section.title} section={section} pathname={pathname} chapters={chapters} current={current} />
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </nav>
  )
}
