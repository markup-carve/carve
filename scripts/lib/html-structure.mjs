import { parseFragment } from 'parse5'

// Diagnostic only: canonical bytes remain the conformance oracle.
export function compareHtmlStructure(expected, actual) {
  if (expected === actual) return 'identical'
  const left = project(expected)
  const right = project(actual)
  if (left === null || right === null) return 'unclassified'
  return JSON.stringify(left) === JSON.stringify(right)
    ? 'same structure'
    : 'different structure'
}

function project(html) {
  let repaired = false
  const fragment = parseFragment(html, {
    sourceCodeLocationInfo: true,
    onParseError() { repaired = true },
  })
  function visit(node) {
    if (node.nodeName === '#text') return ['text', node.value]
    if (node.nodeName === '#comment') return ['comment', node.data]
    if (node.nodeName === '#document-fragment') return node.childNodes.map(visit)
    // Implied elements indicate that the parser supplied structure.
    if (!node.sourceCodeLocation) repaired = true
    const location = node.sourceCodeLocation
    if (location?.startTag && !location.endTag
      && (node.namespaceURI !== 'http://www.w3.org/1999/xhtml'
        || !voidElements.has(node.tagName))) repaired = true
    // HTML discards one initial newline in these elements before tree creation.
    if (['pre', 'textarea', 'listing'].includes(node.tagName) && location?.startTag
      && /^[\r\n]/.test(html.slice(location.startTag.endOffset))) repaired = true
    const attrs = node.attrs.map(({ name, value, namespace, prefix }) =>
      [namespace ?? '', prefix ?? '', name, value])
      .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)))
    return [node.namespaceURI, node.tagName, attrs,
      (node.content?.childNodes ?? node.childNodes).map(visit)]
  }
  const tree = visit(fragment)
  return repaired ? null : tree
}

const voidElements = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img',
  'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'])
