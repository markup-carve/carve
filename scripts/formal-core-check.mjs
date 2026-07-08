/*
 * Formal-core conformance gate.
 *
 * Loads the executable Core grammar (resources/carve-core.ohm) and runs it
 * over every pair in tests/corpus:
 *   - NO-PARSE      -> the input uses non-Core constructs; out of scope.
 *   - MATCH + SAME  -> Core-conformant: the pure grammar parses it and the
 *                      derived HTML equals the pinned corpus output.
 *   - MATCH + DIFF  -> a defect: the Core grammar claims an input it cannot
 *                      render faithfully. The gate FAILS on any of these.
 *
 * The one semantic predicate a PEG cannot state (fence closer length >=
 * opener length; the `where` guard in grammar.ebnf) is asserted here in
 * code, checked BEFORE the grammar verdict is trusted.
 *
 * Usage: node scripts/formal-core-check.mjs [--list]
 * Requires: npm i -D ohm-js
 */

import { readFileSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as ohm from 'ohm-js'

const here = dirname(fileURLToPath(import.meta.url))
const repo = resolve(here, '..')
const grammarSrc = readFileSync(resolve(repo, 'resources/carve-core.ohm'), 'utf8')
const g = ohm.grammar(grammarSrc)

// ---------------------------------------------------------------------------
// Semantic predicate: fence closer length >= opener length (grammar.ebnf
// code_fence_close `where` guard). A PEG cannot count across tokens; if this
// fails the input is treated as NO-PARSE (the grammar over-accepts it).
function fenceLengthsOk(src) {
  const lines = src.split('\n')
  let open = null // { ch, len }
  for (const line of lines) {
    const m = /^(`{3,}|~{3,})/.exec(line)
    if (!m) continue
    const run = m[1]
    if (!open) {
      open = { ch: run[0], len: run.length }
    } else if (run[0] === open.ch) {
      if (run.length < open.len) return false
      open = null
    }
  }
  return true
}

// ---------------------------------------------------------------------------
// Renderer: byte-parity with the corpus HTML for the Core subset.
const escapeHtml = (s) =>
  s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')

// Heading slug per grammar.ebnf PART 2 HEADING IDENTIFIERS (Core subset:
// no smart-typography reversal needed - those chars are out of Core).
function makeSlugger() {
  const seen = new Map()
  let anon = 0
  return (text) => {
    let slug = text
      .replace(/[\x00-\x2f\x3a-\x40\x5b-\x60\x7b-\x7e\s]+/g, '-')
      .replace(/^-+|-+$/g, '')
    if (slug === '') slug = `s-${++anon}`
    else if (/^[0-9]/.test(slug)) slug = `s-${slug}`
    const n = seen.get(slug) ?? 0
    seen.set(slug, n + 1)
    return n === 0 ? slug : `${slug}-${n + 1}`
  }
}

const TAG = { emph: 'em', strong: 'strong', underline: 'u', strike: 's', sup: 'sup', sub: 'sub', highlight: 'mark' }

function spanOp(tag) {
  return function (_open, inner, _close) {
    return `<${tag}>${inner.children.map((c) => c.h()).join('')}</${tag}>`
  }
}

function codeOp(_o, content, _c) {
  let text = content.sourceString
  // single-space strip (code_span rule): one leading AND trailing space,
  // content not all spaces
  if (/^ .* $/.test(text) && text.trim() !== '') text = text.slice(1, -1)
  return `<code>${escapeHtml(text)}</code>`
}

const sem = g.createSemantics().addOperation('h', {
  heading(hashes, _sp, inl, _end) {
    const level = hashes.sourceString.length
    const html = inl.children.map((c) => c.h()).join('')
    const text = inl.sourceString
    return { kind: 'heading', level, html, text }
  },
  paragraph(lines) {
    return { kind: 'p', html: lines.children.map((c) => c.h()).join('\n') }
  },
  paraLine(inl, _end) {
    return inl.children.map((c) => c.h()).join('')
  },
  thematicBreak(_m, _r, _end) {
    return { kind: 'hr' }
  },
  backtickFence(_o, lang, _nl, body, _c) {
    return codeBlockNode(lang, body)
  },
  tildeFence(_o, lang, _nl, body, _c) {
    return codeBlockNode(lang, body)
  },
  blankLine(_s, _n) {
    return { kind: 'blank' }
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
  escape(_bs, ch) {
    return escapeHtml(ch.sourceString)
  },
  wordGlue(d, _la) {
    return d.sourceString
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

function codeBlockNode(lang, body) {
  const language = lang.sourceString.trim()
  const text = body.children.map((c) => c.sourceString).join('')
  return { kind: 'code', language, html: escapeHtml(text) }
}

function render(match) {
  const blocks = sem(match)
    .h()
    .filter((b) => b.kind !== 'blank')
  const out = []
  const sections = [] // open heading levels
  const slug = makeSlugger()
  const indent = () => '  '.repeat(sections.length)
  for (const b of blocks) {
    if (b.kind === 'heading') {
      while (sections.length && sections[sections.length - 1] >= b.level) {
        sections.pop()
        out.push(`${indent()}</section>`)
      }
      out.push(`${indent()}<section id="${slug(b.text)}">`)
      sections.push(b.level)
      out.push(`${indent()}<h${b.level}>${b.html}</h${b.level}>`)
    } else if (b.kind === 'p') {
      out.push(`${indent()}<p>${b.html}</p>`)
    } else if (b.kind === 'hr') {
      out.push(`${indent()}<hr>`)
    } else if (b.kind === 'code') {
      const cls = b.language ? ` class="language-${b.language}"` : ''
      out.push(`${indent()}<pre><code${cls}>${b.html}</code></pre>`)
    }
  }
  while (sections.length) {
    sections.pop()
    out.push(`${indent()}</section>`)
  }
  return out.join('\n')
}

// ---------------------------------------------------------------------------
const corpusDir = resolve(repo, 'tests/corpus')
const inputs = readdirSync(corpusDir)
  .filter((f) => f.endsWith('.crv'))
  .sort()

const listMode = process.argv.includes('--list')
let core = 0
const diffs = []
const noParse = []

for (const f of inputs) {
  const src = readFileSync(resolve(corpusDir, f), 'utf8')
  const expected = readFileSync(resolve(corpusDir, f.replace(/\.crv$/, '.html')), 'utf8').replace(/\n$/, '')
  if (!fenceLengthsOk(src)) {
    noParse.push(f)
    continue
  }
  const m = g.match(src)
  if (m.failed()) {
    noParse.push(f)
    continue
  }
  const got = render(m)
  if (got === expected) {
    core++
    if (listMode) console.log(`CORE  ${f}`)
  } else {
    diffs.push({ f, got, expected })
  }
}

console.log(`\ncorpus inputs:        ${inputs.length}`)
console.log(`core (parse + byte-match): ${core}`)
console.log(`out of Core (no parse):    ${noParse.length}`)
console.log(`DEFECTS (parse but diff):  ${diffs.length}`)
for (const d of diffs) {
  console.log(`\n--- ${d.f}`)
  console.log(`expected:\n${d.expected}`)
  console.log(`got:\n${d.got}`)
}
process.exit(diffs.length ? 1 : 0)
