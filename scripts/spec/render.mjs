/*
 * Executable PART 3 (inline, via the Ohm Core grammar), PART 9R (two-pass
 * resolution) and PART 10 (HTML serialization) for the executable subset.
 *
 * Sentinels: footnote references and crossrefs render as ...
 * tokens during the tree pass and are resolved in the PART 9R pass, which
 * owns numbering and the symbol tables.
 */

import { readFileSync } from 'node:fs'
import { resolve as presolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as ohm from 'ohm-js'
import { MAX_CODE_RUN, Refuse, trimWs } from './layout.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const g = ohm.grammar(readFileSync(presolve(here, '../../resources/carve-core.ohm'), 'utf8'))

// Bidi override controls PLUS the pipeline's own PART 9R sentinels
// (U+E000 open, U+E001 close, U+0002 STX field separator). Literal document
// text must never carry these through into the resolution passes, or it would
// be reinterpreted as pipeline framing (spoofed refs/footnotes, JSON.parse).
const STRIP = /[‪-‮⁦-⁩]/g

const escapeMarkup = (s) =>
  s
    .replace(STRIP, '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')

// TEXT serializes a no-break space as the entity (PART 9 section 23).
const escapeHtml = (s) => escapeMarkup(s).replaceAll(' ', '&nbsp;')

// An ATTRIBUTE does not. All three engines write the character itself in
// an attribute value, and both spellings parse to the same id - but the
// corpus compares bytes, so a heading whose text starts with a no-break
// space came out as id="&nbsp;Title" here and id=" Title" everywhere
// else.
export const escapeAttr = (s) => escapeMarkup(s).replaceAll('"', '&quot;').replaceAll("'", '&apos;')

// PART 9 SS25: URL sink scheme denylist -- a denylisted scheme renders an
// EMPTY value. Scheme detection first strips ASCII controls and ALL Unicode
// whitespace before matching, so an obfuscated scheme cannot slip past.
const DENY = new Set(['javascript', 'vbscript', 'data', 'file',
  'ms-msdt', 'ms-office', 'ms-word', 'ms-excel', 'ms-powerpoint', 'ms-access',
  'ms-visio', 'ms-project', 'ms-publisher', 'ms-infopath', 'ms-spd',
  'ms-search', 'search-ms', 'ms-cxh', 'ms-cxh-full', 'shell', 'vscode',
  'vscode-insiders', 'jar'])

/**
 * Resolve the three escapes a link destination has (grammar
 * `destination_escape`). Balanced parentheses are already part of the run and
 * need no unescaping; a backslash before anything else is an ordinary
 * character and is left alone.
 */
const unescapeDest = (text) => text.replace(/\\([()\\])/g, '$1')

export function destValue(dest) {
  return unescapeDest(dest.sourceString)
}

// A reference definition's destination is the same `link_destination`: its
// value, or null when the run is not one (an unbalanced parenthesis).
export function matchDestination(text) {
  return g.match(text, 'dest').succeeded() ? unescapeDest(text) : null
}

// Is `text` exactly one image, inline or reference form (PART 9 SS4 host)?
export function isImageSource(text) {
  return g.match(text, 'image').succeeded() || g.match(text, 'imageRef').succeeded()
}

export function checkUrl(url) {
  const probe = url.replace(/[\x00-\x20\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]+/g, '')
  const m = /^([a-zA-Z][a-zA-Z0-9+.-]*):/.exec(probe)
  if (m && DENY.has(m[1].toLowerCase())) return ''
  return url
}

// ---------------------------------------------------------------------------
// Inline semantics
function codeText(content) {
  let text = content.sourceString
  if (/^ .* $/.test(text) && trimWs(text) !== '') text = text.slice(1, -1)
  return text
}
function codeOp(_o, content, _c) {
  return `<code>${escapeHtml(codeText(content))}</code>`
}
// The matched span under a `code` node: a closed `codeRun`, or `codeU`.
const codeInner = (code) => {
  const n = code.child(0)
  return n.ctorName === 'codeClosed' ? n.child(0) : n
}

// attribute block -> ordered list of [kind, name, value]
function attrsOf(node) {
  if (node.numChildren === 0) return []
  return node.child(0).parseAttrs()
}

const attrSem = g.createSemantics().addOperation('parseAttrs', {
  attrs(_o, _s1, first, _s2, rest, _s3, _c) {
    return [first.parseAttrs(), ...rest.children.map((c) => c.parseAttrs())]
  },
  attrRun(blocks) {
    return blocks.children.flatMap((b) => b.parseAttrs())
  },
  // Same shape, different separator: `blockAttrs` admits a newline because a
  // standalone attribute LINE may span lines (`block_attributes` in
  // grammar.ebnf), and `attrs` above may not.
  blockAttrs(_o, _s1, first, _s2, rest, _s3, _c) {
    return [first.parseAttrs(), ...rest.children.map((c) => c.parseAttrs())]
  },
  attrItem(item) {
    return item.parseAttrs()
  },
  idAttr(_h, id) {
    return ['id', id.sourceString]
  },
  classAttr(_d, cls) {
    return ['class', cls.sourceString]
  },
  kvAttr(k, _eq, v) {
    return ['kv', k.sourceString, v.parseAttrs()]
  },
  boolAttr(name) {
    return ['bool', name.sourceString]
  },
  // `{:TAG}` DESUGARS HERE and nowhere else: it leaves this action as the
  // ordinary `['kv', 'lang', TAG]` tuple every other `lang=` attribute
  // produces, so the merge below cannot tell the two spellings apart. The
  // empty form `{:}` carries an empty tag and becomes `lang=""`, which is a
  // declaration that the language is unknown rather than an omission - the
  // content stops inheriting a surrounding language.
  langAttr(_c, tag) {
    return ['kv', 'lang', tag.sourceString]
  },
  attrVal(v) {
    return v.parseAttrs()
  },
  quoted(_o, chars, _c) {
    return chars.children.map((c) => c.sourceString.replace(/^\\/, '')).join('')
  },
  // The grammar has allowed `attrVal = quoted | squoted | bareVal` all along,
  // but no marker attribute ever reached here with a single-quoted value: the
  // list-marker regex stopped at the first `}`, so `{title='a}b'}` never
  // parsed. With that fixed the missing action turns into a thrown
  // missingSemanticAction rather than a wrong answer, which is the good
  // failure mode - but it still has to exist.
  squoted(_o, chars, _c) {
    return chars.children.map((c) => c.sourceString.replace(/^\\/, '')).join('')
  },
  bareVal(chars) {
    return chars.sourceString
  },
  _terminal() {
    return this.sourceString
  },
})

/*
 * PART 9 SS25: the four attributes whose value is a LIST of URLs a consumer
 * resolves or fetches. The probe runs on every token AS WELL AS on the whole
 * value, and any hit blanks the WHOLE value, so the same value cannot get one
 * answer in position one and another in position two (carve#1320).
 *
 * THE TOKEN PASS IS ADDITIVE. Dropping the value-wide probe for these four
 * would deny LESS than the leading-scheme rule already denied, because that
 * probe strips the ASCII whitespace the SPLIT breaks on: `java script:alert(1)`
 * is two harmless tokens and one denied value (carve#1329).
 *
 * THE SEPARATORS ARE THE ONES THE ATTRIBUTE'S OWN GRAMMAR USES. `ping` and
 * `attributionsrc` are space-separated sets and hold no commas at all, so
 * splitting them on commas would blank a lone URL that merely contains one.
 * `srcset`/`imagesrcset` are comma-separated candidates, and the comma must
 * count: without it `safe.png 1x,javascript:alert(1) 2x` reads as one token
 * per whitespace run and the second candidate is missed for want of a space.
 *
 * ASCII whitespace and not `\s`, because that is where the grammars put
 * their boundaries: `a<U+202F>javascript:x` is ONE token to the consumer and
 * resolves as a relative URL.
 */
const ASCII_WS = '\\t\\n\\f\\r '
const URL_LIST_SEPARATORS = {
  srcset: new RegExp(`[,${ASCII_WS}]+`),
  imagesrcset: new RegExp(`[,${ASCII_WS}]+`),
  ping: new RegExp(`[${ASCII_WS}]+`),
  attributionsrc: new RegExp(`[${ASCII_WS}]+`),
}
const urlListIsClean = (separator, value) =>
  value.split(separator).every((token) => token === '' || checkUrl(token) !== '')

// PART 9 SS25 ATTRIBUTE HARDENING: drop on*/srcdoc/formaction; drop an
// href/src override whose scheme is denylisted; blank any value whose own
// leading scheme is denylisted, and a URL-list value with a denylisted scheme
// in ANY candidate as well; blank a style value with a CSS execution vector.
const STYLE_VECTOR = /expression\(|url\(|@import|behavior:|-moz-binding/i
function hardenAttr(name, value) {
  const n = name.toLowerCase()
  if (n.startsWith('on') || n === 'srcdoc' || n === 'formaction') return null
  if ((n === 'href' || n === 'src') && checkUrl(value) === '') return null
  if (value !== '' && checkUrl(value) === '') return { name, value: '' }
  const separator = Object.hasOwn(URL_LIST_SEPARATORS, n) ? URL_LIST_SEPARATORS[n] : null
  if (separator && !urlListIsClean(separator, value)) return { name, value: '' }
  if (n === 'style' && STYLE_VECTOR.test(value.replace(/\s+/g, ''))) return { name, value: '' }
  return { name, value }
}

// Exported for PART 9R R1: a reference link with no definition attributes takes
// this inline path, where a repeated class inside ONE block deduplicates. Only
// the cross-list merge (renderBlockAttrs) accumulates (carve#604).
/*
 * The PART 9R reference frame: `U+E000 ref: <json> U+E001`.
 *
 * The payload must not carry the frame characters RAW. The resolution pass
 * ends a frame at the first `}` that a U+E001 follows, and link text can put
 * one inside the payload - a crossref whose id ends in `}`, an inline note, a
 * nested image reference. The scan then ended the frame early and the raw
 * JSON reached the reader (markup-carve/carve#1195). JSON's own \uXXXX escapes
 * survive JSON.parse unchanged, so spelling those two characters that way
 * costs the consumer nothing and makes the frame unambiguous.
 *
 * U+0002 needs no help here: JSON.stringify already escapes it as a control
 * character. That is exactly why the footnote pass could not see a noteref
 * sitting in a payload, and why PART 9R resolves references FIRST - see the
 * pass order in html.mjs.
 */
export const REF_FRAME = /\uE000ref:(\{[^\uE000\uE001]*?\})\uE001/g

export function refFrame(payload) {
  const json = JSON.stringify(payload).replace(
    /[\uE000\uE001]/g,
    (c) => '\\u' + c.charCodeAt(0).toString(16),
  )
  return `\uE000ref:${json}\uE001`
}

/*
 * The PART 9R note frame: `U+E000 note: <json> U+E001`.
 *
 * An inline note used to carry a RAW frame - the rendered content, then U+0002,
 * then the rendered attributes - so nothing that renders as a frame of its own
 * could sit inside one. The pass reading the note frame would have ended it at
 * the inner frame's terminator, so this file refused the whole class rather
 * than emit a mis-framed note (markup-carve/carve#1199).
 *
 * The payload is a JSON object for the same reason the reference frame's is,
 * and that is a CHOICE rather than a reuse: the reference frame already had a
 * JSON payload and needed only its escapes fixed, while a note frame has to be
 * given an encoding. Keeping it raw means a second, bespoke escape vocabulary
 * for U+E000, U+E001 and U+0002, with its own unescape at every consumer. JSON
 * escapes U+0002 as a control character on its own, spelling the other two as
 * `\uXXXX` costs the consumer nothing because `JSON.parse` decodes them, and
 * the separator field disappears rather than needing to be protected. One
 * encoding in the pipeline instead of two.
 */
export const NOTE_FRAME = /\uE000note:(\{[^\uE000\uE001]*?\})\uE001/g

export function noteFrame(payload) {
  const json = JSON.stringify(payload).replace(
    /[\uE000\uE001]/g,
    (c) => '\\u' + c.charCodeAt(0).toString(16),
  )
  return `\uE000note:${json}\uE001`
}

/*
 * BOTH PART 9R R2 FRAMES, IN ONE PATTERN.
 *
 * The note frame above, or a labeled reference: `fn:` then the label, the
 * U+0002 separator, then the rendered attributes.
 *
 * R2 numbers both forms from ONE shared document-order counter, so the pass
 * that numbers them has to meet them in the order the document writes them.
 * A single left-to-right `replace` does that; two consecutive ones number by
 * FORM instead, which is what gave an inline note a number ahead of an
 * earlier labeled use (markup-carve/carve#1562).
 *
 * The NOTE branch leads, so a frame-shaped run inside a note's JSON payload is
 * consumed together with the note that carries it - the one property the old
 * note-pass-first ordering was really providing. `json === undefined` tells
 * the consumer which branch matched.
 *
 * Each branch is the pattern its own consumer already used, unchanged. The
 * reference branch is spelled here rather than at the use site so the two
 * frames are declared together, beside the functions that write them, and
 * the note branch is BUILT from `NOTE_FRAME` rather than respelled - two
 * copies of that pattern would be free to drift, and the one nothing reads
 * directly would be the copy that rots.
 */
export const FOOTNOTE_FRAMES = new RegExp(
  `${NOTE_FRAME.source}|\\uE000fn:([\\s\\S]*?)\\u0002(.*?)\\uE001`,
  'g',
)

export function renderAttrs(list) {
  // serialization: SOURCE order; all classes merge (deduplicated, corpus
  // 121) into one class attribute at the position of the FIRST class;
  // a repeated id/key keeps the LAST value at its first position
  const parts = []
  const classes = []
  let classAt = -1
  const seen = new Map() // name -> index in parts
  for (const a of list) {
    if (a[0] === 'class') {
      if (classAt === -1) {
        classAt = parts.length
        parts.push(null) // placeholder
      }
      if (!classes.includes(a[1])) classes.push(a[1])
    } else if (a[0] === 'id') {
      if (seen.has('#id')) parts[seen.get('#id')] = ` id="${escapeAttr(a[1])}"`
      else {
        seen.set('#id', parts.length)
        parts.push(` id="${escapeAttr(a[1])}"`)
      }
    } else if (a[0] === 'kv') {
      const h = hardenAttr(a[1], a[2])
      if (!h) continue
      if (seen.has(a[1])) parts[seen.get(a[1])] = ` ${a[1]}="${escapeAttr(h.value)}"`
      else {
        seen.set(a[1], parts.length)
        parts.push(` ${a[1]}="${escapeAttr(h.value)}"`)
      }
    } else {
      // A BOOLEAN IS A KEY/VALUE WHOSE VALUE IS EMPTY, so it takes the same
      // slot as `kv` of the same name rather than emitting a second attribute.
      // PART 4 defines `{disabled}` as `disabled=""`, and RENDER ORDER says a
      // repeated key keeps the LAST value at its FIRST position - pushing here
      // unconditionally produced `a="1" a=""`, which is not valid HTML and is
      // not what any engine writes (carve#1123).
      if (!hardenAttr(a[1], '')) continue
      if (seen.has(a[1])) parts[seen.get(a[1])] = ` ${a[1]}=""`
      else {
        seen.set(a[1], parts.length)
        parts.push(` ${a[1]}=""`)
      }
    }
  }
  if (classAt !== -1) parts[classAt] = ` class="${escapeAttr(classes.join(' '))}"`
  return parts.join('')
}

// PART 10 §10: compact semantic-span attributes are an HTML rendering sugar
// over the ordinary `span` node.  Keep PHP's established relative order and
// outer span for non-semantic attributes; the authored attribute list remains
// untouched in the AST and source targets.
// PART 9 §9: three names are core - the two that carry data plus `kbd`. The
// other four are the Tier-2 SemanticSpan extension's (§10), and the oracle
// renders the CORE, so they stay ordinary attributes here.
const SEMANTIC_SPAN_ORDER = ['abbr', 'time', 'kbd']
function renderSemanticSpan(text, list) {
  const semantic = new Map()
  const rest = []
  for (const attr of list) {
    const name = attr[0] === 'bool' || attr[0] === 'kv' ? attr[1] : null
    if (name && SEMANTIC_SPAN_ORDER.includes(name)) semantic.set(name, attr[0] === 'kv' ? attr[2] : '')
    else rest.push(attr)
  }
  if (semantic.size === 0) return `<span${renderAttrs(list)}>${text}</span>`

  let html = text
  const outermost = [...SEMANTIC_SPAN_ORDER].reverse().find((name) => semantic.has(name))
  const MAPS_TO = { abbr: 'title', time: 'datetime' }
  for (const name of SEMANTIC_SPAN_ORDER) {
    if (!semantic.has(name)) continue
    const value = semantic.get(name)
    // The mapped attribute is an ordinary key/value in the SAME SLOT an author
    // could have written, so it goes through renderAttrs with the rest rather
    // than being concatenated beside it. Emitting both produced
    // `<abbr title="x" title="y">` for `[x]{abbr="x" title="y"}`; as one list
    // the repeated-key rule decides it - last value, first position - which is
    // what a repeated key does everywhere else in the language.
    const mapped = value !== '' && MAPS_TO[name] ? [['kv', MAPS_TO[name], value]] : []
    // PART 9 §9: leftovers RIDE the outermost semantic element. The span is
    // renamed rather than wrapped, so an authored id or class lands on the
    // element the author wrote it on.
    const own = name === outermost ? [...mapped, ...rest] : mapped
    html = `<${name}${renderAttrs(own)}>${html}</${name}>`
  }
  return html
}

// unclosed run: verbatim to where the run ends, trailing whitespace stripped,
// NO single-space strip
// The strip is PART 2's `whitespace` - a space or a tab - plus the newlines
// the run crossed on its way to the end of the block. `\s` is wider than
// the rule: it holds the no-break space, which every other clause calls
// CONTENT, so a run ending in one silently lost it. The same narrowing
// applies at the math and literal bodies, which share this extraction.
function unclosedCode(content) {
  const trim = hardBreaks ? /[ \t]+$/ : /[ \t\n]+$/
  return `<code>${escapeHtml(content.sourceString.replace(trim, ''))}</code>`
}

const sem = g.createSemantics().addOperation('h', {
  inlines(items) {
    // The bare single-char emphasis delimiters are NOT resolved by the PEG.
    // Build a flat token stream (leaf HTML fragments + bare-delimiter
    // candidates) and run the PART 9 SS9 delimiter-stack pass over it.
    return resolveEmphasis(
      () => buildToks(items.children),
      this.source.sourceString,
      '',
      this.source.startIdx,
    )
  },
  boldItalic(_o, inner, _c, attrs) {
    const a = renderAttrs(attrsOf(attrs))
    // The combined token owns BOTH `/` and `*`, so §9 E3 holds both literal
    // inside it while the other three delimiters resolve normally.
    const body = resolveEmphasis(
      () => buildToks(inner.children, '/*'),
      this.source.sourceString,
      '/*',
      inner.source.startIdx,
    )
    return `<strong${a}><em>${body}</em></strong>`
  },
  codeClosed(run) {
    return run.h()
  },
  codeRun: codeOp,
  codeU(_o, _r, content) {
    return unclosedCode(content)
  },
  fCodeU(_o, _r, content) {
    return unclosedCode(content)
  },
  fPrefixU(prefix, run) {
    const p = prefix.sourceString
    const body = escapeHtml(run.child(2).sourceString.replace(hardBreaks ? /[ \t]+$/ : /[ \t\n]+$/, ''))
    if (p === '!') return body
    const [o, c, kind] = p === '$' ? ['\\(', '\\)', 'inline'] : ['\\[', '\\]', 'display']
    return `<span class="math ${kind}" role="math">${o}${body}${c}</span>`
  },
  nl(_n) {
    // A SOFT BREAK, and the only place one is visible AS a break. A newline
    // inside a code span, a math run, a literal or a raw passthrough never
    // reaches here - it is part of that node's own source - which is exactly
    // the distinction a line block needs (markup-carve/carve#1282).
    return hardBreaks ? '<br>\n' : '\n'
  },
  codeA(alt) {
    return alt.h()
  },
  codeAttrd(code, attrs) {
    const a = renderAttrs(attrsOf(attrs))
    if (a === '') return code.h()
    return code.h().replace('<code>', `<code${a}>`)
  },
  mathI(_d, code, attrs) {
    // `code` is the alternation node; its sole child is codeN(_o,content,_c)
    return mathSpan('inline', code, attrs)
  },
  mathD(_d, code, attrs) {
    return mathSpan('display', code, attrs)
  },
  crossref(_o, id, _c) {
    return `xref:${id.sourceString}`
  },
  footnoteRef(_o, label, _c, attrs) {
    if (noFootnotes) {
      // SS16: recognition is DISABLED inside a note, EITHER DIRECTION - so
      // `[^1]` there is not a reference. What is left is an ordinary bracketed
      // run over the content `^1`, which is literal with no tail and a
      // semantic span with an attribute one. Rebuilt here rather than
      // re-parsed: the source spells `[^`, so re-parsing would match this rule
      // again and never terminate.
      const literal = renderInline('^' + label.sourceString, '[')
      if (attrs.numChildren === 0) return `[${literal}]`
      return renderSemanticSpan(literal, attrsOf(attrs))
    }
    const a = renderAttrs(attrsOf(attrs))
    return `fn:${label.sourceString}\u0002${a}`
  },
  inlineNote(_o, content, _c, attrs) {
    if (noFootnotes) {
      // Same clause, the other direction: `^[` inside a note opens nothing, so
      // the `^` is text and the rest is an ordinary bracketed run. Dropping the
      // `^` from the source is what makes the re-parse terminate.
      return '^' + renderInline(this.sourceString.slice(1), '^')
    }
    // anonymous note: content renders now; numbering happens in PART 9R.
    // SS16 DISABLES footnote recognition inside the content, in both
    // directions, so a nested `^[...]` or `[^ref]` renders as its own literal
    // spelling rather than a note - the flag carries that down the whole
    // subtree, since re-enabling it one level in would make `^[a ^[b ^[c] d] e]`
    // find a note at depth two (markup-carve/carve#1188).
    const saved = noFootnotes
    noFootnotes = true
    let inner
    try {
      inner = renderInline(content.sourceString, '[')
    } finally {
      noFootnotes = saved
    }
    // A crossref, a reference link or a reference image renders as a frame of
    // its own and reaches here unresolved, because PART 9R resolves them in a
    // later pass. `noteFrame` spells the frame characters as JSON escapes, so
    // an inner frame cannot end this one early, and the content survives to
    // the pass that resolves it (markup-carve/carve#1199).
    const a = renderAttrs(attrsOf(attrs))
    return noteFrame({ content: inner, attrs: a })
  },
  bracketed(_o, content, _c, tail) {
    // link text is FULL inline content; parse the raw source recursively
    const raw = content.sourceString
    let inner = raw === '' ? '' : renderInline(raw, '[')
    if (tail.numChildren === 0) {
      // bare bracketed run: literal (PART 9 SS14), content still parsed
      return `[${inner}]`
    }
    // links never nest (PART 3): an inner link/autolink is replaced by its
    // own text content; an inner crossref flattens to its resolved TEXT
    inner = inner.replace(/<a [^>]*>([\s\S]*?)<\/a>/g, '$1')
    inner = inner.replaceAll('\uE000xref:', '\uE000xreftext:')
    // A REFERENCE link is still a frame at this point, not an `<a>`, so the
    // unwrap above cannot see it: it has to be flattened by reading the
    // payload's own text. Without this the inner reference resolved after the
    // outer one and nested an `<a>` inside an `<a>`, which no engine emits
    // (markup-carve/carve#1195). An image reference is not a link, so it
    // stays - `<a><img></a>` is what the engines render for that one.
    inner = inner.replace(REF_FRAME, (m, json) => {
      let parsed
      try {
        parsed = JSON.parse(json)
      } catch {
        return m
      }
      return parsed.img ? m : parsed.text
    })
    return tail.child(0).applyTail(inner, raw)
  },
  image(_b, _o, alt, _c, _p, dest, title, _cp, attrs) {
    const t = title.numChildren ? ` title="${escapeAttr(title.child(0).titleText())}"` : ''
    const a = renderAttrs(attrsOf(attrs))
    return `<img src="${escapeAttr(checkUrl(destValue(dest)))}" alt="${escapeAttr(alt.sourceString)}"${t}${a}>`
  },
  imageRef(_b, _o, alt, _c, _ro, label, _rc, attrs) {
    // Same sentinel as a reference LINK, flagged so resolution emits an
    // <img>. The label resolves against the same linkDefs entry and takes
    // url, title and attrs from it (PART 9R R1).
    const lbl = label.numChildren ? label.child(0).sourceString : null
    return refFrame({ label: lbl, alt: alt.sourceString, img: true, attrList: attrsOf(attrs), attrSrc: attrs.sourceString })
  },
  autolink(_o, body, _c, attrs) {
    const raw = body.sourceString
    const href = /@/.test(raw) && !/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(raw) ? `mailto:${raw}` : raw
    const a = renderAttrs(attrsOf(attrs))
    return `<a href="${escapeAttr(checkUrl(href))}"${a}>${escapeHtml(raw)}</a>`
  },
  escape(_bs, ch) {
    // An escaped quote renders straight, so the quote after it closes (PART 3).
    if (QUOTE_CHARS.has(ch.sourceString)) lastQuoteGlyph = ch.sourceString
    return escapeHtml(ch.sourceString)
  },
  nbspEsc(_bs, _sp) {
    return '&nbsp;'
  },
  hardBreak(_bs, _tail) {
    // The rule CONSUMES the newline (PART 3), so this emits it: one line
    // boundary, one break, whether the boundary was spelled with a backslash
    // or not. In a line block that is the whole of PART 9 SS23's A '\\'
    // BREAK IS NOT ADDITIVE - there is no soft break left for the container
    // to harden, so nothing synthesizes a second `<br>`.
    //
    // The newline is emitted even where the rule matched `&end` and there was
    // no newline to consume. PART 10 SS3 states the serialization without a
    // condition on it - "a hard break serializes as `<br>` + newline" - and all
    // three engines write it that way, on a document-final `a\` as much as on
    // one inside a stanza. Making it conditional on the SOURCE made the only
    // shape where the two readings differ - a hard break with nothing after it
    // - the one shape the oracle got wrong, which is where the last body line
    // of a line block lives (PART 11 SS7c).
    return '<br>\n'
  },
  shortcode(_c1, name, _c2) {
    // No symbol map in Core: the literal `:name:` fallback. Consuming it as one
    // token is what keeps smart typography out of the name (`:+-:` stays the
    // symbol `+-`, it does not become `:±:`).
    if (omitSymbols) return ''
    return `:${escapeHtml(name.sourceString)}:`
  },
  symbolAttr(_c1, name, _c2, attrs) {
    // `:name:{...}`: an UNMAPPED symbol renders as its literal `:name:` text,
    // wrapped in a <span> that carries the attribute block (PART 9 §7).
    if (omitSymbols) return ''
    return `<span${renderAttrs(attrs.parseAttrs())}>:${escapeHtml(name.sourceString)}:</span>`
  },
  mention(_a, name, glued) {
    return (
      `<span class="mention"><strong>@${escapeHtml(name.sourceString)}</strong></span>` +
      escapeHtml(glued.sourceString)
    )
  },
  tag(_h, name, glued) {
    return (
      `<span class="tag"><strong>#${escapeHtml(name.sourceString)}</strong></span>` +
      escapeHtml(glued.sourceString)
    )
  },
  forcedSpan(f) {
    return f.h()
  },
  forced(_ob, d, inner, _d2, _cb, attrs) {
    const dch = d.sourceString
    const tag = { '/': 'em', '*': 'strong', _: 'u', '~': 's', '^': 'sup', ',': 'sub', '=': 'mark' }[dch]
    const a = renderAttrs(attrsOf(attrs))
    // A forced `{X ... X}` span emphasizes intraword; nested spans of OTHER
    // delimiters resolve normally, but the forced delimiter X itself stays
    // literal inside (PART 9 SS22). Run the same SS9 stack, holding X literal.
    const body = resolveEmphasis(
      () => buildToks(inner.children, dch),
      this.source.sourceString,
      dch,
      inner.source.startIdx,
    )
    return `<${tag}${a}>${body}</${tag}>`
  },
  edIns(_o, content, _c, attrs) {
    return `<ins${renderAttrs(attrsOf(attrs))}>${renderInline(content.sourceString, '{')}</ins>`
  },
  edDel(_o, content, _c, attrs) {
    return `<del${renderAttrs(attrsOf(attrs))}>${renderInline(content.sourceString, '{')}</del>`
  },
  edSub(_o, oldC, _ar, newC, _c) {
    return `<del>${renderInline(oldC.sourceString, '{')}</del><ins>${renderInline(newC.sourceString, '{')}</ins>`
  },
  edComment(body) {
    // comment content is verbatim (spaces preserved)
    return `<span class="critic-comment">${escapeHtml(body.child(1).sourceString)}</span>`
  },
  rawInline(code, _ob, fmt, _cb) {
    // PART 9 SS20: emitted UNESCAPED for the html format, dropped otherwise
    const text = codeText(codeInner(code).child(1))
    return fmt.sourceString === 'html' ? text : ''
  },
  litInline(span, attrs) {
    const code = span.child(1)
    // PART 9 §27: "!" prefix on a verbatim code span. Content is HTML-ESCAPED,
    // emitted by every renderer and never dropped, with the <code> wrapper
    // removed. Bare text when no attribute block is present; a <span> carrying
    // the attributes when one is. Body extraction mirrors mathSpan (codeU
    // carries its content in a different child slot).
    const inner = codeInner(code)
    const body = escapeHtml(
      inner.ctorName === 'codeU'
        ? inner.child(2).sourceString.replace(hardBreaks ? /[ \t]+$/ : /[ \t\n]+$/, '')
        : codeText(inner.child(1)),
    )
    const a = renderAttrs(attrsOf(attrs))
    return a === '' ? body : `<span${a}>${body}</span>`
  },
  extension(_c, name, _o, content, _cl, attrs) {
    const n = name.sourceString
    const inner = renderInline(content.sourceString, '[')
    // PART 10 §9: the fixed semantic registry renders its own element (attrs
    // apply to it); everything else is the generic ext-<name> span.
    // PART 9 §10: the `:name[…]` spelling has NO core handler at all. It is a
    // soft-deprecated compatibility form the SemanticSpan extension accepts,
    // so the core - which is what this oracle renders - gives every name the
    // generic fallback.
    const semantic = new Set()
    if (semantic.has(n)) {
      return `<${n}${renderAttrs(attrsOf(attrs))}>${inner}</${n}>`
    }
    // The base class is a CLASS, not a prefix: it joins the author's class
    // slot rather than being written ahead of everything. Splitting it out and
    // emitting `class="..."` first reordered the author's attributes, so
    // `:widget[x]{#i .c}` lost the id-before-class order PART 10 §1 requires
    // (carve#1164). renderAttrs already merges every class into the FIRST
    // class position, so inserting the base beside the author's first class
    // puts it exactly there; with no class of their own it leads.
    const list = attrsOf(attrs)
    const firstClass = list.findIndex((a) => a[0] === 'class')
    const merged = firstClass === -1
      ? [['class', `ext-${n}`], ...list]
      : [...list.slice(0, firstClass), ['class', `ext-${n}`], ...list.slice(firstClass)]
    return `<span${renderAttrs(merged)}>${inner}</span>`
  },
  spComment(_sp, _pp, _rest) {
    return ''
  },
  bracedComment(_open, _content, _close) {
    return ''
  },
  arrow(tok) {
    // carve#1442: doubled runs are canonical in both families; the single
    // forms are deprecated but still render; `=>` is removed.
    return {
      '<-->': '\u2194', '-->': '\u2192', '<--': '\u2190',
      '<=>': '\u21d4', '==>': '\u21d2', '<==': '\u21d0',
      '<->': '\u2194', '->': '\u2192', '<-': '\u2190',
      '!=': '\u2260', '<=': '\u2264', '>=': '\u2265', '+-': '\u00b1',
    }[tok.sourceString]
  },
  symbol(tok) {
    return { '(c)': '\u00a9', '(r)': '\u00ae', '(tm)': '\u2122' }[tok.sourceString]
  },
  ellipsis(_e) {
    return '\u2026'
  },
  bracedDash(_d) {
    // A BRACED HYPHEN PAIR IS AN EN DASH, NOT AN EMPTY DELETION (carve#1447).
    // The bare run carries a flanking guard, so `x --verbose y` is literal and
    // an author who MEANT a dash in that position had no way to say so. `{--}`
    // is that way, and it costs nothing: the string it took was an empty
    // `<del></del>`, which deletes nothing and no author writes.
    return '\u2013'
  },
  dashRun(_a, _b) {
    // PART 9 SS8, carve#1443: a run PRECEDED by whitespace (or nothing) and
    // FOLLOWED by a non-whitespace character is a flag, not a dash, and stays
    // literal. `git log --oneline` rendered `git log –oneline` before this.
    //
    // Only that one shape is excluded, and the narrowness is load-bearing:
    // `a---- b` is word-then-space and DOES convert (corpus
    // 19-smart-typography-dashes-and-quotes-7 pins it), as does a trailing
    // dash on an interrupted clause. Requiring matching sides would have
    // broken both.
    //
    // The space class is PART 7's, NOT the host language's `\s`: a VERTICAL TAB
    // and a FORM FEED are CONTENT in Carve, so `---<VT>` has to answer the way
    // `---!` answers. A NO-BREAK SPACE is included because the question here is
    // "does a space stand before this run", which is the same question quote
    // flanking asks, and a nbsp is a space to the reader.
    {
      const src = this.source.sourceString
      const at = this.source.startIdx
      const end = this.source.endIdx
      const prev = at > 0 ? src[at - 1] : ''
      const next = src[end] ?? ''
      const prevIsSpace = prev === '' || FLANK_SPACE.test(prev)
      const nextIsSpace = next === '' || FLANK_SPACE.test(next)
      if (prevIsSpace && !nextIsSpace) return escapeHtml(this.sourceString)
    }
    // PART 9 SS8: a run of n hyphens -> em/en dash mix (djot allocateDashes):
    // n%3==0 all em; n%2==0 all en; else maximize em-dashes with the remainder
    // as en, where a remainder of 1 trades one em-dash for two en-dashes. Must
    // match carve-js / carve-php exactly (e.g. n=11 -> 3 em + 1 en, not 1 em).
    const n = this.sourceString.length
    if (n % 3 === 0) return '\u2014'.repeat(n / 3)
    if (n % 2 === 0) return '\u2013'.repeat(n / 2)
    let em = Math.floor(n / 3)
    let rem = n - em * 3
    if (rem === 1) {
      em -= 1
      rem = 4
    }
    return '\u2014'.repeat(em) + '\u2013'.repeat(rem / 2)
  },
  dquote(_q) {
    return smartQuote(this, '\u201c', '\u201d', false)
  },
  squote(_q) {
    return smartQuote(this, '\u2018', '\u2019', true)
  },
  hash(_h) {
    return '#'
  },
  looseAttrs(blocks) {
    // The BRACES are literal, their CONTENTS are inline content. A brace run
    // that attaches to nothing is text (SS15 A7, PART 2 headings), and the
    // text inside it goes on being text - so a `#word` in there is a tag
    // (SS19), which is what all three engines emit. Escaping the whole run
    // rendered `{#id .cls}` verbatim and lost the tag. Block by block, because
    // one interior spanning a run would read the `}{` between two blocks as
    // content (carve#2136).
    return blocks.children
      .map((b) => '{' + renderInline(b.sourceString.slice(1, -1)) + '}')
      .join('')
  },
  word(first, rest) {
    return escapeHtml(this.sourceString)
  },
  _terminal() {
    return escapeHtml(this.sourceString)
  },
  _nonterminal(...ch) {
    return ch.map((c) => c.h()).join('')
  },
  _iter(...ch) {
    return ch.map((c) => c.h()).join('')
  },
})

// tails need the already-rendered link text
sem.addOperation('applyTail(text, source)', {
  linkTail(_o, dest, title, _c, attrs) {
    const { text } = this.args
    // A footnote in link text is a §16 LIMITATION, not an unrenderable
    // document: the clause states the outcome ("nests an <a> in an <a>") and
    // advises against writing it. The noteref sentinel travels inside the link
    // text and PART 9R resolves it in place, which is what the reference
    // engines do - and what this pipeline already did for the INLINE note form,
    // whose sentinel this check never named (markup-carve/carve#1188).
    const t = title.numChildren ? ` title="${escapeAttr(title.child(0).titleText())}"` : ''
    const a = renderAttrs(attrsOf(attrs))
    return `<a href="${escapeAttr(checkUrl(destValue(dest)))}"${t}${a}>${text}</a>`
  },
  refTail(_o, label, _c, attrs) {
    const { text, source } = this.args
    // A footnote in reference link text is the SAME §16 limitation linkTail
    // renders: it nests an `<a>` in an `<a>`, which is what every engine
    // emits for it. It used to be refused here because the frame hid the
    // noteref from the footnote pass; the frame now carries it through
    // (markup-carve/carve#1195).
    const lbl = label.numChildren ? label.child(0).sourceString : null
    // The RAW list travels, not the rendered string: a definition may carry
    // attributes too, and PART 9R R1 merges the two per SS15 A3 - which needs
    // both lists, not two finished strings (carve#604).
    // `source` is the bracket text AS WRITTEN. A collapsed reference is
    // matched by that, not by the rendered text: a decorated label defines a
    // decorated key, and keying on the rendered form both missed that
    // definition and matched a plain one the author never referenced.
    // carve-js and carve-rs key on the written label (carve#648).
    return refFrame({ label: lbl, text, source, attrList: attrsOf(attrs), attrSrc: attrs.sourceString })
  },
  attrs(_o, _s1, _first, _s2, _rest, _s3, _c) {
    const { text } = this.args
    return renderSemanticSpan(text, this.parseAttrs())
  },
  attrRun(_blocks) {
    const { text } = this.args
    return renderSemanticSpan(text, this.parseAttrs())
  },
  emptyAttrs(_o, _sp, _c) {
    const { text } = this.args
    return `<span>${text}</span>`
  },
})

sem.addOperation('titleText', {
  destTitle(_sp, q) {
    return q.titleText()
  },
  quoted(_o, chars, _c) {
    return chars.children.map((c) => c.sourceString.replace(/^\\/, '')).join('')
  },
  squoted(_o, chars, _c) {
    return chars.children.map((c) => c.sourceString.replace(/^\\/, '')).join('')
  },
})
sem.addOperation('parseAttrs', {
  attrs(_o, _s1, first, _s2, rest, _s3, _c) {
    return [first.parseAttrs(), ...rest.children.map((c) => c.parseAttrs())]
  },
  // A GLUED RUN IS ONE LIST (CARVE-P4-002, carve#2136). Concatenating in source
  // order is enough: renderAttrs over the flat list is SS15 A3 - classes
  // accumulate and deduplicate at the first class's position, an id or key
  // keeps its last value at its first position - so no second merge is needed.
  attrRun(blocks) {
    return blocks.children.flatMap((b) => b.parseAttrs())
  },
  looseAttrs(blocks) {
    return blocks.children.flatMap((b) => b.parseAttrs())
  },
  attrItem(item) {
    return item.parseAttrs()
  },
  idAttr(_h, id) {
    return ['id', id.sourceString]
  },
  classAttr(_d, cls) {
    return ['class', cls.sourceString]
  },
  kvAttr(k, _eq, v) {
    return ['kv', k.sourceString, v.parseAttrs()]
  },
  boolAttr(name) {
    return ['bool', name.sourceString]
  },
  // The same desugaring as the `attrSem` copy above. Both operations walk the
  // same `attrItem` rule, so a shorthand handled in one and missing from the
  // other throws `missingSemanticAction` on whichever path reaches it second.
  langAttr(_c, tag) {
    return ['kv', 'lang', tag.sourceString]
  },
  attrVal(v) {
    return v.parseAttrs()
  },
  quoted(_o, chars, _c) {
    return chars.children.map((c) => c.parseAttrs()).join('')
  },
  squoted(_o, chars, _c) {
    return chars.children.map((c) => c.sourceString.replace(/^\\/, '')).join('')
  },
  qChar(c) {
    return c.parseAttrs()
  },
  qEsc(_bs, q) {
    return '"'
  },
  bareVal(chars) {
    return chars.sourceString
  },
  _terminal() {
    return this.sourceString
  },
  _iter(...ch) {
    return ch.map((c) => c.parseAttrs()).join('')
  },
  _nonterminal(...ch) {
    if (ch.length === 1) return ch[0].parseAttrs()
    return ch.map((c) => c.parseAttrs()).join('')
  },
})

// --- PART 9 SS9 E1-E5 delimiter-stack resolver -----------------------------
// grammar.ebnf PART 9 SS9 specifies emphasis resolution as ONE left-to-right
// pass over the inline stream with a delimiter stack -- O(n), NO backtracking.
// This REPLACES the former backtracking PEG span rules (which re-searched the
// tail for a closer at every opener -> O(n^2) on a run of unclosed openers).
// The Ohm grammar now tokenizes bare `/ * _ ~ =` into `litDelim` candidate
// tokens; this resolver pairs them into spans.
const STACK_DELIMS = new Set(['/', '*', '_', '~', '='])
const TAG = { '/': 'em', '*': 'strong', _: 'u', '~': 's', '=': 'mark' }
// `alnum` in the guard templates below is the grammar header's `letter |
// digit` over PART 7's enumerated ASCII alphabet, so `é` is punctuation to
// these guards: `café*bold*` opens a strong span and `y *x*é` closes one, as
// all three engines read them (carve#2126).
const isAlnum = (c) => c !== undefined && /[A-Za-z0-9]/.test(c)
const isWs = (c) => c === undefined || c === ' ' || c === '\t' || c === '\n' || c === '\r'

// The formal word-boundary guard templates (grammar.ebnf PART 3):
//   bare_opener(d) = <!(alnum | '_' | d | slash_if(d)), d, !(ws | d)
//   bare_closer(d) = <&(non_ws), d, !(alnum)
// END counts as whitespace (a run may not open at end of block); a following
// same delimiter is allowed for a closer (`/x//` -> the first `/` after x
// closes; the trailing `/` stays literal).
// The `'_'` term is the template's own, so it blocks EVERY delimiter, while
// slash_if(d) = '/' for d in { '/', '_' } blocks only italic and underline --
// `* ~ =` do open after `/` (`a/~y~` -> `a/<s>y</s>`).
function bareOpener(d, prev, next) {
  if (prev !== undefined && (isAlnum(prev) || prev === d)) return false
  return !isWs(next) && next !== d
}
// A `_` (or a `/` before `/` or `_`) blocks the opener after it unless that
// guard opens a span that closes, which only pairing decides (`pairGuarded`).
function guardedBy(d, prev) {
  return prev === '_' || ((d === '/' || d === '_') && prev === '/')
}
function bareCloser(d, prev, next) {
  return prev !== undefined && !isWs(prev) && (next === undefined || !isAlnum(next))
}

// The `forced` node under an `inline` / `fInner` child, through the wrapper
// rules that carry no other meaning, or null where the child is not one.
function forcedUnder(alt) {
  let n = alt
  while (n.ctorName === 'rich' || n.ctorName === 'forcedSpan') n = n.child(0)
  return n.ctorName === 'forced' ? n : null
}

// E1 CLASSIFY for one candidate.
function classify(t, src, blocked) {
  if (t.k !== 'd') return
  const prev = t.at > 0 ? src[t.at - 1] : undefined
  const next = src[t.at + 1]
  t.canOpen = !t.closeOnly && !blocked?.has(t.at) && bareOpener(t.ch, prev, next)
  t.canClose = bareCloser(t.ch, prev, next)
}

// E3 refused this forced span's opener, so the span is its own characters:
// two delimiter candidates around the content it had, and a trailing
// attribute block that now attaches to whatever the closer closes.
function demoteForced(t, literalDelims = '') {
  const n = t.node
  // The enclosing span holds this delimiter literal, so the demoted
  // characters are content rather than candidates.
  const delim = (child) =>
    literalDelims.includes(t.ch)
      ? { k: 't', h: escapeHtml(t.ch) }
      : { k: 'd', ch: t.ch, at: child.source.startIdx }
  const out = [
    { k: 't', h: '{' },
    delim(n.child(1)),
    ...buildToks(n.child(2).children, literalDelims),
    delim(n.child(3)),
    { k: 't', h: '}' },
  ]
  const attrs = n.child(5)
  if (attrs.numChildren > 0) {
    const node = attrs.child(0)
    out.push({ k: 'attrs', node, at: node.source.startIdx, h: escapeHtml(node.sourceString) })
  }
  return out
}

// Build the flat token stream from a list of CST child nodes (inline* or
// fInner*). A bare `/ * _ ~ =` becomes a delimiter candidate; every other
// alternative renders to an HTML fragment now. `literalDelims` (the enclosing
// span's own delimiters, if any) are held literal rather than made candidates:
// one character for a forced span, both of `/*` for the combined token.
function buildToks(children, literalDelims = '') {
  const toks = []
  for (let ci = 0; ci < children.length; ci++) {
    const c = children[ci]
    const alt = c.child(0)
    const name = alt.ctorName
    // A forced span is a stack entry, not a leaf: E3 holds its opener literal
    // while a span of its kind is open, so the decision waits for the stack.
    const forcedNode = forcedUnder(alt)
    if (forcedNode && STACK_DELIMS.has(forcedNode.child(1).sourceString)) {
      toks.push({
        k: 'f',
        ch: forcedNode.child(1).sourceString,
        node: forcedNode,
        at: alt.source.startIdx,
      })
      continue
    }
    if (name === 'litDelim') {
      const ch = alt.child(0).sourceString
      // Only / * _ ~ = are stack candidates; ^ and , have no bare span.
      if (STACK_DELIMS.has(ch) && !literalDelims.includes(ch)) {
        toks.push({ k: 'd', ch, at: alt.source.startIdx })
      } else {
        toks.push({ k: 't', h: escapeHtml(ch) })
      }
      const loose = alt.child(1).children[0]
      if (loose) {
        // Attaches to the span this delimiter closes; otherwise its literal fallback.
        toks.push({ k: 'attrs', node: loose, at: loose.source.startIdx, h: loose.h() })
      }
      continue
    }
    // A construct carrying PART 9 §7's left-boundary condition keeps its
    // offset and its source: the condition is only decidable after the
    // delimiter stack has run (`applyMarkerBoundary`). Inside a span the
    // alternative arrives wrapped in `rich`, as `forcedUnder` also unwraps.
    let marker = alt
    while (marker.ctorName === 'rich') marker = marker.child(0)
    if (QUOTE_RULES.has(marker.ctorName)) {
      toks.push({ k: 't', h: c.h(), quote: { at: marker.source.startIdx, single: marker.ctorName === 'squote' } })
      continue
    }
    // An escaped quote renders straight and is what the next quote reads.
    if (marker.ctorName === 'escape' && QUOTE_CHARS.has(marker.child(1).sourceString)) {
      toks.push({ k: 't', h: c.h(), straight: marker.child(1).sourceString })
      continue
    }
    if (MARKER_RULES.has(marker.ctorName)) {
      const at = marker.source.startIdx
      const t = { k: 't', h: c.h(), at, raw: marker.sourceString, full: marker.sourceString }
      toks.push(t)
      if (NAME_RULES.has(marker.ctorName)) {
        // The name's own `_` characters, plus the one `tagChar` gave up so a
        // forced underline could close (`{_@ex_}`), reach the stack as
        // candidates; `resolveNameRun` decides which of them the name keeps.
        const next = children[ci + 1]?.child(0)
        const tail =
          next?.ctorName === 'litDelim' && next.child(0).sourceString === '_' ? next : undefined
        if (tail) ci++
        t.cuts = nameCuts(t, tail)
        for (const cut of t.cuts) {
          toks.push(cut)
          // The borrowed delimiter keeps its trailing attribute block, which
          // attaches to whatever it closes.
          const loose = cut.loose
          if (loose) toks.push({ k: 'attrs', node: loose, at: loose.source.startIdx, h: loose.h() })
          toks.push(cut.seg)
        }
      }
      continue
    }
    toks.push({ k: 't', h: c.h() })
  }
  return toks
}

// A name `_` is a CLOSER candidate and nothing else: the engines keep
// `@x-_y_` whole, where an opener there would split it.
function nameCuts(t, tail) {
  const cuts = []
  const push = (at, loose) => {
    const cut = { k: 'd', ch: '_', at, closeOnly: true, ofName: t, loose }
    cut.seg = { k: 't', h: '', ofName: t }
    cuts.push(cut)
  }
  for (let i = 1; i < t.raw.length; i++) {
    if (t.raw[i] === '_') push(t.at + i)
  }
  // `tagChar` gave this one up so a forced underline could close.
  if (tail) {
    t.full = t.raw + '_'
    push(tail.source.startIdx, tail.child(1).children[0])
  }
  for (let n = 0; n < cuts.length; n++) {
    const from = cuts[n].at - t.at + 1
    const to = n + 1 < cuts.length ? cuts[n + 1].at - t.at : t.full.length
    cuts[n].seg.text = t.full.slice(from, Math.max(from, to))
  }
  return cuts
}

// PART 9 §7's name run and §9's stack read the same character: `name_word`
// admits `_`, and `_` is the underline delimiter. The name ends at the first
// of its underscores that pairs; the rest of its source is ordinary content.
// A name that keeps every one of them renders as the grammar matched it.
function resolveNameRun(toks, openMap) {
  const closed = new Set(openMap.values())
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i]
    if (!t.cuts) continue
    let cut
    for (let j = i + 1; j < toks.length && toks[j].ofName === t; j++) {
      if (toks[j].k === 'd' && (openMap.has(j) || closed.has(j))) {
        cut = toks[j]
        break
      }
    }
    for (const c of t.cuts) {
      const kept = !cut || c.at < cut.at
      if (kept) {
        c.k = 't'
        c.h = ''
      }
      c.seg.h = kept ? '' : escapeHtml(c.seg.text)
    }
    const name = cut ? t.full.slice(0, cut.at - t.at) : t.full
    if (name === t.raw) continue
    t.raw = name
    t.h = name.length > 1 ? renderInline(name) : escapeHtml(name)
  }
}

// PART 9 §7: a mention, tag or symbol opens at the start of the content or
// after a character that is NOT a word character. Its word character is
// `[A-Za-z0-9_]`, which is `alnum` plus the one delimiter that is also a word
// character, so this is the only guard the `_` reaches.
const MARKER_RULES = new Set(['mention', 'tag', 'shortcode', 'symbolAttr'])
// The two whose name run is `name_word`, so the only two that can reach a `_`.
const NAME_RULES = new Set(['mention', 'tag'])
const isWordCh = (c) => c !== undefined && /[A-Za-z0-9_]/.test(c)

/*
 * A bare delimiter that PAIRED as an opener is markup, not content, so it is
 * not the character standing before the marker: `_@ex_` is an underlined
 * mention in all three engines while `a_@ex` and `_@ex` are literal text. Only
 * `pairDelims` knows which, so this cannot be a lookahead in the grammar.
 *
 * A suppressed construct is a NON-PARSE, not a literal token: the marker is
 * text and the rest goes back through the inline pass, so `a_:+-:` renders the
 * typographic `a_:±:` rather than the symbol name.
 */
function applyMarkerBoundary(toks, openMap, src, contentAt) {
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i]
    if (t.raw === undefined) continue
    let at = t.at
    for (let j = i - 1; j >= 0; j--) {
      const left = toks[j]
      if (left.k !== 'd' || left.at !== at - 1 || !openMap.has(j)) break
      at = left.at
    }
    // `contentAt` is where this span's content begins; §7's other opening
    // position. The delimiter that opened the span is markup, not a character
    // the marker stands behind.
    if (!isWordCh(at > contentAt ? src[at - 1] : undefined)) continue
    t.h = escapeHtml(t.raw[0]) + renderInline(t.raw.slice(1), t.raw[0])
  }
}

