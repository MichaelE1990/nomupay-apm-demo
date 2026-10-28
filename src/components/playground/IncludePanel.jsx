'use client'

import clsx from 'clsx'
import { useEffect, useRef } from 'react'

import { getBrand } from '@/lib/brands'
import { GROUPS, groupOf, groupParams } from '@/lib/playground'

// "What to include": the checkout request split into the pieces each setting adds

function useFlashScroll(flash) {
  let ref = useRef(null)
  useEffect(() => {
    let el = ref.current
    // offsetParent is null when the panel is hidden (phone tabs), so nothing jumps there
    if (flash && el?.offsetParent) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [flash])
  return ref
}

function FlashBadge({ kind }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-2xs font-medium text-emerald-700 ring-1 ring-emerald-600/20 ring-inset dark:bg-emerald-400/10 dark:text-emerald-400 dark:ring-emerald-400/20">
      <span className="size-1.5 rounded-full bg-emerald-500" />
      {kind === 'added' ? 'Added' : 'Updated'}
    </span>
  )
}

export function Card({ flash, kind, title, meta, note, children, className }) {
  let ref = useFlashScroll(flash)
  return (
    <section
      ref={ref}
      className={clsx(
        'scroll-my-4 rounded-xl bg-white p-4 ring-1 transition-shadow duration-500 dark:bg-white/2.5',
        flash ? 'shadow-md ring-2 shadow-emerald-500/10 ring-emerald-500/70' : 'ring-zinc-900/7.5 dark:ring-white/10',
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <h4 className="text-sm font-semibold text-zinc-900 dark:text-white">{title}</h4>
        {flash && <FlashBadge kind={kind} />}
        {meta && <span className="ml-auto text-xs text-zinc-400 dark:text-zinc-500">{meta}</span>}
      </div>
      {note && <p className="mt-1 text-xs/5 text-zinc-500 dark:text-zinc-400">{note}</p>}
      <div className="mt-3">{children}</div>
    </section>
  )
}

function Rows({ params, changed }) {
  return (
    <dl className="divide-y divide-zinc-900/5 border-t border-zinc-900/5 dark:divide-white/5 dark:border-white/5">
      {params.map(([k, v]) => {
        let isNew = changed.has(`${k}=${v}`)
        return (
          <div key={k} className="flex items-baseline justify-between gap-4 py-1.5">
            <dt className="flex-none font-mono text-xs text-zinc-900 dark:text-white">{k}</dt>
            <dd
              title={String(v)}
              className={clsx('min-w-0 truncate text-right font-mono text-xs', isNew ? 'font-medium text-emerald-600 dark:text-emerald-400' : 'text-zinc-500 dark:text-zinc-400')}
            >
              {isNew && <span className="mr-1.5 inline-block size-1.5 rounded-full bg-emerald-500 align-middle" aria-label="changed" />}
              {String(v)}
            </dd>
          </div>
        )
      })}
    </dl>
  )
}

function CartTable({ params, changed }) {
  let items = []
  for (let [k, v] of params) {
    let m = k.match(/^cart\.items\[(\d+)\]\.(\w+)$/)
    if (!m) continue
    let i = Number(m[1])
    items[i] = items[i] || { fields: {} }
    items[i].fields[m[2]] = v
    if (changed.has(`${k}=${v}`)) items[i].changed = true
  }
  let cols = ['name', 'quantity', 'price']
  let currency = items.find(Boolean)?.fields.currency
  return (
    <div className="overflow-hidden rounded-lg ring-1 ring-zinc-900/5 dark:ring-white/5">
      <table className="w-full table-fixed text-left font-mono text-xs">
        <thead className="bg-zinc-50 text-zinc-500 dark:bg-white/2.5 dark:text-zinc-400">
          <tr>
            {cols.map((c) => (
              <th key={c} scope="col" className={clsx('px-2 py-1.5 font-medium', c === 'name' ? 'w-1/2' : c === 'quantity' ? 'w-1/5 text-right' : 'text-right')}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-900/5 dark:divide-white/5">
          {items.filter(Boolean).map((item, i) => (
            <tr key={i} className={item.changed ? 'bg-emerald-50/60 dark:bg-emerald-400/5' : ''}>
              {cols.map((c) => (
                <td key={c} className={clsx('truncate px-2 py-1.5', c === 'name' ? 'text-zinc-900 dark:text-white' : 'text-right text-zinc-500 dark:text-zinc-400')} title={item.fields[c]}>
                  {item.fields[c]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="border-t border-zinc-900/5 px-2 py-1.5 font-mono text-2xs text-zinc-400 dark:border-white/5 dark:text-zinc-500">
        cart.items[n].name, .quantity, .price{currency ? `, .currency=${currency}` : ''}
      </p>
    </div>
  )
}

/**
 * params: the request being shown; base: what to compare against for "changed";
 * focus: { id, kind } of the setting just switched; need: fields forced by methods
 */
export function IncludeGroups({ params, base, focus, need, config }) {
  let id = ([k, v]) => `${k}=${v}`
  let baseSet = new Set((base || []).map(id))
  let changed = new Set(base ? params.filter((p) => p[0] !== 'merchantTransactionId' && !baseSet.has(id(p))).map(id) : [])
  let groups = groupParams(params)
  let removed =
    focus?.kind === 'removed' && base
      ? base.filter((p) => groupOf(p[0]) === focus.id && !params.some(([k]) => k === p[0]))
      : []
  let forcedNote = (g) => {
    if (g.id === 'contact' && !config.contact) {
      let who = [...new Set(Object.entries(need).filter(([k]) => k.startsWith('customer.')).flatMap(([, v]) => v))]
      return `Name and email is off, but ${who.join(', ')} still needs these.`
    }
    if (g.id === 'billing' && !config.billing) return `Billing address is off, but ${(need['billing.country'] || []).join(', ')} needs billing.country.`
    return null
  }
  let titleFor = (g) => (g.id === 'billing' && !config.billing ? 'Billing country' : g.id === 'contact' && !config.contact ? 'Customer fields' : g.title)

  return (
    <div className="space-y-3">
      {removed.length > 0 && (
        <div className="rounded-xl bg-rose-50 px-4 py-3 text-xs/5 text-rose-800 ring-1 ring-rose-600/15 ring-inset dark:bg-rose-400/10 dark:text-rose-300 dark:ring-rose-400/20">
          <span className="font-medium">{GROUPS.find((g) => g.id === focus.id)?.title} is off.</span> No longer sent:{' '}
          <span className="font-mono">{removed.map(([k]) => k).join(', ')}</span>
        </div>
      )}
      {groups.map((g) => {
        let flash = Boolean(focus && focus.id === g.id && focus.kind !== 'removed')
        return (
          <Card
            key={g.id}
            flash={flash}
            kind={focus?.kind}
            title={titleFor(g)}
            meta={`${g.params.length} ${g.params.length === 1 ? 'parameter' : 'parameters'}`}
            note={forcedNote(g) || g.note}
          >
            {g.id === 'lineItems' ? <CartTable params={g.params} changed={changed} /> : <Rows params={g.params} changed={changed} />}
          </Card>
        )
      })}
    </div>
  )
}

export function BrandsCard({ brands, flash, integrity, action }) {
  return (
    <Card flash={flash} kind="changed" title="Payment methods" meta="data-brands" note="The form lists these, in this order. Each must be enabled on the entity.">
      <ul role="list" className="flex flex-wrap gap-1.5">
        {brands.map((code) => (
          <li
            key={code}
            className="inline-flex items-center gap-1.5 rounded-md bg-zinc-50 px-2 py-1 text-xs text-zinc-700 ring-1 ring-zinc-900/10 ring-inset dark:bg-white/5 dark:text-zinc-300 dark:ring-white/10"
          >
            {getBrand(code)?.name}
            <span className="font-mono text-2xs text-zinc-400">{code}</span>
          </li>
        ))}
      </ul>
      <dl className="mt-3 divide-y divide-zinc-900/5 border-t border-zinc-900/5 dark:divide-white/5 dark:border-white/5">
        <div className="flex items-baseline justify-between gap-4 py-1.5">
          <dt className="font-mono text-xs text-zinc-900 dark:text-white">action</dt>
          <dd className="min-w-0 truncate font-mono text-xs text-zinc-500 dark:text-zinc-400" title={action}>
            {action}
          </dd>
        </div>
        {integrity && (
          <div className="flex items-baseline justify-between gap-4 py-1.5">
            <dt className="font-mono text-xs text-zinc-900 dark:text-white">integrity</dt>
            <dd className="min-w-0 truncate font-mono text-xs text-zinc-500 dark:text-zinc-400" title={integrity}>
              {integrity}
            </dd>
          </div>
        )}
      </dl>
    </Card>
  )
}
