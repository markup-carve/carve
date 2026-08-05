/*
 * SCALAR-FIELD signatures for the three-way engine comparison.
 *
 * `shapeOf` in ./ast-shape.mjs keeps a node's `type` and any child that is
 * itself an object or array. Every SCALAR is skipped, so the shape comparison
 * answers "do the engines build the same tree" and not "do they put the same
 * VALUES in it". Both questions matter and only the first was being asked:
 *
 *   shapeOf({type:'table_cell', align:'right', children:[...]})
 *   shapeOf({type:'table_cell',                children:[...]})
 *   // identical
 *
 * Five known divergences live in exactly that gap - a table cell's `align`
 * (carve#784), a crossref's `href` (carve-php#877), a fence title's `order`
 * (carve#785), a generated heading id (carve#750) and, until it was fixed, a
 * stale footnote number (carve#758). Each renders identically in all three
 * engines, so corpus conformance cannot see them either, and each was found by
 * hand.
 *
 * The schema does not close it: every one of those fields is OPTIONAL, so a
 * tree that omits it validates exactly as well as one that carries it. That is
 * right for a schema - a programmatically built tree may lack them - and it is
 * why "validates" and "agrees" are different questions.
 */

/** Fields that are positions rather than content; compared elsewhere. */
const POSITION_KEYS = new Set([
  'pos', 'startLine', 'endLine', 'startColumn', 'endColumn', 'startOffset', 'endOffset',
  'srcByteLength',
])

/**
 * One entry per node, in document order: `type` plus every scalar field it
 * carries, sorted by key.
 *
 * `attrs` is flattened rather than skipped - it holds `id`, `classes` and
 * `keyValues`, which is where the heading-id and fence-title divergences sit -
 * but its ORDER array is compared as a whole, since that is the field's meaning.
 */
export function valueSignature(node, out = [], path = '$') {
  if (Array.isArray(node)) {
    node.forEach((n, i) => valueSignature(n, out, `${path}[${i}]`))

    return out
  }
  if (!node || typeof node !== 'object') return out

  if (typeof node.type === 'string') {
    const fields = []
    for (const key of Object.keys(node).sort()) {
      if (key === 'type' || POSITION_KEYS.has(key)) continue
      const value = node[key]
      if (value === null || typeof value !== 'object') {
        fields.push(`${key}=${JSON.stringify(value)}`)
      } else if (key === 'attrs') {
        for (const attrKey of Object.keys(value).sort()) {
          fields.push(`attrs.${attrKey}=${JSON.stringify(value[attrKey])}`)
        }
      }
    }
    out.push({ path, type: node.type, fields })
  }

  for (const [key, value] of Object.entries(node)) {
    if (POSITION_KEYS.has(key) || key === 'attrs') continue
    if (value && typeof value === 'object') valueSignature(value, out, `${path}.${key}`)
  }

  return out
}

/**
 * Where the engines disagree about a VALUE, keyed by `type.field` rather than
 * by document.
 *
 * Keyed that way on purpose: each known divergence is one field behaving one
 * way everywhere it appears, so a per-document list would be 107 entries
 * describing five facts. `table_cell.align` is one line whether it shows up in
 * five documents or fifty.
 *
 * Returns `[{ key, engines, sample }]` - `engines` maps each engine to what it
 * published, `sample` is a document exhibiting it.
 */
export function compareValues(signaturesByEngine, documentName) {
  const engines = [...signaturesByEngine.keys()]
  const lengths = new Set(engines.map((e) => signaturesByEngine.get(e).length))
  // Different node counts is a SHAPE disagreement; ast-shape.mjs reports it,
  // and pairing values across trees of different lengths would compare
  // unrelated nodes and invent divergences that are not there.
  if (lengths.size !== 1) return []

  const count = signaturesByEngine.get(engines[0]).length
  const found = []
  for (let i = 0; i < count; i += 1) {
    const nodes = new Map(engines.map((e) => [e, signaturesByEngine.get(e)[i]]))
    const types = new Set([...nodes.values()].map((n) => n.type))
    if (types.size !== 1) continue // shape disagreement again

    const keys = new Set()
    for (const node of nodes.values()) {
      for (const f of node.fields) keys.add(f.slice(0, f.indexOf('=')))
    }
    for (const key of keys) {
      const published = new Map()
      for (const [engine, node] of nodes) {
        const hit = node.fields.find((f) => f.startsWith(`${key}=`))
        published.set(engine, hit === undefined ? '(absent)' : hit.slice(key.length + 1))
      }
      if (new Set(published.values()).size === 1) continue
      found.push({
        key: `${[...types][0]}.${key}`,
        engines: Object.fromEntries(published),
        sample: documentName,
      })
    }
  }

  return found
}
