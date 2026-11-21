// The 0.2 engine reports UTF-8 byte offsets; the editor and JS strings use UTF-16 offsets.
export function utf16Offsets(source: string): number[] {
  const positions: number[] = []
  let bytes = 0
  let utf16 = 0
  for (const scalar of source) {
    const codePoint = scalar.codePointAt(0)!
    const width = codePoint < 0x80 ? 1 : codePoint < 0x800 ? 2 : codePoint < 0x10000 ? 3 : 4
    for (let index = 0; index < width; index++) positions[bytes + index] = utf16
    bytes += width
    utf16 += scalar.length
  }
  positions[bytes] = utf16
  return positions
}

/** Maps a UTF-8 byte offset of `source` to its UTF-16 offset, clamped to the text. */
export function byteToUtf16(source: string): (byteOffset: number) => number {
  const offsets = utf16Offsets(source)
  return (byteOffset) => offsets[Math.max(0, Math.min(offsets.length - 1, byteOffset))] ?? source.length
}

export type ByteEdit = { startOffset: number; endOffset: number; text: string }

/** Applies edits given in UTF-8 byte ranges. Edits that overlap an earlier one are skipped. */
export function applyByteEdits(source: string, edits: readonly ByteEdit[]): { text: string; applied: number } {
  const toUtf16 = byteToUtf16(source)
  const sorted = [...edits].sort((a, b) => a.startOffset - b.startOffset || a.endOffset - b.endOffset)
  let text = ''
  let at = 0
  let applied = 0
  for (const edit of sorted) {
    const from = toUtf16(edit.startOffset)
    const to = Math.max(from, toUtf16(edit.endOffset))
    if (from < at) continue
    text += source.slice(at, from) + edit.text
    at = to
    applied++
  }
  return { text: text + source.slice(at), applied }
}
