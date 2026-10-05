/*
 * Engine-free statement of PART 9 §19 I1a: what `{{ path #name }}` selects
 * from a parsed child. It walks a PART 12 AST and nothing else, so the
 * selection rule is checkable before any engine implements it.
 */

import { readFileSync } from 'node:fs'

const NOT_SELECTABLE = new Set([
  'footnote',
  'link_reference_definition',
  'abbreviation_def',
  'citation_definition',
  'comment',
  'frontmatter',
])

/* R4 folds case and compares NFC forms. */
const key = (id) => id.normalize('NFC').toLowerCase()

const schema = JSON.parse(readFileSync(new URL('../../resources/ast-schema.json', import.meta.url), 'utf8'))
const BLOCK_TYPES = new Set(schema.$defs.blockNode.properties.type.enum)

const isBlock = (node) => node !== null && typeof node === 'object' && BLOCK_TYPES.has(node.type)
/* A list item, a table row or cell, a definition-list entry: never selected,
   but the blocks inside one are. Definition-list entries carry no `type`. */
const PART_TYPES = new Set(['list_item', 'table_row', 'table_cell', 'definition_term', 'definition_description'])
const isPart = (node) => node !== null && typeof node === 'object' && !Array.isArray(node) && (PART_TYPES.has(node.type) || node.type === undefined)

/* `image` is both a block and an inline type, so an array is never classified
   by its elements alone: these nodes and fields hold inline content. */
const INLINE_OWNERS = new Set(['paragraph', 'heading', 'line_block'])
const INLINE_FIELDS = new Set(['terms', 'caption', 'alt'])

/*
 * The block sequences directly inside `node`. `document.footnoteDefs` is never
 * visited and a `footnote` node is never descended into.
 */
function childSequences(node) {
  if (node.type === 'footnote' || INLINE_OWNERS.has(node.type)) return []
  const out = []
  for (const [field, value] of Object.entries(node)) {
    if (field === 'footnoteDefs' || INLINE_FIELDS.has(field)) continue
    // A cell's `children` are inline; its block content is `blocks`.
    if (node.type === 'table_cell' && field === 'children') continue
    if (isBlock(value)) out.push([value])
    if (!Array.isArray(value) || !value.length) continue
    if (value.every(Array.isArray)) out.push(...value.filter((v) => v.length && v.every(isBlock)))
    else if (value.every(isBlock)) out.push(value)
    else if (value.every(isPart)) for (const part of value) out.push(...childSequences(part))
  }
  return out
}

/* The first (sequence, index) in document order whose block passes `test`. */
function first(seq, test) {
  for (let i = 0; i < seq.length; i++) {
    if (test(seq[i])) return { seq, index: i }
    for (const inner of childSequences(seq[i])) {
      const hit = first(inner, test)
      if (hit) return hit
    }
  }
  return null
}

/**
 * The blocks `#name` selects from `doc`, or null when it selects nothing.
 * `headingId(h)` supplies a heading's id (explicit or auto slug).
 */
export function selectFragment(doc, name, headingId = (h) => h.attrs?.id) {
  const wanted = key(name)
  const named = (id) => typeof id === 'string' && key(id) === wanted
  const body = doc.children ?? []

  const heading = first(body, (b) => b.type === 'heading' && named(headingId(b)))
  if (heading) {
    const { seq, index } = heading
    let end = index + 1
    while (end < seq.length && !(seq[end].type === 'heading' && seq[end].level <= seq[index].level)) end++
    return seq.slice(index, end)
  }

  const block = first(body, (b) => b.type !== 'heading' && !NOT_SELECTABLE.has(b.type) && named(b.attrs?.id))
  return block ? [block.seq[block.index]] : null
}