// Resolve a flat token stream (leaf HTML fragments interleaved with bare
// delimiter candidates) into rendered HTML. `toks` items are one of:
//   { k: 'd', ch, at }      a bare delimiter candidate (source index `at`)
//   { k: 'attrs', node, at, h }  a trailing `{...}` block (may attach to a span)
//   { k: 't', h }           an already-rendered leaf fragment
// Source offsets of attribute blocks that reached the render with nothing to
// attach to. renderInlineInner reads this after a pass and re-runs the text.
let unattachedAttrs = []

// E1-E5 over a token stream: which candidates pair, as `open index -> close
// index`. Split out because the caption `#` placeholder asks the same question
// the renderer does -- which offsets sit inside a span -- over a stream that
// carries positions instead of HTML.
function pairDelims(toks, src, literalDelims = '', blocked) {
  // E1 CLASSIFY: evaluate bare_opener(d) / bare_closer(d) at each candidate.
  for (const t of toks) classify(t, src, blocked)
  // One pass with a delimiter stack. `openers` holds indices (into toks) of
  // still-open candidates, in source order. `openMap` records paired spans.
  const openers = []
  const openMap = new Map() // open index -> close index
  for (let j = 0; j < toks.length; j++) {
    const t = toks[j]
    if (t.k === 'f') {
      // E3: while a span of this kind is open, the forced opener is literal.
      // The enclosing span counts as open, which is what holds its own
      // delimiter literal in the first place.
      if (literalDelims.includes(t.ch) || openers.some((oi) => toks[oi].ch === t.ch)) {
        const rep = demoteForced(t, literalDelims)
        for (const r of rep) classify(r, src, blocked)
        toks.splice(j, 1, ...rep)
        j--
        continue
      }
      t.k = 't'
      t.h = t.node.h()
      continue
    }
    if (t.k !== 'd') continue
    const d = t.ch
    // E2 CLOSE FIRST: a valid closer closes the NEAREST matching open entry;
    // entries pushed above it are popped and demoted to literal (spans nest,
    // never overlap).
    if (t.canClose) {
      let k = -1
      for (let s = openers.length - 1; s >= 0; s--) {
        if (toks[openers[s]].ch === d) {
          k = s
          break
        }
      }
      if (k !== -1) {
        openMap.set(openers[k], j)
        openers.length = k // demote the entries above the matched opener
        continue
      }
    }
    // E4 OPEN, subject to E3 (no same-type nesting): while a d-span is open,
    // a further d does not push -- it is literal content.
    if (t.canOpen && !openers.some((oi) => toks[oi].ch === d)) {
      openers.push(j)
      continue
    }
    // E1 / E5 literal: candidate left unpaired (rendered as its literal char).
  }
  return openMap
}

