// ANSI SGR text to HTML spans for the playground's ANSI output tab. Other escape sequences are dropped.
const ESCAPE = /\x1b\[([0-9;]*)m|\x1b\[[0-9;?]*[A-Za-z]|\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)|\x1b./g
const NAMES = ['black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white']

function escapeHtml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function applyCodes(state, params) {
  const codes = params === '' ? [0] : params.split(';').map(Number)
  for (let i = 0; i < codes.length; i++) {
    const code = codes[i]
    if (code === 0) Object.assign(state, { bold: false, dim: false, italic: false, underline: false, strike: false, inverse: false, fg: null, bg: null })
    else if (code === 1) state.bold = true
    else if (code === 2) state.dim = true
    else if (code === 3) state.italic = true
    else if (code === 4) state.underline = true
    else if (code === 7) state.inverse = true
    else if (code === 9) state.strike = true
    else if (code === 22) state.bold = state.dim = false
    else if (code === 23) state.italic = false
    else if (code === 24) state.underline = false
    else if (code === 27) state.inverse = false
    else if (code === 29) state.strike = false
    else if (code >= 30 && code <= 37) state.fg = NAMES[code - 30]
    else if (code >= 90 && code <= 97) state.fg = `bright-${NAMES[code - 90]}`
    else if (code === 39) state.fg = null
    else if (code >= 40 && code <= 47) state.bg = NAMES[code - 40]
    else if (code >= 100 && code <= 107) state.bg = `bright-${NAMES[code - 100]}`
    else if (code === 49) state.bg = null
    // 256-color and truecolor arguments are skipped, not misread as codes.
    else if (code === 38 || code === 48) i += codes[i + 1] === 5 ? 2 : codes[i + 1] === 2 ? 4 : 0
  }
}

function classes(state) {
  const list = []
  for (const flag of ['bold', 'dim', 'italic', 'underline', 'strike', 'inverse']) if (state[flag]) list.push(`ansi-${flag}`)
  if (state.fg) list.push(`ansi-fg-${state.fg}`)
  if (state.bg) list.push(`ansi-bg-${state.bg}`)
  return list
}

/** HTML for `text`: SGR runs become `<span class="ansi-...">`, everything else is escaped text. */
export function ansiToHtml(text) {
  const state = { fg: null, bg: null }
  let html = ''
  let at = 0
  const emit = (chunk) => {
    if (!chunk) return
    const list = classes(state)
    html += list.length ? `<span class="${list.join(' ')}">${escapeHtml(chunk)}</span>` : escapeHtml(chunk)
  }
  for (const match of text.matchAll(ESCAPE)) {
    emit(text.slice(at, match.index))
    if (match[1] !== undefined) applyCodes(state, match[1])
    at = match.index + match[0].length
  }
  emit(text.slice(at))
  return html
}
