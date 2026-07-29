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

const escapeHtml = (s) =>
  s
    .replace(STRIP, '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll(' ', '&nbsp;')

export const escapeAttr = (s) => escapeHtml(s).replaceAll('"', '&quot;').replaceAll("'", '&apos;')

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
  attrVal(v) {
    return v.parseAttrs()
  },
  quoted(_o, chars, _c) {
    return chars.children.map((c) => c.sourceString.replace(/^\\/, '')).join('')
  },
  bareVal(chars) {
    return chars.sourceString
  },
  _terminal() {
    return this.sourceString
  },
})

// PART 9 SS25 ATTRIBUTE HARDENING: drop on*/srcdoc/formaction; drop an
// href/src override whose scheme is denylisted; blank a style value with a
// CSS execution vector.
const STYLE_VECTOR = /expression\(|url\(|@import|behavior:|-moz-binding/i
function hardenAttr(name, value) {
  const n = name.toLowerCase()
  if (n.startsWith('on') || n === 'srcdoc' || n === 'formaction') return null
  if ((n === 'href' || n === 'src') && checkUrl(value) === '') return null
  if (n === 'style' && STYLE_VECTOR.test(value.replace(/\s+/g, ''))) return { name, value: '' }
  return { name, value }
}

function renderAttrs(list) {
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
      if (!hardenAttr(a[1], '')) continue
      parts.push(` ${a[1]}=""`)
    }
  }
  if (classAt !== -1) parts[classAt] = ` class="${escapeAttr(classes.join(' '))}"`
  return parts.join('')
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
    return `<code>${escapeHtml(content.sourceString.replace(/\s+$/, ''))}</code>`
  },
  nl(_n) {
    return '\n'
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
    const a = renderAttrs(attrsOf(attrs))
    return `fn:${label.sourceString}\u0002${a}`
  },
  inlineNote(_o, content, _c, attrs) {
    // anonymous note: content renders now; numbering happens in PART 9R.
    // Footnote/crossref recognition is DISABLED inside a note (SS16); a
    // nested sentinel would also break the sentinel framing, so refuse.
    const inner = renderInline(content.sourceString, '[')
    if (inner.includes('\uE000')) throw new Refuse('nested construct in an inline note')
    if (content.sourceString.trim() === '') throw new Refuse('empty inline note')
    const a = renderAttrs(attrsOf(attrs))
    return `\uE000note:${inner}\u0002${a}\uE001`
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
    return tail.child(0).applyTail(inner)
  },
  image(_b, _o, alt, _c, _p, dest, title, _cp, attrs) {
    const t = title.numChildren ? ` title="${escapeAttr(title.child(0).titleText())}"` : ''
    const a = renderAttrs(attrsOf(attrs))
    return `<img src="${escapeAttr(checkUrl(destValue(dest)))}" alt="${escapeAttr(alt.sourceString)}"${t}${a}>`
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
  hardBreak(_bs, _la) {
    return '<br>'
  },
  shortcode(_c1, name, _c2) {
    // No symbol map in Core: the literal `:name:` fallback. Consuming it as one
    // token is what keeps smart typography out of the name (`:+-:` stays the
    // symbol `+-`, it does not become `:±:`).
    return `:${escapeHtml(name.sourceString)}:`
  },
  symbolAttr(_c1, name, _c2, attrs) {
    // `:name:{...}`: an UNMAPPED symbol renders as its literal `:name:` text,
    // wrapped in a <span> that carries the attribute block (PART 9 §7).
    return `<span${renderAttrs(attrs.parseAttrs())}>:${escapeHtml(name.sourceString)}:</span>`
  },
  mention(_a, name) {
    return `<span class="mention"><strong>@${escapeHtml(name.sourceString)}</strong></span>`
  },
  tag(_h, name) {
    return `<span class="tag"><strong>#${escapeHtml(name.sourceString)}</strong></span>`
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
  edComment(_o, content, _c, attrs) {
    // comment content is verbatim (spaces preserved)
    return `<span class="critic-comment"${renderAttrs(attrsOf(attrs))}>${escapeHtml(content.sourceString)}</span>`
  },
  rawInline(code, _ob, fmt, _cb) {
    // PART 9 SS20: emitted UNESCAPED for the html format, dropped otherwise
    const text = codeText(code.child(0).child(1))
    return fmt.sourceString === 'html' ? text : ''
  },
  litInline(_bang, code, attrs) {
    // PART 9 §27: "!" prefix on a verbatim code span. Content is HTML-ESCAPED,
    // emitted by every renderer and never dropped, with the <code> wrapper
    // removed. Bare text when no attribute block is present; a <span> carrying
    // the attributes when one is. Body extraction mirrors mathSpan (codeU
    // carries its content in a different child slot).
    const inner = code.child(0)
    const body = escapeHtml(
      inner.ctorName === 'codeU'
        ? inner.child(2).sourceString.replace(/\s+$/, '')
        : codeText(inner.child(1)),
    )
    const a = renderAttrs(attrsOf(attrs))
    return a === '' ? body : `<span${a}>${body}</span>`
  },
  extension(_c, name, _o, content, _cl, attrs) {
    const n = name.sourceString
    const inner = renderInline(content.sourceString, '[')
    const extra = attrsOf(attrs).filter((a) => a[0] === 'class').map((a) => a[1])
    const rest = attrsOf(attrs).filter((a) => a[0] !== 'class')
    // the kbd extension renders its own element (attrs apply to it);
    // everything else is the generic ext-<name> span
    if (n === 'kbd') {
      const cls = extra.length ? ` class="${escapeAttr(extra.join(' '))}"` : ''
      return `<kbd${cls}${renderAttrs(rest)}>${inner}</kbd>`
    }
    const cls = [`ext-${n}`, ...extra].join(' ')
    return `<span class="${cls}"${renderAttrs(rest)}>${inner}</span>`
  },
  spComment(_sp, _pp, _rest) {
    return ''
  },
  arrow(tok) {
    return { '<->': '\u2194', '->': '\u2192', '<-': '\u2190', '=>': '\u21d2', '!=': '\u2260', '<=': '\u2264', '>=': '\u2265', '+-': '\u00b1' }[tok.sourceString]
  },
  symbol(tok) {
    return { '(c)': '\u00a9', '(r)': '\u00ae', '(tm)': '\u2122' }[tok.sourceString]
  },
  ellipsis(_e) {
    return '\u2026'
  },
  dashRun(_a, _b) {
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
    return escapeHtml(a.sourceString) // standalone block is literal text
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
sem.addOperation('applyTail(text)', {
  linkTail(_o, dest, title, _c, attrs) {
    const { text } = this.args
    if (text.includes('\uE000fn:')) throw new Refuse('footnote inside link text')
    const t = title.numChildren ? ` title="${escapeAttr(title.child(0).titleText())}"` : ''
    const a = renderAttrs(attrsOf(attrs))
    return `<a href="${escapeAttr(checkUrl(destValue(dest)))}"${t}${a}>${text}</a>`
  },
  refTail(_o, label, _c, attrs) {
    const { text } = this.args
    if (text.includes('\uE000fn:')) throw new Refuse('footnote inside link text')
    const lbl = label.numChildren ? label.child(0).sourceString : null
    const a = renderAttrs(attrsOf(attrs))
    return `ref:${JSON.stringify({ label: lbl, text, attrs: a })}`
  },
  attrs(_o, _s1, _first, _s2, _rest, _s3, _c) {
    const { text } = this.args
    return `<span${renderAttrs(this.parseAttrs())}>${text}</span>`
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
  let rest = ''
  for (const a of list) {
    if (a[0] === 'id') rest += ` id="${escapeAttr(a[1])}"`
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
      ? inner.child(2).sourceString.replace(/\s+$/, '')
      : codeText(inner.child(1))
  )
  return `<span class="${classes.join(' ')}"${rest}>${wrap[0]}${body}${wrap[1]}</span>`
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

// PART 9 SS15 A3 merge for BLOCK attribute lines: first-appearance position,
// last value wins for id/key, classes ACCUMULATE in source order (no dedup)
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
        classes.push(a[1])
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
        if (!hardenAttr(a[1], '')) continue
        parts.push(` ${a[1]}=""`)
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
      .replace(/[\x00-\x2f\x3a-\x40\x5b-\x60\x7b-\x7e\s]+/g, '-')
      .replace(/^-+|-+$/g, '')
    if (slug === '') slug = 's'
    else if (/^\p{N}/u.test(slug)) slug = `s-${slug}`
    const n = seen.get(slug) ?? 0
    seen.set(slug, n + 1)
    return n === 0 ? slug : `${slug}-${n + 1}`
  }
}