// Pair, then block every opener whose guard did not open a span of its own,
// and pair again. Blocking only removes openers, so the loop ends.
function pairGuarded(build, src, literalDelims = '') {
  const blocked = new Set()
  for (;;) {
    const toks = build()
    const openMap = pairDelims(toks, src, literalDelims, blocked)
    const opens = new Set([...openMap.keys()].map((i) => toks[i].at))
    let grew = false
    for (const i of openMap.keys()) {
      const t = toks[i]
      if (guardedBy(t.ch, src[t.at - 1]) && !opens.has(t.at - 1)) {
        blocked.add(t.at)
        grew = true
      }
    }
    if (!grew) return { toks, openMap }
  }
}

// PART 3 decides each quote by its preceding character, and the start of a
// span's content counts as start-of-content. Both need the pairing, so every
// quote in the run is decided here, in source order, from the glyph that stood
// before the run.
function applyQuotes(toks, openMap, src, contentAt, startGlyph) {
  const opens = new Set()
  for (const i of openMap.keys()) opens.add(toks[i].at)
  const candidates = new Set()
  for (const t of toks) if (t.k === 'd') candidates.add(t.at)
  let last = startGlyph
  let seen = false
  for (const t of toks) {
    if (t.straight !== undefined) {
      seen = true
      last = t.straight
      continue
    }
    if (t.quote === undefined) continue
    seen = true
    const { at, single } = t.quote
    const open = single ? '\u2018' : '\u201c'
    const close = single ? '\u2019' : '\u201d'
    const prev = at > 0 ? src[at - 1] : quotePrevCtx
    const next = src[at + 1] ?? ''
    let decided
    if (single && /[0-9]/.test(next) && !/[\p{L}\p{N}]/u.test(prev)) decided = close
    else if (EMPHASIS_DELIMS.has(prev)) {
      // The delimiter before it: an opener puts the quote at the start of a
      // span's content; one that pairs nothing is an ordinary character. A
      // delimiter that is not a candidate at all belongs to the span this run
      // is inside, and the quote opening the run stands at its content start.
      decided = candidates.has(at - 1) ? (opens.has(at - 1) ? open : close) : at === contentAt ? open : close
    } else if (prev === '') decided = open
    else if (QUOTE_CHARS.has(prev)) decided = last === '\u201c' || last === '\u2018' ? open : close
    else decided = QUOTE_OPEN_PREV.has(prev) ? open : close
    t.h = decided
    last = decided
  }
  if (seen) lastQuoteGlyph = last
}

