// Shiki skips empty lines before passing them to TextMate. A single space
// makes it advance the grammar state across a paragraph break. Token ranges
// are mapped back to the unchanged editor document below.
export function sourceForShiki(source) {
  return source.split('\n').map((line) => line === '' ? ' ' : line).join('\n')
}

export function editorTokenRanges(source, tokenLines) {
  const sourceLines = source.split('\n')
  const ranges = []
  let lineStart = 0
  for (let index = 0; index < sourceLines.length; index++) {
    const sourceLine = sourceLines[index]
    let column = 0
    for (const token of tokenLines[index] ?? []) {
      const end = column + token.content.length
      if (sourceLine.length && end <= sourceLine.length && end > column) {
        ranges.push({ from: lineStart + column, to: lineStart + end, token })
      }
      column = end
    }
    lineStart += sourceLine.length + 1
  }
  return ranges
}

export function insertMarkerOverride(ranges, at, mark) {
  for (let index = ranges.length - 1; index >= 0; index--) {
    const range = ranges[index]
    if (range.from > at || at >= range.to) continue
    ranges.splice(index, 1)
    if (range.from < at) ranges.push({ ...range, to: at })
    if (at + 1 < range.to) ranges.push({ ...range, from: at + 1 })
  }
  ranges.push({ from: at, to: at + 1, mark })
}
