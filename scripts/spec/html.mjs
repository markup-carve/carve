/*
 * Executable PART 10 (block serialization) + PART 9R (resolution passes)
 * over the layout tree. Byte-parity with the conformance corpus is the
 * contract; anything the subset cannot render faithfully throws Refuse.
 *
 * STATUS: a DERIVED CHECKER, not an authority. It executes what grammar.ebnf
 * states so a contradiction inside it becomes visible; it settles nothing. If
 * this file and a committed corpus golden disagree, this file is wrong until a
 * clause says otherwise - see the NORMATIVITY block at the top of
 * resources/grammar.ebnf. It has been the fourth answer to a three-way
 * disagreement before (carve#646).
 */

import { Refuse, TIER1, bracketRunEnd } from './layout.mjs'

/*
 * THE WORDS THE ENGINE WRITES ITSELF (PART 9 SS16a, carve#1456).
 *
 * A renderer's `labels` map overrides these; the oracle pins the DEFAULTS,
 * which is what the corpus documents. Every value is TEXT and is escaped at the
 * point of use - unlike the `symbols` map, which is emitted raw.
 */
const LABELS = {
  footnoteBacklink: 'Back to reference',
}
import { renderInline, renderInlineHardBreaks, renderInlineWithoutSymbols, deTypography, makeSlugger, checkUrl, escapeAttr, parseAttrBlock, parseAttrList, renderBlockAttrs, renderAttrs, REF_FRAME, NOTE_FRAME } from './render.mjs'

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
      if (id === null) id = ctx.slug(slugText(b.text))
      ctx.headingIds.set(id.toLowerCase(), { id, html })
      noteHeadingRef(ctx, derivedText(b.text), id)
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
  // REFERENCES FIRST. A reference tail carries its link text through a JSON
  // payload, and JSON.stringify escapes U+0002 as a control character - so a
  // noteref sitting in that payload was invisible to the footnote pass and
  // rode out as the bare text `fn:1` (markup-carve/carve#1195). Unwrapping
  // the frame first hands the footnote pass a live sentinel again.
  //
  // What the old order bought is paid for inside resolveFootnotes instead: a
  // note BODY is rendered there, after this line, and can introduce both
  // reference frames and further notes, so that pass runs both over each body
  // as it appears.
  html = resolveRefs(html, ctx)
  html = resolveFootnotes(html, ctx)
  html = resolveCrossrefs(html, ctx)
  html = applyAbbreviations(html, ctx)
  return html
}

/**
 * One line of a line block, as INLINE SOURCE (PART 9 SS23).
 *
 * Leading whitespace is preserved down to a single column; an inner or trailing
 * run of TWO OR MORE columns is a medial gap and is preserved too. A lone inner
 * space stays an ordinary collapsible space so a long line can still wrap
 * between words. Preserved columns become NO-BREAK SPACE CHARACTERS, which
 * `renderInline` serializes as `&nbsp;`; a tab advances to the next multiple of
 * four, counted from the column its run starts at (SS24 C1).
 *
 * WHY SOURCE AND NOT HTML (carve#1282). This used to render each whitespace
 * segment separately and concatenate the results, which made every gap - and
 * every line break above it - a boundary the inline parser could not see
 * across. An unclosed inline run then stopped at the line break, while the
 * clause says a run with no closer reaches the end of the BLOCK, and a line
 * block is one block. Emitting source lets the stanza be parsed once, so the
 * rule needs no line-block exception. The transform itself is unchanged: it is
 * the same columns, expressed as the character rather than as its entity.
 */
function renderLineBlockLine(line) {
  let out = ''
  let i = 0
  let column = 0
  let seenContent = false
  while (i < line.length) {
    const ch = line[i]
    if (ch !== ' ' && ch !== '\t') {
      out += ch
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
      out += '\u00a0'.repeat(width)
    } else if (i < line.length) {
      out += ' '
    }
    // A LONE run at the END of the line is TRAILING WHITESPACE and is dropped
    // (PART 2, NO TRAILING WHITESPACE; carve#926). The order is what makes
    // this consistent rather than an exception: SS23's MEDIAL GAPS rule
    // converts a run of two or more columns into NBSP CONTENT first, and
    // content is not whitespace, so the general rule only ever reaches the
    // one-column case - which SS23 leaves as an ordinary collapsible space,
    // and which cannot serve the purpose SS23 gives it (letting a long line
    // wrap between words) at the end of a line.
  }
  return out
}

