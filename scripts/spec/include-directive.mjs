/*
 * Engine-free recognition of the processor-level include directive (PART 6,
 * PART 9 §19).
 *
 * The core parser deliberately never reaches `include_directive`, so
 * scripts/spec/html.mjs renders `{{ … }}` as ordinary inline text and cannot
 * observe where a directive ENDS. Both readings of a directive whose quoted run
 * holds a `}}` therefore render the same characters, which is why the HTML
 * corpus cannot arbitrate the closer (markup-carve/carve#2012). This module is
 * that arbiter: it recognizes the directive and nothing else, so a targeted
 * test can ask where the closer falls without driving an engine.
 *
 * It is NOT wired into the oracle's renderer, and must not be: a core that
 * recognized the directive would stop leaving it literal.
 */

const isSpace = (ch) => ch === ' '

/*
 * The end of a quoted run that opens at `from`, or -1 when the quote is never
 * terminated on its line. A backslash escapes the next character, so `\"` stays
 * inside the run; a newline ends the search because both quoted productions
 * exclude it.
 */
function quotedRunEnd(text, from) {
  const quote = text[from]
  for (let i = from + 1; i < text.length; i += 1) {
    const ch = text[i]
    if (ch === '\n') return -1
    if (ch === '\\') {
      i += 1
      continue
    }
    if (ch === quote) return i
  }
  return -1
}

/*
 * Only the two quoted slots open a run: the path right after the padding, which
 * takes a double quote, and an option value right after `@key:`. A quote anywhere
 * else is a character of its token, so `{{ it's }} it's }}` closes at the first pair.
 */
const OPTION_VALUE_SLOT = /@[A-Za-z_][A-Za-z0-9_-]*:$/
function opensQuotedSlot(text, from, at) {
  const before = text.slice(from, at)
  if (OPTION_VALUE_SLOT.test(before)) return true
  return text[at] === '"' && /^ +$/.test(before)
}

/*
 * THE CLOSER: the index of the first `}}` at or after `from` that falls OUTSIDE
 * any quoted run, or -1 when the line holds none.
 *
 * An UNTERMINATED quote does not open a run: it is passed over as an ordinary
 * character, so it can never pair with a quote further along the line. That is
 * the branch a greedy quote-aware scanner gets wrong in the other direction -
 * it would swallow the rest of the line and find no closer at all.
 */
export function findCloser(text, from = 0) {
  for (let i = from; i < text.length; i += 1) {
    const ch = text[i]
    if (ch === '\n') return -1
    if ((ch === '"' || ch === "'") && opensQuotedSlot(text, from, i)) {
      const end = quotedRunEnd(text, i)
      if (end !== -1) {
        i = end
        continue
      }
      continue
    }
    if (ch === '}' && text[i + 1] === '}') return i
  }
  return -1
}

const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_-]*/
// include_section takes explicit_identifier, which may also open on a digit.
const EXPLICIT_IDENTIFIER = /^[A-Za-z0-9_][A-Za-z0-9_-]*/
// `include_unquoted_value`: PART 4's `unquoted_value` less the `@`, so a value
// ends at the next option's marker.
const UNQUOTED_VALUE = /^[^}|"'\\ \t\r\n@]+/

/* `include_path`: the quoted form, else the bare run. */
function readPath(inner, at) {
  if (inner[at] === '"') {
    const end = quotedRunEnd(inner, at)
    if (end === -1 || end === at + 1) return null // `quoted_include_path` holds one or more characters
    return { value: unescapePath(inner.slice(at + 1, end)), quoted: true, next: end + 1 }
  }
  let i = at
  while (i < inner.length && !'#@} '.includes(inner[i])) i += 1
  if (i === at) return null
  return { value: inner.slice(at, i), quoted: false, next: i }
}

