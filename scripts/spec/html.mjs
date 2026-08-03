/*
 * Executable PART 10 (block serialization) + PART 9R (resolution passes)
 * over the layout tree. Byte-parity with the conformance corpus is the
 * contract; anything the subset cannot render faithfully throws Refuse.
 */

import { Refuse, TIER1 } from './layout.mjs'
import { renderInline, makeSlugger, checkUrl, escapeAttr, parseAttrBlock, renderBlockAttrs } from './render.mjs'

const IMG_ONLY = /^<img [^>]*>$/

export function renderDoc(doc) {
  const ctx = {
    slug: makeSlugger(),
    linkDefs: doc.linkDefs,
    abbrDefs: doc.abbrDefs,
    footnoteDefs: doc.footnoteDefs,
    headingIds: new Map(), // lower-cased slug -> { id, html }
    // PART 11 R1 implicit heading fallback: normalized rendered TEXT -> id.
    // Separate from headingIds, which is keyed by slug and serves `</#id>`.
    headingRefs: new Map(),
    // True while rendering inside a blockquote. R1 declines a heading with a
    // blockquote ancestor from the reference index (in either nesting order),
    // while still slugging it and keeping it a crossref target.
    inBlockquote: false,
    captionSeq: new Map(), // caption label word -> counter (R5)
    captionIds: new Map(), // lower-cased id -> "Label N" (R4)
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
      // an explicit {#id} from a preceding attribute line lands on the
      // <section> (PART 9 SS13/SS15); remaining attrs go on the <h*>
      let id = null
      let hAttrs = ''
      if (b.battrs) {
        const rest = []
        for (const list of b.battrs) {
          const keep = []
          for (const a of list) {
            if (a[0] === 'id') id = a[1]
            else keep.push(a)
          }
          if (keep.length) rest.push(keep)
        }
        hAttrs = renderBlockAttrs(rest)
      }
      if (id === null) id = ctx.slug(b.text.replace(/<\/#[^>]*>/g, '').replace(/[ \t]+$/, ''))
      ctx.headingIds.set(id.toLowerCase(), { id, html })
      noteHeadingRef(ctx, html, id)
      out.push(`${indent()}<section id="${escapeAttr(id)}">`)
      sections.push(b.level)
      out.push(`${indent()}<h${b.level}${hAttrs}>${html}</h${b.level}>`)
    } else {
      const r = renderBlock(b, sections.length, ctx)
      if (r !== null) out.push(r)
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

/**
 * One line of a line block (PART 9 SS23).
 *
 * Leading whitespace is preserved down to a single column; an inner or trailing
 * run of TWO OR MORE columns is a medial gap and is preserved too. A lone inner
 * space stays an ordinary collapsible space so a long line can still wrap
 * between words. Preserved columns serialize as `&nbsp;`; a tab advances to the
 * next multiple of four, counted from the column its run starts at (SS24 C1).
 */
function renderLineBlockLine(line) {
  let out = ''
  let text = ''
  let i = 0
  let column = 0
  let seenContent = false
  const flush = () => {
    if (text !== '') out += renderInline(text)
    text = ''
  }
  while (i < line.length) {
    const ch = line[i]
    if (ch !== ' ' && ch !== '\t') {
      text += ch
      seenContent = true
      column++
      i++
      continue
    }
    let width = 0
    while (i < line.length && (line[i] === ' ' || line[i] === '\t')) {
      width += line[i] === '\t' ? 4 - ((column + width) % 4) : 1
      i++
    }
    column += width
    if (!seenContent || width >= 2) {
      flush()
      out += '&nbsp;'.repeat(width)
    } else {
      text += ' '
    }
  }
  flush()
  return out
}

function renderBlock(b, depth, ctx) {
  const pad = '  '.repeat(depth)
  const ba = b.battrs ? renderBlockAttrs(b.battrs) : ''
  switch (b.t) {
    case 'para': {
      const html = renderInline(b.lines.join('\n'))
      if (b.lines.length === 1 && IMG_ONLY.test(html)) {
        // a standalone image paragraph renders as a bare <img> (PART 10)
        if (b.caption !== undefined) {
          const id = / id="([^"]*)"/.exec(ba)?.[1]
          const cap = numberCaption(b.caption, ctx, id)
          return `${pad}<figure${ba}>\n${pad}  ${html}\n${pad}  <figcaption>${renderInline(cap)}</figcaption>\n${pad}</figure>`
        }
        return pad + (ba ? html.replace('<img ', `<img${ba} `.replace(/ $/, ' ')) : html)
      }
      if (b.caption !== undefined) {
        const id = / id="([^"]*)"/.exec(ba)?.[1]
        const cap = numberCaption(b.caption, ctx, id)
        return `${pad}<figure${ba}>\n${pad}  <p>${html}</p>\n${pad}  <figcaption>${renderInline(cap)}</figcaption>\n${pad}</figure>`
      }
      return `${pad}<p${ba}>${html}</p>`
    }
    case 'hr':
      return `${pad}<hr${ba}>`
    case 'code': {
      const cls = b.lang ? ` class="language-${b.lang}"` : ''
      const title = b.title != null && !/ title="/.test(ba) ? ` title="${escapeAttr(b.title)}"` : ''
      if (b.caption !== undefined) {
        const id = / id="([^"]*)"/.exec(ba)?.[1]
        const cap = numberCaption(b.caption, ctx, id)
        const esc0 = b.text
          .replace(/[\u202A-\u202E\u2066-\u2069\uE000\uE001\u0002]/g, '')
          .replaceAll('&', '&amp;')
          .replaceAll('<', '&lt;')
          .replaceAll('>', '&gt;')
        return `${pad}<figure${ba}>\n${pad}  <pre${title}><code${cls}>${esc0}</code></pre>\n${pad}  <figcaption>${renderInline(cap)}</figcaption>\n${pad}</figure>`
      }
      const esc = b.text
        .replace(/[‪-‮⁦-⁩]/g, '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
      return `${pad}<pre${title}${ba}><code${cls}>${esc}</code></pre>`
    }
    case 'quote': {
      // Depth-first and synchronous, so a saved/restored flag is a stack.
      const wasInBlockquote = ctx.inBlockquote
      ctx.inBlockquote = true
      const inner = (() => {
        try {
          return b.children.map((c) => renderBlock(c, depth + 1, ctx)).filter((x) => x !== null).join('\n')
        } finally {
          ctx.inBlockquote = wasInBlockquote
        }
      })()
      if (b.caption !== undefined) {
        // single-paragraph attribution form pins the compact figure layout
        if (b.children.length === 1 && b.children[0].t === 'para') {
          const p = renderBlock(b.children[0], 0, ctx)
          return `${pad}<figure${ba}>\n${pad}  <blockquote>${p}</blockquote>\n${pad}  <figcaption>${renderInline(b.caption)}</figcaption>\n${pad}</figure>`
        }
        throw new Refuse('captioned multi-block quote')
      }
      if (b.children.length === 1 && b.children[0].t === 'para') {
        const p = renderBlock(b.children[0], 0, ctx)
        return `${pad}<blockquote${ba}>${p}</blockquote>`
      }
      return `${pad}<blockquote${ba}>\n${inner}\n${pad}</blockquote>`
    }
    case 'list':
      return renderList(b, depth, ctx)
    case 'table':
      return renderTable(b, depth, ctx)
    case 'colon-div': {
      const pad2 = '  '.repeat(depth)
      const tag = b.type !== null && TIER1.has(b.type) ? 'aside' : 'div'
      let attrStr
      if (b.type === null) {
        // generic div: attribute-line attrs apply verbatim in SOURCE order
        attrStr = b.battrs ? renderBlockAttrs(b.battrs) : ''
      } else {
        // typed block: the type class leads; attribute-line classes merge
        // into it, everything else follows in source order (PART 9 SS15)
        const baseCls = TIER1.has(b.type) ? ['admonition', b.type] : [b.type]
        const extra = []
        const rest = []
        for (const list of b.battrs ?? []) {
          const keep = []
          for (const a of list) {
            if (a[0] === 'class') extra.push(a[1])
            else keep.push(a)
          }
          if (keep.length) rest.push(keep)
        }
        attrStr = ` class="${[...baseCls, ...extra].join(' ')}"` + renderBlockAttrs(rest)
      }
      const open = `${pad2}<${tag}${attrStr}>`
      const closeTag = `</${tag}>`
      const parts = []
      if (b.title !== null) parts.push(`${pad2}  <p class="admonition-title">${renderInline(b.title)}</p>`)
      if (b.label !== null) parts.push(`${pad2}  <p class="div-label">${renderInline(b.label)}</p>`)
      for (const c of b.children) parts.push(renderBlock(c, depth + 1, ctx))
      if (parts.length === 0) {
        // empty body: a bare div collapses to one line break; a typed block
        // keeps its empty body line (both corpus/oracle-pinned)
        if (b.type === null) return `${open}\n${pad2}${closeTag}`
        return `${open}\n\n${pad2}${closeTag}`
      }
      return `${open}\n${parts.join('\n')}\n${pad2}${closeTag}`
    }
    case 'line-block': {
      const pad2 = '  '.repeat(depth)
      // stanzas split on blank lines; soft breaks harden; leading spaces
      // serialize as NBSP entities (PART 9 SS23)
      const stanzas = []
      let cur = []
      for (const l of b.lines) {
        if (/^[ \t]*$/.test(l)) {
          if (cur.length) stanzas.push(cur)
          cur = []
        } else cur.push(l)
      }
      if (cur.length) stanzas.push(cur)
      const ps = stanzas.map((st) => {
        const rendered = st.map((l) => renderLineBlockLine(l))
        return `${pad2}  <p>${rendered.join('<br>\n')}</p>`
      })
      return `${pad2}<div class="line-block">\n${ps.join('\n')}\n${pad2}</div>`
    }
    case 'hardbreaks': {
      const pad2 = '  '.repeat(depth)
      // direct paragraph children harden their soft breaks; nested blocks
      // keep normal behavior (PART 9 SS23)
      const parts = b.children.map((c) => {
        if (c.t === 'para') {
          const html = renderInline(c.lines.join('\n')).replaceAll('\n', '<br>\n')
          return `${'  '.repeat(depth + 1)}<p>${html}</p>`
        }
        return renderBlock(c, depth + 1, ctx)
      })
      if (parts.length === 0) return `${pad2}<div class="hardbreaks"></div>`
      return `${pad2}<div class="hardbreaks">\n${parts.join('\n')}\n${pad2}</div>`
    }
    case 'deflist': {
      const rows = b.items.map((it) => {
        if (it.dt !== undefined) return `${pad}  <dt>${renderInline(it.dt)}</dt>`
        const blocks = it.ddBlocks
        if (blocks.length === 0) return `${pad}  <dd></dd>`
        // a single paragraph stays tight (inline <dd>); anything more is a loose
        // multi-block <dd> with each block on its own indented line.
        if (blocks.length === 1 && blocks[0].t === 'para' && blocks[0].caption === undefined) {
          return `${pad}  <dd>${renderInline(blocks[0].lines.join('\n'))}</dd>`
        }
        const inner = blocks.map((c) => renderBlock(c, depth + 2, ctx)).filter((x) => x !== null).join('\n')
        return `${pad}  <dd>\n${inner}\n${pad}  </dd>`
      })
      return `${pad}<dl>\n${rows.join('\n')}\n${pad}</dl>`
    }
    case 'raw':
      // PART 9 SS20: verbatim for the html target, dropped otherwise
      return b.format === 'html' ? b.text.split('\n').map((l) => pad + l).join('\n') : null
    case 'heading': {
      // a heading inside a container: no section wrapper (SS13 wraps
      // top-level headings only); the id lands on the <h*> itself
      const html = renderInline(b.text)
      // PART 10 SS1: the author's own attributes keep their source order,
      // and a GENERATED attribute joins at the end. So an authored {#id}
      // renders in place through renderBlockAttrs, while an auto slug is
      // appended after everything the author wrote.
      let authored = null
      for (const list of b.battrs ?? []) {
        for (const a of list) if (a[0] === 'id') authored = a[1]
      }
      const attrStr = b.battrs ? renderBlockAttrs(b.battrs) : ''
      const id =
        authored ?? ctx.slug(b.text.replace(/<\/#[^>]*>/g, '').replace(/[ \t]+$/, ''))
      ctx.headingIds.set(id.toLowerCase(), { id, html })
      noteHeadingRef(ctx, html, id)
      const idAttr = authored === null ? ` id="${escapeAttr(id)}"` : ''
      return `${pad}<h${b.level}${attrStr}${idAttr}>${html}</h${b.level}>`
    }
    case 'footnotes-placement':
      return '\uE000fnplacement\uE001'
    default:
      throw new Refuse(`unknown block ${b.t}`)
  }
}

function renderList(list, depth, ctx) {
  const pad = '  '.repeat(depth)
  let tag = 'ul'
  let attrs = list.battrs ? renderBlockAttrs(list.battrs) : ''
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
  let liAttrs = ''
  if (item.attrs) {
    const parsed = parseAttrBlock(item.attrs)
    if (parsed === null) throw new Refuse('invalid list-item attribute block')
    liAttrs = parsed
  }
  const prefix = list.task
    ? `<input type="checkbox"${item.checked ? ' checked' : ''} disabled> `
    : ''
  const blocks = item.blocks
  if (blocks.length === 0) return `${pad}<li${liAttrs}></li>`

  const parts = []
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i]
    if (b.t === 'para') {
      // render the whole paragraph in one inline pass (lines joined by soft
      // breaks) so an inline construct spanning a soft break -- e.g. a
      // multi-line `` ``` ``-run folded in as lazy text -- is one span, not one
      // per line. Matches the top-level para path in renderBlock.
      const html = renderInline(b.lines.join('\n'))
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
    return `${pad}<li${liAttrs}>${prefix}${first.html}</li>`
  }
  let out
  if (first.inlineable) {
    out = `${pad}<li${liAttrs}>${prefix}${first.html}`
  } else {
    out = `${pad}<li${liAttrs}>\n${first.html}`
  }
  for (let i = 1; i < parts.length; i++) {
    const p = parts[i]
    out += '\n' + (p.inlineable ? `${'  '.repeat(depth + 1)}${p.html}` : p.html)
  }
  out += `\n${pad}</li>`
  return out
}