function renderBlock(b, depth, ctx) {
  const pad = '  '.repeat(depth)
  const ba = b.battrs ? renderBlockAttrs(b.battrs) : ''
  switch (b.t) {
    case 'para': {
      const image = renderStandaloneImage(b.lines.join('\n'), b.caption === undefined ? ba : '', ctx)
      if (image !== null) {
        // a standalone image paragraph renders as a bare <img> (PART 10)
        if (b.caption !== undefined) {
          const id = / id="([^"]*)"/.exec(ba)?.[1]
          const cap = numberCaption(b.caption, ctx, id)
          return `${pad}<figure${ba}>\n${pad}  ${image}\n${pad}  <figcaption>${renderInline(cap)}</figcaption>\n${pad}</figure>`
        }
        return pad + image
      }
      const html = renderInline(b.lines.join('\n'))
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
      // PART 9 §4b: a caption makes its host a FIGURE, and a quote is not a
      // special host. The `figure` node is the generic captioned wrapper, and
      // what a captioned thing is called and counted as comes from the
      // caption's own label - so `^ Hamlet` takes no number and `^ Figure #:`
      // takes the next Figure, exactly as on a code block. carve#1161 briefly
      // made this an `attribution` rendered as a `<footer>` INSIDE the quote;
      // the HTML Standard requires the attribution outside the `blockquote`
      // and names this `<figure>` shape as the way to attach it (carve#1213).
      //
      // THE QUOTE'S BLOCKS ARE NOT COUNTED. A multi-paragraph epigraph, a
      // quoted list, a nested quote, a quoted code block and a quoted heading
      // each take a caption the same way. This used to render only a
      // single-paragraph quote and Refuse everything else, which no corpus
      // document could reach - the refusal was guarded by the absence of a
      // fixture rather than by a decision (carve#1181, the carve#755 class).
      const captioned = b.caption !== undefined
      // A captioned quote sits one level deeper: inside the `<figure>`.
      const quotePad = captioned ? `${pad}  ` : pad
      const compact = b.children.length === 1 && b.children[0].t === 'para'
      // Depth-first and synchronous, so a saved/restored flag is a stack. The
      // children are rendered ONCE, under `inBlockquote`, which is what keeps a
      // quoted heading out of the implicit-reference index.
      const wasInBlockquote = ctx.inBlockquote
      ctx.inBlockquote = true
      const inner = (() => {
        try {
          return compact
            ? renderBlock(b.children[0], 0, ctx)
            : b.children.map((c) => renderBlock(c, quotePad.length / 2 + 1, ctx)).filter((x) => x !== null).join('\n')
        } finally {
          ctx.inBlockquote = wasInBlockquote
        }
      })()
      const quote = compact
        ? `${quotePad}<blockquote${captioned ? '' : ba}>${inner}</blockquote>`
        : `${quotePad}<blockquote${captioned ? '' : ba}>\n${inner}\n${quotePad}</blockquote>`
      if (!captioned) return quote
      const id = / id="([^"]*)"/.exec(ba)?.[1]
      const cap = numberCaption(b.caption, ctx, id)
      return `${pad}<figure${ba}>\n${quote}\n${pad}  <figcaption>${renderInline(cap)}</figcaption>\n${pad}</figure>`
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
    case 'figure-group': {
      // PART 9 SS4c: one figure, its direct captionable children as panels.
      const pad2 = '  '.repeat(depth)
      // class-first, the typed-container convention: `carve-figure-group`
      // leads, attribute-line classes merge after it, id and the rest follow
      // in source order (renderBlockAttrs already merges classes at the first
      // class position, so prepending a synthetic class list IS that rule).
      const attrStr = renderBlockAttrs([[['class', 'carve-figure-group']], ...(b.battrs ?? [])])
      const groupId = / id="([^"]*)"/.exec(attrStr)?.[1]
      // panels: direct children the inner SS4 rules made captionable things
      // of -- a captioned paragraph host (image / display math / promoted
      // reference image), a captioned code listing, a captioned quote (SS4b:
      // a caption makes its host a figure, and a quote is not a special host
      // inside the group either), or any table. An UNCAPTIONED quote is
      // plain group content.
      const isPanel = (c) =>
        c.t === 'table' || ((c.t === 'para' || c.t === 'code' || c.t === 'quote') && c.caption !== undefined)
      let cap
      if (b.caption !== undefined) {
        // the group is ONE numbering unit; its draw also registers the panel
        // ids with letters (SS4c), so number BEFORE rendering the children.
        const panelIds = b.children.filter(isPanel).map((c) => {
          const a = c.battrs ? renderBlockAttrs(c.battrs) : ''
          return / id="([^"]*)"/.exec(a)?.[1]
        })
        cap = numberCaption(b.caption, ctx, groupId, panelIds)
      }
      // PANELS NEST DIRECTLY (SS4c): HTML's figure content model is a
      // figcaption first or last plus flow content, and figure is itself
      // flow content, so no wrapper element sits between the group and its
      // panels -- the shape Pandoc's writers produce for subfigures too.
      const inner = b.children
        .map((c) => {
          if (!isPanel(c)) return renderBlock(c, depth + 1, ctx)
          const wasInPanel = ctx.inPanel
          ctx.inPanel = true
          try {
            if (c.t === 'table') {
              // a table does not render as a <figure> on its own, so the
              // panel wrapper is explicit; the table keeps its own attrs and
              // its own <caption> (SS4c).
              const t = renderBlock(c, depth + 2, ctx)
              return `${pad2}  <figure class="carve-figure-panel">\n${t}\n${pad2}  </figure>`
            }
            // a captioned para/code/quote host already renders as <figure>;
            // lead its classes with the panel marker the way the group's are
            const prev = c.battrs
            c.battrs = [[['class', 'carve-figure-panel']], ...(prev ?? [])]
            try {
              return renderBlock(c, depth + 1, ctx)
            } finally {
              c.battrs = prev
            }
          } finally {
            ctx.inPanel = wasInPanel
          }
        })
        .filter((x) => x !== null)
        .join('\n')
      const parts = []
      if (inner !== '') parts.push(inner)
      if (cap !== undefined) parts.push(`${pad2}  <figcaption>${renderInline(cap)}</figcaption>`)
      // an EMPTY uncaptioned group keeps the bare-container empty-body line
      // (the PART 10 SS4 exception the generic div takes).
      if (parts.length === 0) return `${pad2}<figure${attrStr}>\n${pad2}</figure>`
      return `${pad2}<figure${attrStr}>\n${parts.join('\n')}\n${pad2}</figure>`
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
        // A COMMENT-ONLY BODY LINE IS REMOVED AT THE BLOCK LAYER (PART 9
        // SS23), which is to say HERE - before the stanza is handed to the
        // inline parser below. Doing it after would let an unclosed verbatim
        // run opened on an earlier line claim the line under SS21's verbatim
        // exclusion and PUBLISH the comment, which is what all three engines
        // and this checker did (markup-carve/carve#1333).
        //
        // It leaves an EMPTY VERSE LINE, not a blank line: the stanza split
        // above has already happened, so emptying the line keeps the stanza's
        // shape instead of ending it.
        //
        // Only a line whose FIRST character is `%` qualifies. In verse the
        // leading run is CONTENT, so `comment_line`'s optional `[whitespace]`
        // prefix has nothing to consume and an indented `%%` line is ordinary
        // text. `%%%` is included: SS28 degrades a fence opener with no closer
        // to a comment line, and SS23 makes a fence opener ordinary text here
        // anyway, so it can never be anything else.
        const body = st.map((l) => (l.startsWith('%%') ? '' : l))
        // ONE inline parse for the whole stanza, so a run with no closer
        // reaches the end of the block instead of stopping at a line break
        // (markup-carve/carve#1282). The breaks harden afterwards, and the ones
        // the run swallowed are content by then.
        const source = body.map((l) => renderLineBlockLine(l)).join('\n')
        return `${pad2}  <p>${renderInlineHardBreaks(source)}</p>`
      })
      return `${pad2}<div class="line-block">\n${ps.join('\n')}\n${pad2}</div>`
    }
    case 'hardbreaks': {
      const pad2 = '  '.repeat(depth)
      // direct paragraph children harden their soft breaks; nested blocks
      // keep normal behavior (PART 9 SS23)
      const parts = b.children.map((c) => {
        if (c.t === 'para') {
          const html = renderInlineHardBreaks(c.lines.join('\n'))
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
      // PART 9 SS20: verbatim for the html target, dropped otherwise.
      //
      // ONLY THE OPENING IS PLACED. The raw block sits where the container puts
      // any block, and its own line structure is passed through untouched -
      // padding an interior line changes bytes the author wrote, and inside a
      // `<pre>` those columns are CONTENT, so the rendered code block would say
      // something the source did not. Padding EVERY line was indistinguishable
      // from this on the single-line raw blocks the corpus used to hold, which
      // is how three engines gave three answers (carve#800).
      return b.format === 'html' ? pad + b.text : null
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
      const id = authored ?? ctx.slug(slugText(b.text))
      ctx.headingIds.set(id.toLowerCase(), { id, html })
      noteHeadingRef(ctx, derivedText(b.text), id)
      const idAttr = authored === null ? ` id="${escapeAttr(id)}"` : ''
      return `${pad}<h${b.level}${attrStr}${idAttr}>${html}</h${b.level}>`
    }
    case 'footnotes-placement':
      return '\uE000fnplacement\uE001'
    default:
      throw new Refuse(`unknown block ${b.t}`)
  }
}

function renderStandaloneImage(line, attrs, ctx) {
  // Resolve reference images before paragraph serialization, so PART 10's
  // standalone-image shape is a block decision rather than a final HTML rewrite.
  // The alt run is scanned, not matched: the close is balanced and a
  // `[^\]]*` spelling of it stops at the first `]` at any depth, so
  // `![t[z]][r]` on a line of its own missed this branch and fell through to
  // the inline pass (carve#1197). The LABEL half stays a pattern - a
  // `reference_label` really does stop at the first `]`.
  // The ALT may hold a line boundary and the TAIL may not (carve#1352), and
  // this pattern is deliberately NOT tightened for it: `[^\]]` does match a
  // newline, but a label carrying one resolves against no definition - a
  // definition marker is one line - so the branch declines and the paragraph
  // falls through to the inline pass either way. Tightening it here changed no
  // document and would have read as a guard doing work it never does. The
  // reachable half of the same rule IS guarded, in `isCaptionableParagraph`.
  const altEnd = line.startsWith('![') ? bracketRunEnd(line, 1) : -1
  const ref = altEnd === -1 ? null : /^\[([^\]]*)\](\{[^}]*\})?$/.exec(line.slice(altEnd))
  if (ref) {
    const attrSrc = ref[2] ?? ''
    const attrList = attrSrc === '' ? [] : parseAttrList(attrSrc)
    if (attrList === null) return null
    const image = resolveImageRef({
      alt: line.slice(2, altEnd - 1),
      label: ref[1] === '' ? null : ref[1],
      attrList,
      attrSrc,
    }, ctx, '')
    return IMG_ONLY.test(image) ? withBlockImageAttrs(image, attrs) : null
  }

  const html = renderInline(line)
  return IMG_ONLY.test(html) ? withBlockImageAttrs(html, attrs) : null
}

