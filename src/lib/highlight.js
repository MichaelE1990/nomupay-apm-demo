// Tiny syntax highlighters for the code panels. Output is escaped HTML with
// spans coloured by the Protocol template's --shiki-token-* variables.

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const span = (token, html) => `<span style="color:var(--shiki-token-${token})">${html}</span>`

export function buildCurl({ method = 'POST', url, params = [], token = '{access_token}' }) {
  const lines = [method === 'GET' ? `curl -G ${url} \\` : `curl ${url} \\`]
  lines.push(`  -H "Authorization: Bearer ${token}"${params.length ? ' \\' : ''}`)
  params.forEach(([k, v], i) => {
    lines.push(`  -d "${k}=${String(v).replace(/"/g, '\\"')}"${i < params.length - 1 ? ' \\' : ''}`)
  })
  return lines.join('\n')
}

export function highlightCurl(code) {
  return code
    .split('\n')
    .map((line) => {
      const head = line.match(/^(curl)( -G)?( \S+)( \\)?$/)
      if (head) return `${span('keyword', 'curl')}${head[2] ? span('parameter', head[2]) : ''}${esc(head[3])}${head[4] ? esc(head[4]) : ''}`
      const flag = line.match(/^(\s*)(-[A-Za-z])( )(".*")( \\)?$/)
      if (flag) return `${esc(flag[1])}${span('parameter', flag[2])} ${span('string', esc(flag[4]))}${flag[5] ? esc(flag[5]) : ''}`
      return esc(line)
    })
    .join('\n')
}

export function highlightJson(value) {
  const json = typeof value === 'string' ? value : JSON.stringify(value, null, 2)
  return json.replace(
    /("(?:\\.|[^"\\])*")(\s*:)?|\b(true|false|null)\b|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|([{}[\],])|([^"{}[\],\d\-tfn]+)/g,
    (m, str, colon, lit, num, punct) => {
      if (str) return colon ? `${span('keyword', esc(str))}${esc(colon)}` : span('string', esc(str))
      if (lit) return span('constant', lit)
      if (num) return span('function', num)
      if (punct) return span('punctuation', punct)
      return esc(m)
    },
  )
}

export function highlightHtml(code) {
  return esc(code)
    .replace(/ ([a-zA-Z-]+)="([^"]*)"/g, (m, attr, val) => ` ${span('parameter', attr)}=${span('string', `"${val}"`)}`)
    .replace(/(&lt;\/?)([a-zA-Z]+)/g, (m, open, tag) => `${open}${span('keyword', tag)}`)
}

export function highlightJs(code) {
  return code
    .split('\n')
    .map((line) => {
      // Whole-line comments only, so URLs inside strings stay strings
      const ci = line.trimStart().startsWith('//') ? line.indexOf('//') : -1
      const body = ci >= 0 ? line.slice(0, ci) : line
      const comment = ci >= 0 ? line.slice(ci) : ''
      const coloured = esc(body)
        .replace(/("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`[^`]*`)/g, (s) => span('string', s))
        .replace(/\b(const|let|var|function|if|else|return|new|for|of|document|window)\b(?![^<]*<\/span>)/g, (k) => span('keyword', k))
      return coloured + (comment ? span('comment', esc(comment)) : '')
    })
    .join('\n')
}
