/*
 * Executable PART 10 (block serialization) + PART 9R (resolution passes)
 * over the layout tree. Byte-parity with the conformance corpus is the
 * contract; anything the subset cannot render faithfully throws Refuse.
 */

import { Refuse } from './layout.mjs'
import { renderInline, makeSlugger, checkUrl, escapeAttr } from './render.mjs'

const IMG_ONLY = /^<img [^>]*>$/

export function renderDoc(doc) {
  const ctx = {
    slug: makeSlugger(),
    linkDefs: doc.linkDefs,
    abbrDefs: doc.abbrDefs,
    footnoteDefs: doc.footnoteDefs,
    headingIds: new Map(), // lower-cased slug -> { id, html }
  }
  const out = []
  const sections = []
  const indent = () => '  '.repeat(sections.length)

  for (const b of doc.blocks) {
    if (b.t === 'heading') {
      const html = renderInline(b.text)
      while (sections.length && sections[sections.length - 1] >= b.level) {
        sections.pop()
        out.push(`${indent()}</section>`)
      }
      const id = ctx.slug(b.text)
      ctx.headingIds.set(id.toLowerCase(), { id, html })
      out.push(`${indent()}<section id="${id}">`)
      sections.push(b.level)
      out.push(`${indent()}<h${b.level}>${html}</h${b.level}>`)
    } else {
      out.push(renderBlock(b, sections.length, ctx))
    }
  }
  while (sections.length) {
    sections.pop()
    out.push(`${indent()}</section>`)
  }

  let html = out.join('\n')
  html = resolveFootnotes(html, ctx) // first: bodies may add ref/xref sentinels
  html = resolveRefs(html, ctx)
  html = resolveCrossrefs(html, ctx)
  html = applyAbbreviations(html, ctx)
  return html
}

function renderBlock(b, depth, ctx) {
  const pad = '  '.repeat(depth)
  switch (b.t) {
    case 'para': {
      const html = b.lines.map((l) => renderInline(l)).join('\n')
      if (b.lines.length === 1 && IMG_ONLY.test(html)) {
        // a standalone image paragraph renders as a bare <img> (PART 10)
        if (b.caption !== undefined) {
          return `${pad}<figure>\n${pad}  ${html}\n${pad}  <figcaption>${renderInline(b.caption)}</figcaption>\n${pad}</figure>`
        }
        return pad + html
      }
      if (b.caption !== undefined) throw new Refuse('caption on a text paragraph')
      return `${pad}<p>${html}</p>`
    }
    case 'hr':
      return `${pad}<hr>`
    case 'code': {
      const cls = b.lang ? ` class="language-${b.lang}"` : ''
      const esc = b.text
        .replace(/[‪-‮⁦-⁩]/g, '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
      return `${pad}<pre><code${cls}>${esc}</code></pre>`
    }
    case 'quote': {
      const inner = b.children.map((c) => renderBlock(c, depth + 1, ctx)).join('\n')
      if (b.caption !== undefined) {
        // single-paragraph attribution form pins the compact figure layout
        if (b.children.length === 1 && b.children[0].t === 'para') {
          const p = renderBlock(b.children[0], 0, ctx)
          return `${pad}<figure>\n${pad}  <blockquote>${p}</blockquote>\n${pad}  <figcaption>${renderInline(b.caption)}</figcaption>\n${pad}</figure>`
        }
        throw new Refuse('captioned multi-block quote')
      }
      if (b.children.length === 1 && b.children[0].t === 'para') {
        const p = renderBlock(b.children[0], 0, ctx)
        return `${pad}<blockquote>${p}</blockquote>`
      }
      return `${pad}<blockquote>\n${inner}\n${pad}</blockquote>`
    }
    case 'list':
      return renderList(b, depth, ctx)
    default:
      throw new Refuse(`unknown block ${b.t}`)
  }
}

function renderList(list, depth, ctx) {
  const pad = '  '.repeat(depth)
  let tag = 'ul'
  let attrs = ''
  if (list.ord) {
    tag = 'ol'
    if (list.ord.type) attrs += ` type="${list.ord.type}"`
    if (list.ord.start) attrs += ` start="${list.ord.start}"`
  }
  const items = list.items.map((item) => renderItem(item, list, depth + 1, ctx))
  return `${pad}<${tag}${attrs}>\n${items.join('\n')}\n${pad}</${tag}>`
}

function renderItem(item, list, depth, ctx) {
  const pad = '  '.repeat(depth)
  const prefix = list.task
    ? `<input type="checkbox"${item.checked ? ' checked' : ''} disabled> `
    : ''
  const blocks = item.blocks
  if (blocks.length === 0) return `${pad}<li></li>`

  const parts = []
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i]
    if (b.t === 'para') {
      const html = b.lines.map((l) => renderInline(l)).join('\n')
      parts.push({ inlineable: true, html: list.tight ? html : `<p>${html}</p>` })
    } else {
      parts.push({ inlineable: false, html: renderBlock(b, depth + 1, ctx) })
    }
  }

  // <li> + first block on the same line; further blocks indented; the
  // closing </li> stays inline for a single-inline item, else on its own
  // line at the li indent (corpus 05-lists-4, 103-marker-line-nested-lists)
  const first = parts[0]
  if (parts.length === 1 && first.inlineable) {
    return `${pad}<li>${prefix}${first.html}</li>`
  }
  let out
  if (first.inlineable) {
    out = `${pad}<li>${prefix}${first.html}`
  } else {
    out = `${pad}<li>\n${first.html}`
  }
  for (let i = 1; i < parts.length; i++) {
    const p = parts[i]
    out += '\n' + (p.inlineable ? `${'  '.repeat(depth + 1)}${p.html}` : p.html)
  }
  out += `\n${pad}</li>`
  return out
}