function withBlockImageAttrs(image, attrs) {
  return attrs ? image.replace('<img ', `<img${attrs} `) : image
}

function renderList(list, depth, ctx) {
  const pad = '  '.repeat(depth)
  let tag = 'ul'
  const authored = list.battrs ? renderBlockAttrs(list.battrs) : ''
  // A STRUCTURAL ATTRIBUTE LEADS (PART 11 §5.1). `type` and `start` are fixed
  // by the first item's marker, so they are the element's own shape rather than
  // something added on top of what the author wrote, and they are emitted
  // BEFORE the authored attributes. This appended them instead, which read the
  // "generated attribute joins at the end" rule as covering them -- the reading
  // carve-rs also took, against carve-js, carve-php and reference djot
  // (carve#1090). Pinned by corpus 289.
  let structural = ''
  if (list.ord) {
    tag = 'ol'
    if (list.ord.type) structural += ` type="${list.ord.type}"`
    if (list.ord.start) structural += ` start="${list.ord.start}"`
  }
  const attrs = structural + authored
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
    // A CAPTIONED paragraph goes through renderBlock, which owns the figure
    // shape. This hand-built path never consulted `caption`, so a captioned
    // image paragraph inside an item lost its caption entirely - the line was
    // parsed correctly (the node carries `caption`) and then dropped on the way
    // out (carve#693). The oracle promoted the same caption at the top level and
    // inside a div, so a list item was the only container that discarded it.
    //
    // This is the SECOND field this site has dropped for the same reason: it
    // duplicates the top-level paragraph logic instead of delegating, and
    // carve#626 was `battrs` going the same way. Delegating is the fix in both
    // cases; the inline path stays only for the plain shape it exists for.
    if (b.t === 'para' && b.caption === undefined) {
      // render the whole paragraph in one inline pass (lines joined by soft
      // breaks) so an inline construct spanning a soft break -- e.g. a
      // multi-line `` ``` ``-run folded in as lazy text -- is one span, not one
      // per line. Matches the top-level para path in renderBlock.
      const html = renderInline(b.lines.join('\n'))
      // A paragraph inside an item carries its block attributes like any other
      // (PART 9 §15). This path built the `<p>` by hand and never consulted
      // `battrs`, so `- a` + blank + `  {.c}` + `  text` parsed the attribute
      // correctly and then dropped it on the way out - the one paragraph site
      // in this renderer that did (carve#626).
      //
      // A TIGHT item renders its paragraph WITHOUT a `<p>` - unless that
      // paragraph carries attributes, which need an element to live on. So the
      // wrapper is decided by the attributes, not by tightness alone.
      //
      // The comment here used to claim the shape could not occur, on the theory
      // that an attribute line only ever arrives after a blank and a blank plus
      // a visible paragraph makes the item loose. That was never checked and is
      // false: `- a` / `  {.c}` / `  text` has no blank at all, stays tight, and
      // dropped the attribute - and with the attribute line FIRST (`- {.c}` /
      // `  text`) the `<p>` went with it. All three engines wrap in both shapes
      // (carve#696).
      //
      // `inlineable` stays true either way: the item layout below puts a wrapped
      // paragraph on its own indented line when it is not the first part, which
      // is exactly what the engines emit.
      const pattrs = b.battrs ? renderBlockAttrs(b.battrs) : ''
      const bare = list.tight && pattrs === ''
      parts.push({ inlineable: true, html: bare ? html : `<p${pattrs}>${html}</p>` })
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
    out = `${pad}<li${liAttrs}>${prefix}\n${first.html}`
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
//
// PART 9 SS4c: a PANEL of a composite figure is not a sequence unit, so a
// caption rendered under `ctx.inPanel` keeps its `#` literal and registers
// nothing; the panel's crossref text comes from the GROUP's draw instead --
// `panelIds` are the ids of the group's panels in panel order, registered as
// "Label N" plus a letter (a..z, then aa, ab, ...) when the group numbers.
function panelLetter(k) {
  let s = ''
  k++
  while (k > 0) {
    k--
    s = String.fromCharCode(97 + (k % 26)) + s
    k = Math.floor(k / 26)
  }
  return s
}
function numberCaption(text, ctx, id, panelIds) {
  if (ctx.inPanel) return text
  const m = /^(\S+)([^#]*?)(?<!\\)#(?=[\s:.]|$)/.exec(text)
  if (!m) return text
  const label = m[1]
  const n = (ctx.captionSeq.get(label) ?? 0) + 1
  ctx.captionSeq.set(label, n)
  if (id) ctx.captionIds.set(id.toLowerCase(), `${label} ${n}`)
  if (panelIds) {
    panelIds.forEach((pid, k) => {
      if (pid) ctx.captionIds.set(pid.toLowerCase(), `${label} ${n}${panelLetter(k)}`)
    })
  }
  return text.replace(/(?<!\\)#(?=[\s:.]|$)/, String(n))
}

// --- tables: PART 9 SS5 T5 span walk + serialization -------------------------
function renderTable(node, depth, ctx) {
  const pad = '  '.repeat(depth)
  const tableKeys = new Map()
  const ordinaryAttrs = []
  for (const list of node.battrs ?? []) {
    const keep = []
    for (const attr of list) {
      if (attr[0] === 'kv' && ['aligns', 'valigns', 'widths', 'header-rows', 'footer-rows'].includes(attr[1])) tableKeys.set(attr[1], attr[2])
      else keep.push(attr)
    }
    if (keep.length) ordinaryAttrs.push(keep)
  }
  const ba = ordinaryAttrs.length ? renderBlockAttrs(ordinaryAttrs) : ''
  const rows = node.rows
  const widest = rows.reduce((n, row) => Math.max(n, row.cells.length), 0)
  const positional = (key) => tableKeys.has(key) ? String(tableKeys.get(key)).split(',').map((v) => v.trim()) : []
  const attrAlign = positional('aligns').map((v) => ['left', 'right', 'center'].includes(v) ? v : null)
  const attrValign = positional('valigns').map((v) => ['top', 'middle', 'bottom'].includes(v) ? v : null)
  const attrWidths = positional('widths').map((v) => v === '' ? null : Number(v))
  if ([attrAlign, attrValign, attrWidths].some((values) => values.length > widest)) {
    throw new Refuse('table column attribute has more entries than columns')
  }
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
  const colAlign = [...attrAlign]
  const colValign = [...attrValign]
  if (rows[0]?.isHead) {
    rows[0].cells.forEach((c, ci) => {
      colAlign[ci] = c.align ?? colAlign[ci] ?? null
      colValign[ci] = c.valign ?? colValign[ci] ?? null
    })
  }
  const rowCount = (key) => {
    if (!tableKeys.has(key)) return 0
    const value = String(tableKeys.get(key)).trim()
    if (value === '') return 1
    if (!/^\d+$/.test(value)) throw new Refuse(`invalid ${key} table attribute`)
    return Number(value)
  }
  const explicitPartition = tableKeys.has('header-rows') || tableKeys.has('footer-rows')
  let headCount = rowCount('header-rows')
  const footCount = rowCount('footer-rows')
  if (headCount + footCount > rows.length) throw new Refuse('table header and footer rows overlap')
  if (!explicitPartition) {
    while (headCount < rows.length && rows[headCount].isHead) headCount++
  }
  const footStart = rows.length - footCount
  const renderCell = (cell, r, c) => {
    const isHeader = cell.header || r < headCount
    const tag = isHeader ? 'th' : 'td'
    let a = ''
    // The cell's own block is parsed FIRST, only to see whether it names
    // `scope`. Emitting the default unconditionally and letting the authored
    // one follow produced `<th scope="col" scope="colgroup">` - two attributes
    // of one name, which is not valid HTML and is not an override.
    let parsed = ''
    if (cell.attrs) {
      parsed = parseAttrBlock(cell.attrs)
      if (parsed === null) throw new Refuse('invalid cell attribute block')
    }
    // PART 10 §T9: a header cell states what it heads. A `th` in the head row
    // run heads its COLUMN, one below heads its ROW - the association a screen
    // reader has no other way to make, and the one WCAG 1.3.1 is about.
    // CASE-INSENSITIVE on the way in, deliberately. Carve attribute NAMES are
    // case-sensitive, so `{Scope=…}` is a different Carve attribute - but HTML
    // attribute names are not, so emitting the default beside it produces two
    // `scope`s as far as any consumer is concerned. The test is about avoiding
    // that collision, not about folding the author's name.
    if (isHeader && !/ scope="/i.test(parsed)) {
      a += r < headCount ? ' scope="col"' : ' scope="row"'
    }
    if (cell.rowspan) a += ` rowspan="${cell.rowspan}"`
    if (cell.colspan) a += ` colspan="${cell.colspan}"`
    a += parsed
    const align = cell.empty ? null : (cell.align ?? colAlign[c] ?? null)
    const valign = cell.empty ? null : (cell.valign ?? colValign[c] ?? null)
    if (align || valign) {
      const declarations = []
      if (align) declarations.push(`text-align: ${align};`)
      if (valign) declarations.push(`vertical-align: ${valign};`)
      a += ` style="${declarations.join(' ')}"`
    }
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
  if (attrWidths.some((width) => Number.isFinite(width) && width > 0)) {
    out.push(`${pad}  <colgroup>`)
    for (let c = 0; c < widest; c++) {
      const width = attrWidths[c]
      out.push(Number.isFinite(width) && width > 0
        ? `${pad}    <col style="width: ${width}%;">`
        : `${pad}    <col>`)
    }
    out.push(`${pad}  </colgroup>`)
  }
  // A ROW IS A ROW, IN EVERY SECTION (carve#1459). `thead` and `tfoot` used to
  // put their rows on the section's own line while `tbody` gave each row a line
  // of its own, and nothing said why the same element was laid out two ways -
  // which is how two fixtures in one commit came to demand different `tfoot`
  // shapes with no rule to measure either against. One layout needs no
  // exception, and the emitted HTML is read by people: these documents ARE the
  // documentation, and their diffs are how a table defect gets noticed.
  const bodyStart = headCount
  const section = (tag, from, to) => {
    out.push(`${pad}  <${tag}>`)
    for (let r = from; r < to; r++) out.push(`${pad}    ${renderRow(rows[r], r)}`)
    out.push(`${pad}  </${tag}>`)
  }
  if (headCount > 0) section('thead', 0, headCount)
  if (footStart > bodyStart) section('tbody', bodyStart, footStart)
  if (footStart < rows.length) section('tfoot', footStart, rows.length)
  out.push(`${pad}</table>`)
  return out.join('\n')
}


/*
 * PART 9R R1 for `![alt][ref]`: the label resolves against the SAME linkDefs
 * entry a reference link uses, and the image takes url, title AND attrs from
 * it. An unresolved image reference stays literal source, matching the link
 * side (PART 12 §3a keeps the construct rather than discarding it).
 */
function resolveImageRef(parsed, ctx, literal) {
  const { label, alt, attrList, attrSrc } = parsed
  if (typeof alt !== 'string') return literal
  // Keyed exactly as a link reference is (carve#648): the label AS WRITTEN.
  // `alt` is the source string here, not the rendered text, so the two paths
  // agree - which is the point of that change.
  //
  // EXACT, not trimmed or collapsed (§6, PART 9R R1: "case-sensitive, no
  // whitespace folding"). Folding here matched `![ a  b][]` against `[a b]` and
  // failed to match the identical `[ a  b]` - backwards in both directions from
  // all three engines (carve#708).
  const key = label ?? alt
  const def = ctx.linkDefs.get(key)
  // UNRESOLVED -> LITERAL, attribute block INCLUDED. The block is part of
  // what the author wrote, and dropping it deleted content silently. All
  // three engines emit it verbatim (carve#679).
  if (!def) return `![${alt}][${label ?? ''}]${attrSrc ?? ''}`
  const t = def.title ? ` title="${escapeAttr(def.title)}"` : ''
  const a = def.attrs?.length
    ? renderBlockAttrs([def.attrs, attrList ?? []])
    : renderAttrs(attrList ?? [])
  return `<img src="${escapeAttr(checkUrl(def.url))}" alt="${escapeAttr(alt)}"${t}${a}>`
}

// --- PART 9R R1: reference links --------------------------------------------
function resolveRefs(html, ctx) {
  // A payload can hold another frame - an image reference inside link text -
  // and `String.replace` never rescans what it substituted. Each pass consumes
  // the outermost frame of every chain, and a nested payload is strictly
  // shorter than the one holding it, so this settles at the nesting depth.
  let prev
  do {
    prev = html
    html = resolveRefsOnce(html, ctx)
  } while (html !== prev)
  return html
}

function resolveRefsOnce(html, ctx) {
  return html.replace(REF_FRAME, (_, json) => {
    // Belt-and-suspenders: a genuine ref sentinel always carries well-formed
    // JSON. Anything else is spoofed/garbage (sentinel chars are stripped from
    // document text upstream) -- degrade to the literal match, never throw.
    let parsed
    try {
      parsed = JSON.parse(json)
    } catch {
      return _
    }
    const { label, text, source, attrList, img, attrSrc } = parsed
    if (img) return resolveImageRef(parsed, ctx, _)
    if (typeof text !== 'string') return _
    // A collapsed reference is keyed by the label AS WRITTEN, the same spelling
    // a definition line registers. The rendered text is a different string
    // whenever the label carries markup, and keying on it inverted the rule in
    // both directions (carve#648).
    //
    // AS WRITTEN means EXACT - not trimmed, not collapsed (§6, PART 9R R1:
    // "case-sensitive, no whitespace folding"). This is the COLLAPSED form only;
    // the explicit `[text][ref]` form was always exact here, which is how half
    // the clause drifted unnoticed (carve#708). The heading fallback below stays
    // deliberately looser - see `refKey`.
    const key = label ?? (typeof source === 'string' ? source : stripTags(text))
    const def = ctx.linkDefs.get(key)
    if (!def) {
      // R1 IMPLICIT HEADING FALLBACK. Link definitions win the tie above, so
      // this only runs when the label matches none. Every production engine
      // does this; the oracle did not, and no corpus case could tell because
      // each one pairing `[X][]` with a definition never reaches the branch
      // (carve#453).
      // THE LABEL ENTERS AS ITS RENDERED PLAIN TEXT (R1), which is the same
      // derivation the heading side registered under - symbols excluded and
      // all. Keying the label on `text`, the rendered HTML, kept a symbol on
      // this side only, so `# a :smile: b` was reachable by
      // `[a :smile: b][]` and not by `[a b][]`, while all three engines
      // resolve both (markup-carve/carve#1011).
      const indexKey =
        label == null && typeof source === 'string' ? derivedText(source) : (label ?? text)
      const heading = ctx.headingRefs.get(refKey(indexKey))
      if (heading !== undefined) {
        return `<a href="#${escapeAttr(heading)}"${renderAttrs(attrList ?? [])}>${text}</a>`
      }
      // UNRESOLVED -> LITERAL (R1), and literal means the SOURCE. `text` is
      // the bracket content already rendered, so emitting it turned
      // `[*bold*][]` into `[<strong>bold</strong>][]` - a construct the reader
      // never wrote, with the markers that identify it as a reference silently
      // consumed. All three engines emit the source; nothing pinned it because
      // no corpus case paired an unresolved reference with a decorated label.
      return `[${source ?? text}][${label ?? ''}]${attrSrc ?? ''}`
    }
    const t = def.title ? ` title="${escapeAttr(def.title)}"` : ''
    // R1: the definition's attributes transfer to the link, and the link's own
    // override per key. "Per key" is SS15 A3's merge - the one stacked
    // attribute lists already use - so a repeated id/key takes the LAST value
    // (the link's) and classes ACCUMULATE ACROSS the two lists. Definition
    // list first, link list second (carve#604).
    //
    // With NO definition attributes this stays on renderAttrs, the inline
    // path it always used: A3 accumulates classes across lists but WITHIN one
    // attribute block a repeated class is deduplicated, so routing the
    // link's own list through the block merge turned `{.a .a}` into
    // `class="a a"` on reference links alone.
    const a = def.attrs?.length
      ? renderBlockAttrs([def.attrs, attrList ?? []])
      : renderAttrs(attrList ?? [])
    return `<a href="${escapeAttr(checkUrl(def.url))}"${t}${a}>${text}</a>`
  })
}

/*
 * R1 matches the heading index LOOSER than it matches link definitions: trim,
 * collapse internal whitespace, NFC-normalize, fold case. A definition label is
 * an identifier the author wrote twice; a heading reference is prose quoted from
 * elsewhere in the document.
 *
 * NFC and not NFKC. Without it the id side is normalized (§25) and this side is
 * not, so a document publishes `id="Café"` and then declines `[Café][]` against
 * the very heading that produced it - carve#725, where carve-rs folded and the
 * other three did not.
 */
function refKey(text) {
  return stripTags(text).trim().replace(/\s+/g, ' ').normalize('NFC').toLowerCase()
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

const ENTITIES = { '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&nbsp;': '\u00a0', '&amp;': '&' }

/*
 * The text a heading's id is slugged from: the heading's RENDERED PLAIN TEXT
 * (syntax.md section 4.1 step 1), not its source.
 *
 * It used to be the source with `</#id>` runs deleted, which reaches the right
 * answer for most headings by accident: the slug replaces each run of
 * non-alphanumeric ASCII with a `-`, so `*`, `` ` `` and `/` fall out on their
 * own. What it cannot do is tell a delimiter from content. A nested link
 * `[x](/y)` slugged as `x-y`, carrying a DESTINATION into the id, and a symbol
 * `:smile:` slugged as `smile`, carrying a shortcode name the rendered document
 * may not print at all. Both are what the rule already excludes; deriving the
 * text from the render rather than the source needs no list of delimiters
 * (markup-carve/carve#1011).
 *
 * Three deletions before the tags come off. A `\uE000...\uE001` span is a PART
 * 9R sentinel - a footnote reference, an inline note, a cross-reference - and
 * each is excluded from a heading's derived text, which is also what deleting
 * the `</#id>` run did before. A symbol is excluded by re-rendering without it.
 * The escapes then come back off, so `# A & B` is `A-B` and not `A-amp-B`.
 */
function derivedText(source) {
  const html = renderInlineWithoutSymbols(source)
    .replace(/\uE000[\s\S]*?\uE001/g, '')
    // An image's plain-text projection is its alternative text. Preserve it
    // before the generic tag strip removes the `<img>` leaf altogether.
    .replace(/<img\b[^>]*\balt="([^"]*)"[^>]*>/g, '$1')

  return stripTags(html).replace(/&(?:lt|gt|quot|#39|nbsp|amp);/g, (m) => ENTITIES[m])
}

function slugText(source) {
  return deTypography(derivedText(source)).replace(/[ \t]+$/, '')
}

// --- PART 9R R2: footnotes ---------------------------------------------------
function resolveFootnotes(html, ctx) {
  const placement = html.includes('\uE000fnplacement\uE001')
  const order = [] // labels by first reference
  const counts = new Map()
  const inlineNotes = [] // rendered content per anonymous note, by number
  // TWO FRAMES, TWO SCANS. A footnote REFERENCE frame stays raw - its payload
  // is a label, which cannot hold a frame - while an inline NOTE frame carries
  // a JSON payload so that a reference or a crossref inside the note cannot end
  // the note's own frame early (render.mjs `noteFrame`, carve#1199). One
  // alternation cannot read both, and the note is consumed first because its
  // content is re-scanned below once the payload is decoded.
  const substituteNotes = (s) => s.replace(NOTE_FRAME, (m, json) => {
    let parsed
    try {
      parsed = JSON.parse(json)
    } catch {
      return m
    }
    // an inline note draws a fresh number from the SAME sequence (R2)
    order.push({ inline: inlineNotes.length })
    inlineNotes.push(parsed.content)
    const n = order.length
    return `<a id="fnref${n}" href="#fn${n}" role="doc-noteref"${parsed.attrs}><sup>${n}</sup></a>`
  })
  const substitute = (s) => substituteNotes(s).replace(/fn:([\s\S]*?)\u0002(.*?)/g, (_, payload, attrs) => {
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
  html = substitute(html)
  if (order.length === 0) return html.replace(/\uE000fnplacement\uE001\n?/g, '')

  // BODIES ARE RENDERED HERE, after the pass over the document text, and a
  // body can introduce both reference frames and further notes. So each body
  // gets both passes as it appears, and the walk is by INDEX because
  // substituting a body appends to `order`. Rendering is separated from the
  // `<li>` build because a late body can add a repeat reference to an EARLIER
  // note, whose backlink list has to count it (markup-carve/carve#1195).
  const bodies = []
  for (let i = 0; i < order.length; i++) {
    const label = order[i]
    if (typeof label === 'object') {
      // An inline note's content was rendered inline, but a reference or an
      // image reference inside it is STILL A FRAME here: the note frame carried
      // it across the document pass unresolved, so this is the first point at
      // which it can be resolved. Both passes run, exactly as they do for a
      // labelled body below. A crossref inside the content needs no pass here -
      // resolveCrossrefs runs over the whole document after this function
      // returns, and the endnotes section is part of what it returns.
      bodies.push({
        rendered: `      <p>${substitute(resolveRefs(inlineNotes[label.inline], ctx))}</p>`,
        noBlocks: false,
      })
      continue
    }
    const body = ctx.footnoteDefs.get(label)
    // `holdsAnInvisibleBlock` is set by the layout pass for a body whose only
    // content was a comment -- see its note there for why a block count
    // cannot answer this on its own.
    const noBlocks = body.length === 0 && !body.holdsAnInvisibleBlock
    const out = body.map((b) => renderBlock(b, 3, ctx)).join('\n')
    bodies.push({ rendered: substitute(resolveRefs(out, ctx)), noBlocks })
  }

  const notes = order.map((label, idx) => {
    const n = idx + 1
    let { rendered, noBlocks } = bodies[idx]
    // backlink into the LAST paragraph (PART 9 SS16); a k-th repeat
    // reference adds an indexed backlink `↩<sup>k</sup>`
    const total = counts.get(label) ?? 1
    // The accessible name is the label plus what the link VISIBLY says
    // (carve#1455): a lone backlink shows `↩` and is named by the label alone,
    // a k-th of several shows `↩<sup>k</sup>` and takes that k. Matching the
    // visible text is WCAG 2.5.3, and it is why the number is not the note's -
    // the note number is nowhere in this link's text.
    const label_ = LABELS.footnoteBacklink
    const backlink = total === 1
      ? `<a href="#fnref${n}" role="doc-backlink" aria-label="${escapeAttr(label_)}">↩</a>`
      : Array.from({ length: total }, (_, kk) => {
          const refId = kk === 0 ? `fnref${n}` : `fnref${n}-${kk + 1}`
          const name = escapeAttr(`${label_} ${kk + 1}`)
          return `<a href="#${refId}" role="doc-backlink" aria-label="${name}">↩<sup>${kk + 1}</sup></a>`
        }).join(' ')
    if (rendered.endsWith('</p>')) {
      rendered = rendered.slice(0, -4) + backlink + '</p>'
    } else {
      // A body holding NO BLOCKS renders as the empty string, and the
      // separator would then open the `<li>` with a blank line that no engine
      // emits. The shape is reachable: a definition line whose whole body is a
      // block-attribute run leaves the body empty, which is what PART 11 SS7b's
      // sentinel is written for.
      //
      // A body holding ONE block that RENDERS to nothing -- a comment -- keeps
      // the blank line, because that is what all three engines emit for it.
      // The two look identical here (`rendered` is '' either way) and are told
      // apart by the block count, not by the string.
      rendered += `${noBlocks ? '' : '\n'}      <p>${backlink}</p>`
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
    // ONE LEVEL (R4): the cloned text is not re-expanded, so every PART 9R
    // frame in it is dropped rather than resolved a second time.
    //
    // ALL THREE FRAMES, not the crossref alone. A heading is stored here as
    // rendered HTML before any resolution pass runs, so it can still hold a
    // footnote reference or an inline note, and only the crossref frame was
    // being removed - the other two rode into the reader's HTML as the framing
    // text `fn:1` and `note:...`, which is the one thing this pipeline must
    // never emit. The heading's own derived text already excludes exactly
    // these three (see `derivedText`), and R4 binds every consumer that derives
    // display text from a heading to the same clone, so the two derivations
    // agree rather than differing by which frame each remembered to strip.
    const text = hit.html.replace(/\uE000[\s\S]*?\uE001/g, '')
    return textOnly ? text : `<a href="#${hit.id}">${text}</a>`
  })
}

// --- PART 9R R3: abbreviations ----------------------------------------------
function applyAbbreviations(html, ctx) {
  if (ctx.abbrDefs.size === 0) return html
  // transform only text segments outside tags and outside code/pre
  const parts = html.split(/(<[^>]*>)/)
  let inCode = 0
  let inAbbr = 0
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i]
    if (p.startsWith('<')) {
      if (/^<(code|pre)[\s>]/.test(p)) inCode++
      else if (/^<\/(code|pre)>/.test(p)) inCode--
      if (/^<abbr[\s>]/.test(p)) inAbbr++
      else if (/^<\/abbr>/.test(p)) inAbbr--
      continue
    }
    if (inCode > 0 || inAbbr > 0 || p === '') continue
    let s = p
    for (const [term, expansion] of ctx.abbrDefs) {
      const re = new RegExp(`(^|[^\\p{L}\\p{N}])(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})(?![\\p{L}\\p{N}])`, 'gu')
      s = s.replace(re, (_, pre, hit) => `${pre}<abbr title="${escapeAttr(expansion)}">${hit}</abbr>`)
    }
    parts[i] = s
  }
  return parts.join('')
}
