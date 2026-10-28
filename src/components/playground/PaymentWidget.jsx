'use client'

import { useEffect, useRef } from 'react'

// Loads the real COPYandPAY widget for a checkout, and swaps it cleanly when the
// checkout changes: wpwl.unload(), drop the widget's static.min.js and our script,
// then insert a fresh form and paymentWidgets.js (the documented reload sequence).

function unloadWidget() {
  try {
    if (window.wpwl && typeof window.wpwl.unload === 'function') window.wpwl.unload()
  } catch {}
  document.querySelectorAll('script').forEach((s) => {
    if (s.src.includes('static.min.js') || s.dataset.paymentWidgets === 'true') s.remove()
  })
}

export function PaymentWidget({ widgetBase, checkoutId, integrity, brands, action, onReady }) {
  let host = useRef(null)
  let readyRef = useRef(onReady)
  readyRef.current = onReady

  useEffect(() => {
    let el = host.current
    if (!el || !checkoutId) return
    unloadWidget()
    el.innerHTML = ''

    window.wpwlOptions = {
      style: 'plain',
      locale: 'en',
      brandDetection: true,
      onReady: function () {
        // MB WAY tidy-up from the knowledge base example
        document.querySelectorAll('.wpwl-form-virtualAccount-MBWAY .wpwl-group-customerEmail').forEach((n) => n.remove())
        readyRef.current?.()
      },
    }

    let form = document.createElement('form')
    form.action = action
    form.className = 'paymentWidgets'
    form.setAttribute('data-brands', brands.join(' '))
    el.appendChild(form)

    let script = document.createElement('script')
    script.src = `${widgetBase}/v1/paymentWidgets.js?checkoutId=${encodeURIComponent(checkoutId)}`
    script.async = true
    script.dataset.paymentWidgets = 'true'
    if (integrity) {
      script.integrity = integrity
      script.crossOrigin = 'anonymous'
    }
    document.body.appendChild(script)

    return () => {
      unloadWidget()
      if (el) el.innerHTML = ''
    }
    // brands/action are part of the checkout, so checkoutId covers them
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkoutId, widgetBase, integrity])

  return <div ref={host} className="nomupay-widget min-h-24" />
}