// --- PART 9R R1: reference links --------------------------------------------
function resolveRefs(html, ctx) {
  return html.replace(/ref:(\{.*?\})/g, (_, json) => {
    const { label, text, attrs } = JSON.parse(json)
    const key = label ?? stripTags(text)
    const def = ctx.linkDefs.get(key)
    if (!def) throw new Refuse(`unresolved reference [${key}]`)
    const t = def.title ? ` title="${escapeAttr(def.title)}"` : ''
    return `<a href="${escapeAttr(checkUrl(def.url))}"${t}${attrs}>${text}</a>`
  })
}

function stripTags(s) {
  return s.replace(/<[^>]*>/g, '')
}

// --- PART 9R R2: footnotes ---------------------------------------------------
function resolveFootnotes(html, ctx) {
  const order = [] // labels by first reference
  const counts = new Map()
  html = html.replace(/fn:(.*?)/g, (_, label) => {
    if (!ctx.footnoteDefs.has(label)) return `[^${label}]` // unresolved -> literal
    let n = order.indexOf(label) + 1
    if (n === 0) {
      order.push(label)
      n = order.length
    }
    const k = (counts.get(label) ?? 0) + 1
    counts.set(label, k)
    const refId = k === 1 ? `fnref${n}` : `fnref${n}-${k}`
    return `<a id="${refId}" href="#fn${n}" role="doc-noteref"><sup>${n}</sup></a>`
  })
  if (order.length === 0) return html

  const notes = order.map((label, idx) => {
    const n = idx + 1
    const body = ctx.footnoteDefs.get(label)
    let rendered = body
      .map((b) => renderBlock(b, 3, ctx))
      .join('\n')
    // backlink into the LAST paragraph (PART 9 SS16); a k-th repeat
    // reference adds an indexed backlink `↩<sup>k</sup>`
    const total = counts.get(label) ?? 1
    const backlink = total === 1
      ? `<a href="#fnref${n}" role="doc-backlink">↩</a>`
      : Array.from({ length: total }, (_, kk) => {
          const refId = kk === 0 ? `fnref${n}` : `fnref${n}-${kk + 1}`
          return `<a href="#${refId}" role="doc-backlink">↩<sup>${kk + 1}</sup></a>`
        }).join(' ')
    if (rendered.endsWith('</p>')) {
      rendered = rendered.slice(0, -4) + backlink + '</p>'
    } else {
      rendered += `\n      <p>${backlink}</p>`
    }
    return `    <li id="fn${n}">\n${rendered}\n    </li>`
  })
  return (
    html +
    `\n<section role="doc-endnotes">\n  <hr>\n  <ol>\n${notes.join('\n')}\n  </ol>\n</section>`
  )
}

// --- PART 9R R4: crossrefs ---------------------------------------------------
function resolveCrossrefs(html, ctx) {
  return html.replace(/xref(text)?:(.*?)/g, (_, textOnly, id) => {
    const hit = ctx.headingIds.get(id.toLowerCase())
    if (!hit) throw new Refuse(`unresolved crossref </#${id}>`)
    // one-level resolution: nested sentinels in the cloned text flatten to
    // their literal source (PART 9R R4)
    const text = hit.html.replace(/xref(?:text)?:(.*?)/g, '</#$1>')
    return textOnly ? text : `<a href="#${hit.id}">${text}</a>`
  })
}

// --- PART 9R R3: abbreviations ----------------------------------------------
function applyAbbreviations(html, ctx) {
  if (ctx.abbrDefs.size === 0) return html
  // transform only text segments outside tags and outside code/pre
  const parts = html.split(/(<[^>]*>)/)
  let inCode = 0
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i]
    if (p.startsWith('<')) {
      if (/^<(code|pre)[\s>]/.test(p)) inCode++
      else if (/^<\/(code|pre)>/.test(p)) inCode--
      continue
    }
    if (inCode > 0 || p === '') continue
    let s = p
    for (const [term, expansion] of ctx.abbrDefs) {
      const re = new RegExp(`(^|[^\\p{L}\\p{N}])(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})(?![\\p{L}\\p{N}])`, 'gu')
      s = s.replace(re, (_, pre, hit) => `${pre}<abbr title="${expansion.replaceAll('"', '&quot;')}">${hit}</abbr>`)
    }
    parts[i] = s
  }
  return parts.join('')
}
