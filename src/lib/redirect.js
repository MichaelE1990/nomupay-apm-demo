'use client'

// The redirect object from a pending /v1/payments response: send the shopper to
// redirect.url with its parameters, as GET (query string) or POST (form fields)

export const RETURN_MESSAGE = 'nomupay-apm-demo:shopper-returned'

export function redirectMethod(redirect) {
  let params = Array.isArray(redirect?.parameters) ? redirect.parameters : []
  return String(redirect?.method || (params.length ? 'POST' : 'GET')).toUpperCase()
}

function redirectParams(redirect) {
  return Array.isArray(redirect?.parameters) ? redirect.parameters : []
}

// GET: the full URL with the parameters added to the query string
export function redirectUrl(redirect) {
  let url = new URL(redirect.url)
  redirectParams(redirect).forEach((p) => url.searchParams.append(p.name, p.value))
  return url.toString()
}

// Navigate a window or frame by name ('_self' for this page, an iframe's name, or a popup's name)
export function sendShopper(redirect, target = '_self') {
  if (!redirect?.url) return
  if (redirectMethod(redirect) === 'GET') {
    if (target === '_self') window.location.href = redirectUrl(redirect)
    else window.open(redirectUrl(redirect), target)
    return
  }
  let form = document.createElement('form')
  form.method = 'POST'
  form.action = redirect.url
  form.target = target
  form.style.display = 'none'
  redirectParams(redirect).forEach((p) => {
    let input = document.createElement('input')
    input.type = 'hidden'
    input.name = p.name
    input.value = p.value
    form.appendChild(input)
  })
  document.body.appendChild(form)
  form.submit()
  form.remove()
}

// Opens a popup window and sends the shopper there, so this page stays put
export function sendShopperToPopup(redirect, name = 'nomupay-apm-payment') {
  let width = 480
  let height = 760
  let left = Math.max(0, window.screenX + (window.outerWidth - width) / 2)
  let top = Math.max(0, window.screenY + (window.outerHeight - height) / 2)
  let popup = window.open('', name, `popup,width=${width},height=${height},left=${left},top=${top}`)
  if (!popup) return false
  sendShopper(redirect, name)
  popup.focus()
  return true
}

// Code the merchant would run: before step 1 a template, then the real redirect
export function redirectSnippet(redirect) {
  if (!redirect?.url) {
    return `// "redirect" from the step 1 response
const { url, method, parameters = [] } = response.redirect

if ((method || (parameters.length ? "POST" : "GET")) === "GET") {
  // GET: add the parameters to the query string
  const target = new URL(url)
  parameters.forEach(({ name, value }) => target.searchParams.append(name, value))
  window.location.href = target.toString()
} else {
  // POST: send the parameters as form fields
  const form = document.createElement("form")
  form.method = "POST"
  form.action = url
  parameters.forEach(({ name, value }) => {
    const input = document.createElement("input")
    input.type = "hidden"
    input.name = name
    input.value = value
    form.appendChild(input)
  })
  document.body.appendChild(form)
  form.submit()
}`
  }
  let params = redirectParams(redirect)
  let method = redirectMethod(redirect)
  let head = `// "redirect" from the step 1 response\nconst redirect = ${JSON.stringify({ url: redirect.url, ...(redirect.method ? { method: redirect.method } : {}), parameters: params }, null, 2)}\n\n`
  if (method === 'GET')
    return (
      head +
      (params.length
        ? `const url = new URL(redirect.url)\nredirect.parameters.forEach(({ name, value }) => url.searchParams.append(name, value))\nwindow.location.href = url.toString()`
        : `// No parameters: send the shopper straight to the URL\nwindow.location.href = redirect.url`)
    )
  return (
    head +
    `// POST the parameters to the URL as a form\nconst form = document.createElement("form")\nform.method = "POST"\nform.action = redirect.url\nredirect.parameters.forEach(({ name, value }) => {\n  const input = document.createElement("input")\n  input.type = "hidden"\n  input.name = name\n  input.value = value\n  form.appendChild(input)\n})\ndocument.body.appendChild(form)\nform.submit()`
  )
}