// A quoted path and a quoted value take the one escape set (PART 4): a backslash
// before ASCII punctuation yields it, any other pair stays two characters.
const unescapePath = (raw) => raw.replace(/\\([!-/:-@[-`{-~])/g, '$1')

/* `attribute_value` (PART 4): a quoted run in either quote, else the bare set. */
function readValue(inner, at) {
  if (inner[at] === '"' || inner[at] === "'") {
    const end = quotedRunEnd(inner, at)
    if (end === -1) return null
    return { value: unescapePath(inner.slice(at + 1, end)), raw: inner.slice(at + 1, end), quote: inner[at], next: end + 1 }
  }
  const m = UNQUOTED_VALUE.exec(inner.slice(at))
  if (!m) return null
  return { value: m[0], raw: m[0], quote: null, next: at + m[0].length }
}

/*
 * Parse one directive that opens at `open` (which must be a `{{`), or null when
 * the text between the opener and its closer is not an `include_directive` -
 * the malformed case §19 leaves as literal text.
 */
export function scanDirective(text, open) {
  if (text.slice(open, open + 2) !== '{{') return null
  const closer = findCloser(text, open + 2)
  if (closer === -1) return null
  const inner = text.slice(open + 2, closer)

  let i = 0
  while (i < inner.length && isSpace(inner[i])) i += 1
  if (i === 0) return null // padding is REQUIRED, and is a run

  const path = readPath(inner, i)
  if (!path) return null
  i = path.next

  let section = null
  // The production glues `[include_section]` to the path and `[include_options]`
  // to whatever precedes it, and the separating spaces are OPTIONAL in both
  // slots (carve#2773): `{{ c.crv#sec }}` and `{{ c.crv #Alpha@shift:1 }}` are
  // as well formed as the spaced spellings.
  {
    let j = i
    while (j < inner.length && isSpace(inner[j])) j += 1
    if (inner[j] === '#') {
      const m = EXPLICIT_IDENTIFIER.exec(inner.slice(j + 1))
      if (!m) return null
      section = m[0]
      i = j + 1 + m[0].length
    }
  }

  const options = []
  for (;;) {
    let j = i
    while (j < inner.length && isSpace(inner[j])) j += 1
    if (inner[j] !== '@') break
    const key = IDENTIFIER.exec(inner.slice(j + 1))
    if (!key) return null
    const k = j + 1 + key[0].length
    // The value is optional in the shape (a bare `@code`, I1c); which keys may
    // omit it is semantics, not recognition.
    if (inner[k] !== ':') {
      options.push([key[0], null])
      i = k
      continue
    }
    const value = readValue(inner, k + 1)
    if (!value) return null
    options.push(key[0] === 'cols' ? [key[0], value.raw, value.quote] : [key[0], value.value])
    i = value.next
  }

  const tail = inner.slice(i)
  if (tail === '' || !/^ +$/.test(tail)) return null // padding is REQUIRED on both sides

  return {
    start: open,
    closer,
    end: closer + 2,
    path: path.value,
    quoted: path.quoted,
    section,
    options,
  }
}

/** Every directive in `text`, left to right, skipping malformed openers. */
export function findDirectives(text) {
  const found = []
  for (let i = 0; i < text.length - 1; i += 1) {
    if (text[i] !== '{' || text[i + 1] !== '{') continue
    const directive = scanDirective(text, i)
    if (!directive) continue
    found.push(directive)
    i = directive.end - 1
  }
  return found
}

// I1c: `@code:lang` takes a `language_info` token.
const LANGUAGE_INFO = /^[A-Za-z0-9_+#./-]+$/
export function hasInvalidCodeLanguage(directive) {
  return directive.options.some(([key, value]) => key === 'code' && value !== null && !LANGUAGE_INFO.test(value))
}

// I1 rejects zero, leading zeros, and reversed physical line ranges.
export function hasInvalidLineRange(directive) {
  return directive.options.some(([key, value]) => {
    if (key !== 'lines') return false
    const match = /^([1-9][0-9]*)-([1-9][0-9]*)$/.exec(value ?? '')
    return !match || BigInt(match[1]) > BigInt(match[2])
  })
}
