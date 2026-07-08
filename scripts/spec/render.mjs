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

const escapeHtml = (s) =>
  s
    .replace(/[‪-‮⁦-⁩]/g, '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll(' ', '&nbsp;')

export const escapeAttr = (s) => escapeHtml(s).replaceAll('"', '&quot;')

// PART 9 SS25: URL sink scheme denylist -- a denylisted scheme renders an
// EMPTY value. Scheme detection first strips ASCII controls and ALL Unicode
// whitespace before matching, so an obfuscated scheme cannot slip past.
const DENY = new Set(['javascript', 'vbscript', 'data', 'file',
  'ms-msdt', 'ms-office', 'ms-word', 'ms-excel', 'ms-powerpoint', 'ms-access',
  'ms-visio', 'ms-project', 'ms-publisher', 'ms-infopath', 'ms-spd',
  'ms-search', 'search-ms', 'ms-cxh', 'ms-cxh-full', 'shell', 'vscode',
  'vscode-insiders', 'jar'])

export function checkUrl(url) {
  const probe = url.replace(/[\x00-\x20\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]+/g, '')
  const m = /^([a-zA-Z][a-zA-Z0-9+.-]*):/.exec(probe)
  if (m && DENY.has(m[1].toLowerCase())) return ''
  return url
}

// ---------------------------------------------------------------------------
// Inline semantics
function spanOp(tag) {
  return function (_open, inner, _close) {
    return `<${tag}>${inner.children.map((c) => c.h()).join('')}</${tag}>`
  }
}
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
    return items.children.map((c) => c.h()).join('')
  },
  boldItalic(_o, inner, _c) {
    return `<strong><em>${inner.children.map((c) => c.h()).join('')}</em></strong>`
  },
  emph: spanOp('em'),
  strong: spanOp('strong'),
  underline: spanOp('u'),
  strike: spanOp('s'),
  sup: spanOp('sup'),
  sub: spanOp('sub'),
  highlight: spanOp('mark'),
  code1: codeOp,
  code2: codeOp,
  code3: codeOp,
  mathI(_d, code) {
    // `code` is the alternation node; its sole child is codeN(_o,content,_c)
    return `<span class="math inline">\\(${escapeHtml(codeText(code.child(0).child(1)))}\\)</span>`
  },
  mathD(_d, code) {
    return `<span class="math display">\\[${escapeHtml(codeText(code.child(0).child(1)))}\\]</span>`
  },
  crossref(_o, id, _c) {
    return `xref:${id.sourceString}`
  },
  footnoteRef(_o, label, _c) {
    return `fn:${label.sourceString}`
  },
  inlineNote(_o, content, _c) {
    throw new Refuse('inline footnote (out of the executable subset)')
  },
  bracketed(_o, content, _c, tail) {
    // link text is FULL inline content; parse the raw source recursively
    const raw = content.sourceString
    let inner = raw === '' ? '' : renderInline(raw)
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
    return `<img src="${escapeAttr(checkUrl(dest.sourceString))}" alt="${escapeAttr(alt.sourceString)}"${t}${a}>`
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
    return `<a href="${escapeAttr(checkUrl(dest.sourceString))}"${t}${a}>${text}</a>`
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
})

sem.addOperation('titleText', {
  destTitle(_sp, q) {
    return q.parseAttrs() // quoted -> unescaped string
  },
})
// reuse parseAttrs for quoted strings
for (const op of ['parseAttrs']) {
  // attrSem already defines quoted; merge by extending sem
}
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

// --- PART 9 SS9 E1-E5 delimiter-stack pre-scan -----------------------------
// A PEG's ordered choice resolves emphasis by nesting, not by the spec's
// close-first-wins rule. The two agree UNLESS a closer matches a non-top
// stack entry (E2 demotion, i.e. overlapping candidate spans). Detect that
// case with a faithful mini stack-scan and REFUSE it - the executable spec
// never silently diverges from the delimiter-stack semantics.
const DELIMS = new Set(['/', '*', '_', '~', '^', '=', ','])
const isWordCh = (c) => c !== undefined && /[\p{L}\p{N}]/u.test(c)
const isWs = (c) => c === undefined || /\s/.test(c)

function overlapScan(text) {
  const stack = []
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (c === '\\') {
      i++
      continue
    }
    if (c === '`') {
      // skip a verbatim span (equal-run close)
      let run = 1
      while (text[i + run] === '`') run++
      const close = text.indexOf('`'.repeat(run), i + run)
      i = close === -1 ? text.length : close + run - 1
      continue
    }
    if (!DELIMS.has(c)) continue
    const prev = text[i - 1]
    const next = text[i + 1]
    if (prev === c || next === c) continue // same-delimiter adjacency: literal
    const canOpen = !isWs(next) && !isWordCh(prev) && prev !== '_'
    const canClose = !isWs(prev) && !isWordCh(next)
    const top = stack.length ? stack[stack.length - 1] : null
    const idx = stack.lastIndexOf(c)
    if (canClose && idx !== -1) {
      if (idx !== stack.length - 1) return true // E2 demotion -> overlap
      stack.pop()
      continue
    }
    if (canOpen && !stack.includes(c)) stack.push(c) // E3: no same-type nesting
  }
  return false
}

export function renderInline(text) {
  if (overlapScan(text)) throw new Refuse('overlapping emphasis (delimiter-stack close-first rule)')
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
    else if (/^[0-9]/.test(slug)) slug = `s-${slug}`
    const n = seen.get(slug) ?? 0
    seen.set(slug, n + 1)
    return n === 0 ? slug : `${slug}-${n + 1}`
  }
}