function resolveEmphasis(build, src, literalDelims = '', contentAt = 0) {
  const startGlyph = lastQuoteGlyph
  const { toks, openMap } = pairGuarded(build, src, literalDelims)
  applyQuotes(toks, openMap, src, contentAt, startGlyph)
  resolveNameRun(toks, openMap)
  applyMarkerBoundary(toks, openMap, src, contentAt)
  // Build the span tree by walking the paired ranges (properly nested).
  const consumed = new Set() // attrs tokens attached to a span
  const renderRange = (lo, hi) => {
    let out = ''
    let i = lo
    while (i < hi) {
      const t = toks[i]
      if (t.k === 'd' && openMap.has(i)) {
        const closeIdx = openMap.get(i)
        const inner = renderRange(i + 1, closeIdx)
        // A `{...}` block immediately after the closer attaches as attributes.
        let attrsStr = ''
        const after = closeIdx + 1
        if (
          after < toks.length &&
          toks[after].k === 'attrs' &&
          toks[after].at === toks[closeIdx].at + 1
        ) {
          attrsStr = renderAttrs(toks[after].node.parseAttrs())
          consumed.add(after)
        }
        out += `<${TAG[t.ch]}${attrsStr}>${inner}</${TAG[t.ch]}>`
        i = closeIdx + 1
        continue
      }
      if (t.k === 'd') out += escapeHtml(t.ch)
      else if (t.k === 'attrs') {
        // UNATTACHED, so its braces are ordinary content and must not fence off
        // what is inside them (carve#2084). renderInlineInner re-reads the text
        // with this brace escaped, which is the same document and puts the
        // block's characters back into the surrounding inline stream.
        if (!consumed.has(i)) unattachedAttrs.push(t.at)
      } else out += t.h
      i++
    }
    return out
  }
  return renderRange(0, toks.length)
}

