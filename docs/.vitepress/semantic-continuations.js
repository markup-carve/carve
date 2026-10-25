import { parse } from '@markup-carve/carve'

// TextMate reads one line at a time, so it cannot decide whether a standalone
// `+` attaches to the next block. The parser has already made that decision.
// A refused `+` remains in a leaf node as text; an accepted marker does not.
export function standaloneContinuationOffsets(source, ast) {
  const candidates = []
  let lineStart = 0
  let lineNumber = 1
  for (const line of source.split('\n')) {
    if (/^[ \t]*\+[ \t]*$/.test(line)) {
      const index = line.indexOf('+')
      candidates.push({ offset: lineStart + index, line: lineNumber, column: [...line.slice(0, index)].length + 1 })
    }
    lineStart += line.length + 1
    lineNumber++
  }
  if (!candidates.length) return []
  if (ast === null) return []

  const occupied = []
  const visit = (node) => {
    if (!node || typeof node !== 'object') return
    if (Array.isArray(node)) return node.forEach(visit)
    // A link keeps its multi-line title on the parent node, outside its label children.
    if (node.type === 'link' && node.pos) occupied.push(node.pos)
    const children = []
    for (const [key, value] of Object.entries(node)) {
      if (key !== 'pos' && key !== 'attrs' && value && typeof value === 'object') children.push(value)
    }
    if (children.length) children.forEach(visit)
    else if (Number.isInteger(node.pos?.startLine) && Number.isInteger(node.pos?.endLine)) {
      occupied.push(node.pos)
    }
  }
  try {
    visit(ast === undefined ? parse(source, { positions: true }) : ast)
  } catch {
    return []
  }
  return candidates.filter(({ line, column }) => !occupied.some((pos) =>
    line >= pos.startLine && line <= pos.endLine &&
    (line !== pos.startLine || column >= pos.startColumn) &&
    (line !== pos.endLine || column < pos.endColumn),
  )).map(({ offset }) => offset)
}
