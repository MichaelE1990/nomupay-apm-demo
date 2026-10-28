'use client'

// Send the shopper where the gateway asked: GET with query parameters, or POST a form
export function redirectShopper(redirect) {
  if (!redirect?.url) return
  let params = Array.isArray(redirect.parameters) ? redirect.parameters : []
  let method = String(redirect.method || (params.length ? 'POST' : 'GET')).toUpperCase()
  if (method === 'GET') {
    let url = new URL(redirect.url)
    params.forEach((p) => url.searchParams.append(p.name, p.value))
    window.location.href = url.toString()
    return
  }
  let form = document.createElement('form')
  form.method = 'POST'
  form.action = redirect.url
  params.forEach((p) => {
    let input = document.createElement('input')
    input.type = 'hidden'
    input.name = p.name
    input.value = p.value
    form.appendChild(input)
  })
  document.body.appendChild(form)
  form.submit()
}

export function redirectMethod(redirect) {
  let params = Array.isArray(redirect?.parameters) ? redirect.parameters : []
  return String(redirect?.method || (params.length ? 'POST' : 'GET')).toUpperCase()
}

export function redirectSnippet(redirect) {
  let params = Array.isArray(redirect?.parameters) ? redirect.parameters : []
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