// grammar.ebnf PART 26: every container FLATTENS/refuses rather than crashing;
// MAX_NESTING_DEPTH bounds recursion so the pipeline stays linear-time and
// never overflows the stack.
const MAX_NESTING_DEPTH = 200

// The Ohm `bracketed`/`nested` rules recurse once per open bracket. A run of
// unmatched/deeply-nested `[` would blow the JS call stack inside g.match with
// a raw RangeError. Pre-scan the maximum simultaneous `[` nesting (skipping
// escapes and verbatim spans) and REFUSE past the bound -- a legitimate
// refusal, not a crash.
function bracketDepthExceeds(text, limit) {
  let depth = 0
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (c === '\\') {
      i++
      continue
    }
    if (c === '`') {
      let run = 1
      while (text[i + run] === '`') run++
      const close = text.indexOf('`'.repeat(run), i + run)
      i = close === -1 ? text.length : close + run - 1
      continue
    }
    if (c === '[') {
      depth++
      if (depth > limit) return true
    } else if (c === ']') {
      if (depth > 0) depth--
    }
  }
  return false
}

// math attrs merge into the base `math inline|display` class (PART 9 SS18);
// key/value and boolean attributes go through the SAME hardening path as
// every other carrier (PART 9 SS25)
function mathSpan(kind, code, attrs) {
  const wrap = kind === 'inline' ? ['\\(', '\\)'] : ['\\[', '\\]']
  const list = attrsOf(attrs)
  const classes = ['math', kind, ...list.filter((a) => a[0] === 'class').map((a) => a[1])]
  // PART 10 SS1: the base class is prepended INSIDE the class slot, and the slot
  // stays at the FIRST-APPEARANCE position of a class in the author's order.
  // Writing `class` unconditionally first moves it ahead of an id the author
  // wrote before any class. carve#1168 fixed exactly this in the `ext-NAME`
  // fallback; the math span carries a base class the same way and was missed,
  // because no corpus case put an id before a class on it (carve#1164).
  let rest = ''
  let emittedClasses = false
  const classAttr = () => ` class="${classes.join(' ')}"`
  for (const a of list) {
    if (a[0] === 'class') {
      if (!emittedClasses) {
        rest += classAttr()
        emittedClasses = true
      }
    } else if (a[0] === 'id') rest += ` id="${escapeAttr(a[1])}"`
    else if (a[0] === 'kv') {
      const h = hardenAttr(a[1], a[2])
      if (h) rest += ` ${a[1]}="${escapeAttr(h.value)}"`
    } else if (a[0] === 'bool') {
      if (hardenAttr(a[1], '')) rest += ` ${a[1]}=""`
    }
  }
  const inner = codeInner(code)
  // codeU (unclosed run) carries its content in a different child slot
  const body = escapeHtml(
    inner.ctorName === 'codeU'
      ? inner.child(2).sourceString.replace(/[ \t\n]+$/, '')
      : codeText(inner.child(1))
  )
  // No authored class at all: nothing to place the base class after, so it leads.
  if (!emittedClasses) rest = classAttr() + rest
  // PART 9 SS18 A MATH SPAN CARRIES ROLE MATH (carve#1468). The span carries
  // `role="math"`. The delimiters exist for a
  // typesetter to find, and until one runs - or if none ever does - a reader
  // announces the backslashes and the caret as prose. The role says the run is
  // MATHEMATICS whether or not the script arrives. The NAME stays the author's:
  // `{aria-label="E equals m c squared"}` is an ordinary key/value on the same
  // carrier, so the seam already exists and no engine-written English is added.
  // An author who spelled their own `role` keeps it.
  // ASCII-case-insensitive: an author's attribute NAME is emitted verbatim and
  // HTML attribute names are case-insensitive, so `ROLE` and `role` are one
  // attribute and a case-sensitive match writes a duplicate of it.
  const authoredRole = list.some((a) => a[0] === 'kv' && a[1].toLowerCase() === 'role')
  const roleStr = authoredRole ? '' : ' role="math"'
  return `<span${rest}${roleStr}>${wrap[0]}${body}${wrap[1]}</span>`
}

