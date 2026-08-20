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
import { Refuse } from './layout.mjs'

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
export function destValue(dest) {
  return dest.sourceString.replace(/\\([()\\])/g, '$1')
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
  if (/^ .* $/.test(text) && text.trim() !== '') text = text.slice(1, -1)
  return text
}
function codeOp(_o, content, _c) {
  return `<code>${escapeHtml(codeText(content))}</code>`
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

const sem = g.createSemantics().addOperation('h', {
  inlines(items) {
    // The bare single-char emphasis delimiters are NOT resolved by the PEG.
    // Build a flat token stream (leaf HTML fragments + bare-delimiter
    // candidates) and run the PART 9 SS9 delimiter-stack pass over it.
    return resolveEmphasis(buildToks(items.children), this.source.sourceString)
  },
  boldItalic(_o, inner, _c, attrs) {
    const a = renderAttrs(attrsOf(attrs))
    return `<strong${a}><em>${inner.children.map((c) => c.h()).join('')}</em></strong>`
  },
  code1: codeOp,
  code2: codeOp,
  code3: codeOp,
  codeU(_o, _r, content) {
    // unclosed run: verbatim to end of block, trailing whitespace stripped,
    // NO single-space strip
    // The strip is PART 2's `whitespace` - a space or a tab - plus the newlines
    // the run crossed on its way to the end of the block. `\s` is wider than
    // the rule: it holds the no-break space, which every other clause calls
    // CONTENT, so a run ending in one silently lost it. The same narrowing
    // applies at the math and literal bodies, which share this extraction.
    const trim = hardBreaks ? /[ \t]+$/ : /[ \t\n]+$/
    return `<code>${escapeHtml(content.sourceString.replace(trim, ''))}</code>`
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
    return escapeHtml(ch.sourceString)
  },
  nbspEsc(_bs, _sp) {
    return '&nbsp;'
  },
  hardBreak(_bs, _tail) {
    // The rule CONSUMES the newline (PART 3), so this emits it: one line
    // boundary, one break, whether the boundary was spelled with a backslash
    // or not. In a line block that is the whole of PART 9 SS23's A BACKSLASH
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
    const body = resolveEmphasis(buildToks(inner.children, dch), this.source.sourceString)
    return `<${tag}${a}>${body}</${tag}>`
  },
  edIns(_o, content, _c, attrs) {
    return `<ins${renderAttrs(attrsOf(attrs))}>${renderInline(content.sourceString, '{')}</ins>`
  },
  edDel(_o, content, _c, attrs) {
    return `<del${renderAttrs(attrsOf(attrs))}>${renderInline(content.sourceString, '{')}</del>`
  },
  edSub(_o, oldC, _ar, newC, _c, attrs) {
    const a = renderAttrs(attrsOf(attrs))
    return `<del${a}>${renderInline(oldC.sourceString, '{')}</del><ins${a}>${renderInline(newC.sourceString, '{')}</ins>`
  },
  edComment(body, attrs) {
    // comment content is verbatim (spaces preserved)
    return `<span class="critic-comment"${renderAttrs(attrsOf(attrs))}>${escapeHtml(body.child(1).sourceString)}</span>`
  },
  rawInline(code, _ob, fmt, _cb) {
    // PART 9 SS20: emitted UNESCAPED for the html format, dropped otherwise
    const text = codeText(code.child(0).child(1))
    return fmt.sourceString === 'html' ? text : ''
  },
  litInline(span, attrs) {
    const code = span.child(1)
    // PART 9 §27: "!" prefix on a verbatim code span. Content is HTML-ESCAPED,
    // emitted by every renderer and never dropped, with the <code> wrapper
    // removed. Bare text when no attribute block is present; a <span> carrying
    // the attributes when one is. Body extraction mirrors mathSpan (codeU
    // carries its content in a different child slot).
    const inner = code.child(0)
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
  hash(_h, _la) {
    return '#'
  },
  looseAttrs(a) {
    // The BRACES are literal, their CONTENTS are inline content. A brace run
    // that attaches to nothing is text (SS15 A7, PART 2 headings), and the
    // text inside it goes on being text - so a `#word` in there is a tag
    // (SS19), which is what all three engines emit. Escaping the whole run
    // rendered `{#id .cls}` verbatim and lost the tag.
    const src = a.sourceString
    return '{' + renderInline(src.slice(1, -1)) + '}'
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
const isWordCh = (c) => c !== undefined && /[\p{L}\p{N}]/u.test(c)
const isWs = (c) => c === undefined || /\s/.test(c)

// The formal word-boundary guard templates (grammar.ebnf PART 3):
//   bare_opener(d) = <!(alnum | '_' | d | slash_if(d)), d, !(ws | d)
//   bare_closer(d) = <&(non_ws), d, !(alnum)
// END counts as whitespace (a run may not open at end of block); a following
// same delimiter is allowed for a closer (`/x//` -> the first `/` after x
// closes; the trailing `/` stays literal).
// slash_if(d) = '/' for d in { '/', '_' }: italic and underline additionally
// never open when the immediately preceding character is `/` -- for `/` this
// coincides with same-delimiter adjacency, for `_` it is the extra
// cross-delimiter guard the reference engines apply (path protection:
// /a/_b_, snake_/case/, a_/_a_). The other delimiters `* ~ =` DO open after
// `/` (e.g. `a/~y~` -> `a/<s>y</s>`), so the guard is `/ _`-specific.
function bareOpener(d, prev, prev2, next) {
  if (prev !== undefined && (isWordCh(prev) || prev === d)) return false
  // Path protection for `/` and `_`: they do NOT open immediately after a `/`
  // or `_` UNLESS that preceding delimiter sits at a clean left boundary (its
  // own preceding char is whitespace/undefined) -- i.e. the preceding delimiter
  // is itself a true opener (`/_x_/`, `_/x/_` nest), not a closer or mid-path
  // delimiter (`/a/_b_`, `snake_/case/`, `a_/_a_` stay literal). The other
  // delimiters `* ~ =` open after `/` or `_` unconditionally (`_*x*_`, `*x*_y_`).
  if (
    (d === '/' || d === '_') &&
    (prev === '/' || prev === '_') &&
    prev2 !== undefined &&
    !isWs(prev2)
  ) {
    return false
  }
  return !isWs(next) && next !== d
}
function bareCloser(d, prev, next) {
  return prev !== undefined && !isWs(prev) && (next === undefined || !isWordCh(next))
}

// Build the flat token stream from a list of CST child nodes (inline* or
// fInner*). A bare `/ * _ ~ =` becomes a delimiter candidate; every other
// alternative renders to an HTML fragment now. `literalDelim` (the forced
// span's own delimiter, if any) is held literal rather than made a candidate.
function buildToks(children, literalDelim) {
  const toks = []
  for (const c of children) {
    const alt = c.child(0)
    const name = alt.ctorName
    if (name === 'litDelim') {
      const ch = alt.sourceString
      // Only / * _ ~ = are stack candidates; ^ and , have no bare span.
      if (STACK_DELIMS.has(ch) && ch !== literalDelim) {
        toks.push({ k: 'd', ch, at: alt.source.startIdx })
        continue
      }
      toks.push({ k: 't', h: escapeHtml(ch) })
      continue
    }
    if (name === 'looseAttrs') {
      // A trailing `{...}` block may attach to a resolved span; if it does
      // not, it renders as its literal fallback (alt.h()).
      toks.push({ k: 'attrs', node: alt, at: alt.source.startIdx, h: alt.h() })
      continue
    }
    toks.push({ k: 't', h: c.h() })
  }
  return toks
}

// Resolve a flat token stream (leaf HTML fragments interleaved with bare
// delimiter candidates) into rendered HTML. `toks` items are one of:
//   { k: 'd', ch, at }      a bare delimiter candidate (source index `at`)
//   { k: 'attrs', node, at, h }  a trailing `{...}` block (may attach to a span)
//   { k: 't', h }           an already-rendered leaf fragment
function resolveEmphasis(toks, src) {
  // E1 CLASSIFY: evaluate bare_opener(d) / bare_closer(d) at each candidate.
  for (const t of toks) {
    if (t.k !== 'd') continue
    const prev = t.at > 0 ? src[t.at - 1] : undefined
    const prev2 = t.at > 1 ? src[t.at - 2] : undefined
    const next = src[t.at + 1]
    t.canOpen = bareOpener(t.ch, prev, prev2, next)
    t.canClose = bareCloser(t.ch, prev, next)
  }
  // One pass with a delimiter stack. `openers` holds indices (into toks) of
  // still-open candidates, in source order. `openMap` records paired spans.
  const openers = []
  const openMap = new Map() // open index -> close index
  for (let j = 0; j < toks.length; j++) {
    const t = toks[j]
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
        if (!consumed.has(i)) out += t.h
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
  const inner = code.child(0)
  // codeU (unclosed run) carries its content in a different child slot
  const body = escapeHtml(
    inner.ctorName === 'codeU'
      ? inner.child(2).sourceString.replace(/[ \t\n]+$/, '')
      : codeText(inner.child(1))
  )
  // No authored class at all: nothing to place the base class after, so it leads.
  if (!emittedClasses) rest = classAttr() + rest
  return `<span${rest}>${wrap[0]}${body}${wrap[1]}</span>`
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
// The glyph the previous quote token resolved to, so a quote directly after
// another one can tell which half it follows: after an OPENING quote it opens
// (`"'q'"` nests), after a closing one it closes (`""` is a pair). The
// character alone cannot say - both spellings are the same byte.
let lastQuoteGlyph = ''
// Bare emphasis delimiters (PART 9 §9). A quote directly inside one sees what
// precedes the delimiter, not the delimiter itself: the engines decide on the
// start of the emphasis CONTENT, so `*'q'*` opens while `a*'q'*` - where the
// `*` is intraword and opens nothing - closes (carve#348).
// Only the delimiters that are NOT already an opening context in their own
// right. `/` and `=` are in the set above - `a="b"` and a line-leading `/"q"`
// open on them directly - so skipping those would land the lookbehind on the
// word before and close the quote.
const EMPHASIS_DELIMS = new Set(['*', '_', '~'])
function smartQuote(node, open, close, single) {
  const src = node.source.sourceString
  const at = node.source.startIdx
  let back = at - 1
  while (back >= 0 && EMPHASIS_DELIMS.has(src[back])) back--
  const prev = back >= 0 ? src[back] : quotePrevCtx
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
  const m = g.match(text, 'inlines')
  if (m.failed()) throw new Refuse(`inline: ${m.shortMessage}`)
  return sem(m).h()
}

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