// PART 9R R5: the FIRST bare `#` in a caption's top-level text is a number
// placeholder; each label word draws from its own sequence. An id on the
// captioned block registers the "Label N" text for crossrefs (R4).
function numberCaption(text, ctx, id) {
  const m = /^(\S+)([^#]*?)(?<!\\)#(?=[\s:.]|$)/.exec(text)
  if (!m) return text
  const label = m[1]
  const n = (ctx.captionSeq.get(label) ?? 0) + 1
  ctx.captionSeq.set(label, n)
  if (id) ctx.captionIds.set(id.toLowerCase(), `${label} ${n}`)
  return text.replace(/(?<!\\)#(?=[\s:.]|$)/, String(n))
}

// --- tables: PART 9 SS5 T5 span walk + serialization -------------------------
function renderTable(node, depth, ctx) {
  const pad = '  '.repeat(depth)
  const ba = node.battrs ? renderBlockAttrs(node.battrs) : ''
  const rows = node.rows
  // resolve span markers (T5): row-major; consumed positions are skipped in
  // the output; a marker with no reachable origin renders as an EMPTY cell
  const consumed = new Set()
  const key = (r, c) => `${r}:${c}`
  for (let r = 0; r < rows.length; r++) {
    const cells = rows[r].cells
    for (let c = 0; c < cells.length; c++) {
      const cell = cells[c]
      if (consumed.has(key(r, c))) continue
      if (cell.content === '<' && cell.align === null) {
        let cc = c - 1
        while (cc >= 0 && consumed.has(key(r, cc))) cc--
        if (cc >= 0 && rows[r].cells[cc] !== undefined) {
          const origin = rows[r].cells[cc]
          origin.colspan = (origin.colspan ?? 1) + 1
          consumed.add(key(r, c))
          for (const jn of cell.joins ?? []) origin.content += (origin.content ? ' ' : '') + jn
        } else {
          cell.content = ''
          cell.empty = true
        }
      } else if (cell.content === '^' && cell.align === null) {
        let rr = r - 1
        while (rr >= 0 && consumed.has(key(rr, c))) rr--
        if (rr >= 0 && rows[rr].cells[c] !== undefined) {
          const origin = rows[rr].cells[c]
          origin.rowspan = (origin.rowspan ?? 1) + 1
          consumed.add(key(r, c))
          for (const jn of cell.joins ?? []) origin.content += (origin.content ? ' ' : '') + jn
        } else {
          cell.content = ''
          cell.empty = true
        }
      }
    }
  }
  // column alignment: from the thead row's cells (native marker or GFM)
  const colAlign = []
  if (rows[0]?.isHead) {
    rows[0].cells.forEach((c, ci) => (colAlign[ci] = c.align ?? null))
  }
  let headCount = 0
  while (headCount < rows.length && rows[headCount].isHead) headCount++
  const renderCell = (cell, r, c) => {
    const tag = cell.header ? 'th' : 'td'
    let a = ''
    if (cell.rowspan) a += ` rowspan="${cell.rowspan}"`
    if (cell.colspan) a += ` colspan="${cell.colspan}"`
    if (cell.attrs) {
      const parsed = parseAttrBlock(cell.attrs)
      if (parsed === null) throw new Refuse('invalid cell attribute block')
      a += parsed
    }
    const align = cell.empty ? null : (cell.align ?? colAlign[c] ?? null)
    if (align) a += ` style="text-align: ${align};"`
    const content = cell.empty || cell.content === '' ? '' : renderInline(cell.content)
    return `<${tag}${a}>${content}</${tag}>`
  }
  const renderRow = (row, r) => {
    let ra = ''
    if (row.rowAttrs) {
      const parsed = parseAttrBlock(row.rowAttrs)
      if (parsed === null) throw new Refuse('invalid row attribute block')
      ra = parsed
    }
    const cells = row.cells
      .map((cell, c) => (consumed.has(key(r, c)) ? null : renderCell(cell, r, c)))
      .filter((x) => x !== null)
      .join('')
    return `<tr${ra}>${cells}</tr>`
  }
  const out = [`${pad}<table${ba}>`]
  if (node.caption !== undefined) {
    const id = / id="([^"]*)"/.exec(ba)?.[1]
    out.push(`${pad}  <caption>${renderInline(numberCaption(node.caption, ctx, id))}</caption>`)
  }
  const bodyStart = headCount
  if (headCount > 0) {
    const headRows = rows.slice(0, headCount).map((row, r) => renderRow(row, r)).join('')
    out.push(`${pad}  <thead>${headRows}</thead>`)
  }
  if (rows.length > bodyStart) {
    out.push(`${pad}  <tbody>`)
    for (let r = bodyStart; r < rows.length; r++) out.push(`${pad}    ${renderRow(rows[r], r)}`)
    out.push(`${pad}  </tbody>`)
  }
  out.push(`${pad}</table>`)
  return out.join('\n')
}

// --- PART 9R R1: reference links --------------------------------------------
function resolveRefs(html, ctx) {
  return html.replace(/ref:(\{.*?\})/g, (_, json) => {
    // Belt-and-suspenders: a genuine ref sentinel always carries well-formed
    // JSON. Anything else is spoofed/garbage (sentinel chars are stripped from
    // document text upstream) -- degrade to the literal match, never throw.
    let parsed
    try {
      parsed = JSON.parse(json)
    } catch {
      return _
    }
    const { label, text, attrs } = parsed
    if (typeof text !== 'string') return _
    const key = label ?? stripTags(text)
    const def = ctx.linkDefs.get(key)
    if (!def) {
      // R1 IMPLICIT HEADING FALLBACK. Link definitions win the tie above, so
      // this only runs when the label matches none. Every production engine
      // does this; the oracle did not, and no corpus case could tell because
      // each one pairing `[X][]` with a definition never reaches the branch
      // (carve#453).
      const heading = ctx.headingRefs.get(refKey(label ?? text))
      if (heading !== undefined) {
        return `<a href="#${escapeAttr(heading)}"${attrs}>${text}</a>`
      }
      return `[${text}][${label ?? ''}]` // unresolved -> literal (R1)
    }
    const t = def.title ? ` title="${escapeAttr(def.title)}"` : ''
    return `<a href="${escapeAttr(checkUrl(def.url))}"${t}${attrs}>${text}</a>`
  })
}

/*
 * R1 matches the heading index LOOSER than it matches link definitions: trim,
 * collapse internal whitespace, fold case. A definition label is an identifier
 * the author wrote twice; a heading reference is prose quoted from elsewhere in
 * the document.
 */
function refKey(text) {
  return stripTags(text).trim().replace(/\s+/g, ' ').toLowerCase()
}

/* Register a heading in the implicit-reference index. FIRST wins. */
function noteHeadingRef(ctx, text, id) {
  if (ctx.inBlockquote) return
  const key = refKey(text)
  if (key && !ctx.headingRefs.has(key)) ctx.headingRefs.set(key, id)
}

function stripTags(s) {
  return s.replace(/<[^>]*>/g, '')
}

// --- PART 9R R2: footnotes ---------------------------------------------------
function resolveFootnotes(html, ctx) {
  const placement = html.includes('\uE000fnplacement\uE001')
  const order = [] // labels by first reference
  const counts = new Map()
  const inlineNotes = [] // rendered content per anonymous note, by number
  html = html.replace(/(fn|note):([\s\S]*?)\u0002(.*?)/g, (_, kind, payload, attrs) => {
    if (kind === 'note') {
      // an inline note draws a fresh number from the SAME sequence (R2)
      order.push({ inline: inlineNotes.length })
      inlineNotes.push(payload)
      const n = order.length
      return `<a id="fnref${n}" href="#fn${n}" role="doc-noteref"${attrs}><sup>${n}</sup></a>`
    }
    const label = payload
    if (!ctx.footnoteDefs.has(label)) return `[^${label}]` // unresolved -> literal
    let n = order.indexOf(label) + 1
    if (n === 0) {
      order.push(label)
      n = order.length
    }
    const k = (counts.get(label) ?? 0) + 1
    counts.set(label, k)
    const refId = k === 1 ? `fnref${n}` : `fnref${n}-${k}`
    return `<a id="${refId}" href="#fn${n}" role="doc-noteref"${attrs}><sup>${n}</sup></a>`
  })
  if (order.length === 0) return html.replace(/\uE000fnplacement\uE001\n?/g, '')

  const notes = order.map((label, idx) => {
    const n = idx + 1
    let rendered
    if (typeof label === 'object') {
      rendered = `      <p>${inlineNotes[label.inline]}</p>`
    } else {
      const body = ctx.footnoteDefs.get(label)
      rendered = body
        .map((b) => renderBlock(b, 3, ctx))
        .join('\n')
    }
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
  const section = `<section role="doc-endnotes">\n  <hr>\n  <ol>\n${notes.join('\n')}\n  </ol>\n</section>`
  if (placement) return html.replace('\uE000fnplacement\uE001', section).replace(/\uE000fnplacement\uE001\n?/g, '')
  return html + '\n' + section
}

// --- PART 9R R4: crossrefs ---------------------------------------------------
function resolveCrossrefs(html, ctx) {
  return html.replace(/xref(text)?:(.*?)/g, (_, textOnly, id) => {
    const hit = ctx.headingIds.get(id.toLowerCase())
    if (!hit) {
      const cap = ctx.captionIds.get(id.toLowerCase())
      if (cap) return textOnly ? cap : `<a href="#${id}">${cap}</a>`
      // unresolved: literal source text (PART 9 SS19), HTML-escaped -- an
      // unresolved id may carry `<`/`>`/`&` (e.g. `</#<script>`) which must not
      // reach the output raw.
      const esc = id.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
      return `&lt;/#${esc}&gt;`
    }
    // one-level resolution: nested sentinels in the cloned text flatten to
    // their literal source (PART 9R R4)
    const text = hit.html.replace(/xref(?:text)?:(.*?)/g, '')
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
      s = s.replace(re, (_, pre, hit) => `${pre}<abbr title="${escapeAttr(expansion)}">${hit}</abbr>`)
    }
    parts[i] = s
  }
  return parts.join('')
}