// parse a standalone `{...}` attribute block (table row/cell attrs);
// returns the serialized attribute string or null when invalid
export function parseAttrBlock(text) {
  const m = g.match(text, 'attrs')
  if (m.failed()) return null
  return renderAttrs(attrSem(m).parseAttrs())
}

// raw parsed attr list ([kind, name, value?] tuples) or null when invalid
export function parseAttrList(text) {
  const m = g.match(text, 'attrs')
  if (m.failed()) return null
  return attrSem(m).parseAttrs()
}

// The same, for a standalone attribute LINE, which may span lines: PART 9's
// `block_attributes` separates with `attr_separator = (whitespace |
// continuation), opt_ws` where an inline block's `opt_ws` is "spaces/tabs only,
// no line breaks". One rule served both for a while, so the oracle read
// `*x*{.a<NEWLINE>.b}` as an attribute block where all three engines leave it
// literal text (carve#878).
export function parseBlockAttrList(text) {
  const m = g.match(text, 'blockAttrs')
  if (m.failed()) return null
  return attrSem(m).parseAttrs()
}

// PART 9 SS15 A3 merge for BLOCK attribute lines: first-appearance position,
// last value wins for id/key, classes ACCUMULATE in source order and
// DEDUPLICATE - a later list adds its classes rather than replacing the
// earlier one's, and a class already present is not added twice. This used to
// keep the duplicate, following a clause sentence no engine implemented
// (carve#615).
export function renderBlockAttrs(lists) {
  const parts = []
  const classes = []
  let classAt = -1
  const seen = new Map()
  for (const list of lists) {
    for (const a of list) {
      if (a[0] === 'class') {
        if (classAt === -1) {
          classAt = parts.length
          parts.push(null)
        }
        if (!classes.includes(a[1])) classes.push(a[1])
      } else if (a[0] === 'id') {
        if (seen.has('#id')) parts[seen.get('#id')] = ` id="${escapeAttr(a[1])}"`
        else {
          seen.set('#id', parts.length)
          parts.push(` id="${escapeAttr(a[1])}"`)
        }
      } else if (a[0] === 'kv') {
        const h = hardenAttr(a[1], a[2])
        if (!h) continue
        if (seen.has(a[1])) parts[seen.get(a[1])] = ` ${a[1]}="${escapeAttr(h.value)}"`
        else {
          seen.set(a[1], parts.length)
          parts.push(` ${a[1]}="${escapeAttr(h.value)}"`)
        }
      } else {
        // Same rule as the inline merge above: a boolean is a key/value with an
        // empty value and shares that name's slot (carve#1123).
        if (!hardenAttr(a[1], '')) continue
        if (seen.has(a[1])) parts[seen.get(a[1])] = ` ${a[1]}=""`
        else {
          seen.set(a[1], parts.length)
          parts.push(` ${a[1]}=""`)
        }
      }
    }
  }
  if (classAt !== -1) parts[classAt] = ` class="${escapeAttr(classes.join(' '))}"`
  return parts.join('')
}

// quote-context decision (PART 9 SS8): OPENING after whitespace or an
// opening context character; CLOSING otherwise (incl. start of input -
// corpus 37-3 pins a line-initial pair as two closers). A single quote
// directly before a digit is always an apostrophe ('70s, '24).
const QUOTE_OPEN_PREV = new Set([' ', '\t', '=', ':', '-', '/', '(', '[', '{'])
// PART 7's whitespace plus the NO-BREAK SPACE, for the hyphen-run flanking
// test (carve#1443). A vertical tab and a form feed are deliberately OUT:
// Carve reads both as content, and `\s` takes them.
const FLANK_SPACE = /[ \t\n\r\u00a0]/
const QUOTE_CHARS = new Set(['"', "'"])
// The glyph the previous quote resolved to, so a quote directly after
// another one can tell which half it follows: after an OPENING quote it opens
// (`"'q'"` nests), after a closing one it closes (`""` is a pair). The
// character alone cannot say - both spellings are the same byte.
let lastQuoteGlyph = ''
// A quote directly after a bare delimiter that OPENS a span stands at the
// START of that span's content, which is an opening context (carve#348).
// After a delimiter that opens nothing the delimiter IS the preceding
// character, and none of these three is an opening context, so the quote
// closes. Pairing decides which, so `applyQuotes` settles it after the stack
// has run. `/` and `=` are in the opening set already, either way.
const EMPHASIS_DELIMS = new Set(['*', '_', '~'])
const QUOTE_RULES = new Set(['dquote', 'squote'])
function smartQuote(node, open, close, single) {
  const src = node.source.sourceString
  const at = node.source.startIdx
  const prev = at > 0 ? src[at - 1] : quotePrevCtx
  const next = src[at + 1] ?? ''
  if (single && /[0-9]/.test(next) && !/[\p{L}\p{N}]/u.test(prev)) {
    lastQuoteGlyph = close
    return close // apostrophe
  }
  // Nothing before the quote is the MOST opening context there is - start of
  // the input, or of a recursive inline parse with no carried context. This
  // used to fall through to `close`, so every line beginning with a quote got
  // a closing glyph (`"hello"` rendered as `”hello”`).
  const decided =
    prev === ''
      ? open
      : QUOTE_CHARS.has(prev)
        ? lastQuoteGlyph === '\u201c' || lastQuoteGlyph === '\u2018'
          ? open
          : close
        : QUOTE_OPEN_PREV.has(prev)
          ? open
          : close
  lastQuoteGlyph = decided
  return decided
}

let quotePrevCtx = '' // preceding character for recursive inline parses

/*
 * A SYMBOL CONTRIBUTES NOTHING TO A HEADING ID. syntax.md section 4.1 step 1
 * takes the heading's rendered plain text "(inline markup removed; symbols
 * `:name:` and footnote references excluded)", and the exclusion is by
 * CONSTRUCT rather than by what the symbol renders as - it has to be, because a
 * symbol resolves through processor configuration (a handler, else the
 * `symbols` map, else the literal `:name:`) while an id is assigned before any
 * of that is consulted. An id keyed on the shortcode name would name a spelling
 * the document stops rendering the moment a host configures a map.
 *
 * The flag rather than a sentinel: a sentinel that leaked would corrupt output,
 * and the id derivation is the only caller that wants the symbol gone, so it
 * renders its own copy of the heading (markup-carve/carve#1011).
 */
let omitSymbols = false

/*
 * HARD BREAKS: a soft break renders as `<br>` (PART 9 SS23).
 *
 * A line block and a local hard-break block promise it of every soft break
 * they hold. The promise is about BREAKS, and a newline swallowed by an
 * unclosed inline run is not one: the run reaches the end of the block and
 * everything it spans is its CONTENT, so writing a `<br>` into it would put
 * markup inside text that is by definition not markup.
 *
 * The flag rather than a post-pass over the rendered HTML: which newlines sit
 * inside a verbatim span is KNOWN here, at the node that matched them, and is
 * only guessable from the output. Guessing it put a `<br>` inside an
 * attributed math span (`class` is not the first attribute when the author
 * wrote an id first) and inside a literal, which has no wrapper element at
 * all, and it went blind after any raw `{=html}` payload holding a tag
 * (markup-carve/carve#1282).
 */
let hardBreaks = false

export function renderInlineHardBreaks(text, prevCtx = '') {
  hardBreaks = true
  try {
    return renderInline(text, prevCtx)
  } finally {
    hardBreaks = false
  }
}

/*
 * FOOTNOTE RECOGNITION IS OFF INSIDE A NOTE (grammar.ebnf §16).
 *
 * "Content is INLINE-only, parsed recursively with footnote recognition
 * DISABLED inside it (no `^[…]` or `[^ref]` nested in a note, either
 * direction)." Disabled recognition makes the inner spelling ordinary text -
 * `^` plus a bracketed run, or a bracketed run over `^label` - not an
 * unrenderable document, which is how the executable spec used to read it
 * (markup-carve/carve#1188).
 *
 * A flag rather than a second grammar: the two rules that must stop matching
 * are reached from every inline position, and the state has to survive the
 * recursive renderInline calls the note's own content makes, at any depth.
 */
let noFootnotes = false

export function renderInlineWithoutSymbols(text, prevCtx = '') {
  omitSymbols = true
  try {
    return renderInline(text, prevCtx)
  } finally {
    omitSymbols = false
  }
}

/*
 * PART 2 HEADING IDENTIFIERS step 1: smart typography is reversed to ASCII
 * before slugging, so `# Don't repeat yourself` gives `Don-t-repeat-yourself`
 * and not a curly apostrophe inside the id. The id side is the only consumer -
 * the implicit-reference index compares two RENDERED strings, which already
 * carry the same glyphs on both sides.
 */
const SMART_TO_ASCII = {
  '\u2194': '<->', '\u2122': '(tm)', '\u2026': '...', '\u2192': '->', '\u2190': '<-',
  '\u21d2': '=>', '\u2264': '<=', '\u2265': '>=', '\u2260': '!=', '\u00b1': '+-',
  '\u00a9': '(c)', '\u00ae': '(r)', '\u2013': '-', '\u2014': '-',
  '\u2018': "'", '\u2019': "'", '\u201c': '"', '\u201d': '"',
}

export function deTypography(s) {
  let out = ''
  for (const ch of s) out += SMART_TO_ASCII[ch] ?? ch
  return out
}

export function renderInline(text, prevCtx = '') {
  const saved = quotePrevCtx
  lastQuoteGlyph = ''
  quotePrevCtx = prevCtx
  try {
    return renderInlineInner(text)
  } finally {
    quotePrevCtx = saved
  }
}

function renderInlineInner(text) {
  // Emphasis is resolved by the PART 9 SS9 delimiter stack in the `inlines`
  // semantic (resolveEmphasis) -- no pre-scan / refusal needed here.
  if (bracketDepthExceeds(text, MAX_NESTING_DEPTH)) throw new Refuse('inline nesting exceeds MAX_NESTING_DEPTH')
  if (text.includes('`'.repeat(MAX_CODE_RUN + 1))) throw new Refuse('inline backtick run past the code span tiers')
  const saved = unattachedAttrs
  let source = text
  // Each pass escapes ONE unattached block, so the number of blocks bounds the
  // loop and a pass that finds none is the answer.
  for (let pass = 0; ; pass++) {
    unattachedAttrs = []
    const m = g.match(source, 'inlines')
    if (m.failed()) {
      unattachedAttrs = saved
      throw new Refuse(`inline: ${m.shortMessage}`)
    }
    const out = sem(m).h()
    const offsets = unattachedAttrs
    if (offsets.length === 0 || pass > offsets.length + 1) {
      unattachedAttrs = saved
      return out
    }
    const first = Math.min.apply(null, offsets)
    source = source.slice(0, first) + '\\' + source.slice(first)
  }
}

/*
 * The source offset of a caption's `#` number placeholder, or -1 for none.
 *
 * PART 9 SS4c puts the placeholder at the FIRST bare `#` in the caption's
 * TOP-LEVEL text: `#word` is a tag and `\#` an escape, so neither reaches the
 * `hash` token, and a `#` inside inline markup is literal. The scan therefore
 * walks the same token stream and SS9 pairing the renderer walks, over a stream
 * that carries source offsets instead of HTML, and steps over every paired
 * span. Every leaf -- a code span, a link, a forced span -- is one token here,
 * so a `#` it encloses is never seen.
 */
export function captionPlaceholder(text) {
  if (bracketDepthExceeds(text, MAX_NESTING_DEPTH)) return -1
  const m = g.match(text, 'inlines')
  if (m.failed()) return -1
  return capSem(m).capIdx()
}

const capSem = g.createSemantics().addOperation('capIdx', {
  inlines(items) {
    const build = () =>
      items.children.map((c) => {
        const alt = c.child(0)
        const at = alt.source.startIdx
        const ch = alt.ctorName === 'litDelim' ? alt.child(0).sourceString : ''
        return STACK_DELIMS.has(ch) ? { k: 'd', ch, at } : { k: alt.ctorName, at }
      })
    const { toks, openMap } = pairGuarded(build, this.source.sourceString)
    for (let i = 0; i < toks.length; i++) {
      if (openMap.has(i)) {
        i = openMap.get(i)
        continue
      }
      if (toks[i].k === 'hash') return toks[i].at
    }
    return -1
  },
})

// ---------------------------------------------------------------------------
// Heading slugs (grammar.ebnf PART 2 HEADING IDENTIFIERS, executable subset)
export function makeSlugger() {
  const seen = new Map()
  return (text) => {
    let slug = text
      .replace(/[‪-‮⁦-⁩​‌‍⁠﻿­]/g, '')
      .normalize('NFC')
      // ASCII punctuation and ASCII whitespace only. The rule is "each
      // maximal run of NON-ALPHANUMERIC ASCII characters", with non-ASCII
      // passing through unchanged - and `\\s` reaches past ASCII, so a
      // no-break space (U+00A0, what `#  Title` renders its second space
      // as) became a `-` and was then trimmed. All three engines keep it.
      // The ASCII ranges below already cover space, tab and newline.
      .replace(/[\x00-\x2f\x3a-\x40\x5b-\x60\x7b-\x7e]+/g, '-')
      .replace(/^-+|-+$/g, '')
    if (slug === '') slug = 's'
    else if (/^\p{N}/u.test(slug)) slug = `s-${slug}`
    const n = seen.get(slug) ?? 0
    seen.set(slug, n + 1)
    return n === 0 ? slug : `${slug}-${n + 1}`
  }
}
