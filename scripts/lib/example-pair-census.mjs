/*
 * AN INDEPENDENT CENSUS OF THE PAIRS THE EXAMPLE SOURCE DECLARES.
 *
 * `scanExampleSource` extracts pairs. Asking it how many pairs the source
 * declares gets its own answer back, which is why the two reconcile checks in
 * generate-corpus.mjs used to be `1 === 1` and could not see a block whose
 * second, third and fourth pairs were being overwritten before anything was
 * written to disk (carve#1373).
 *
 * So this counter exists to disagree. It shares no code with the scanner and is
 * written differently on purpose: it tracks fences by their literal opening run
 * rather than by a language-specific pattern, it knows nothing about sections,
 * slugs, numbering or modifiers, and it returns counts rather than content. Its
 * only job is to say, per `::: compare` block, how many `carve` and `html`
 * fences the author put there. A reconcile that compares that against what the
 * scanner produced can fail; one that compares the scanner against itself
 * cannot.
 */

const leadingRun = (s, ch) => {
  let n = 0
  while (n < s.length && s[n] === ch) n++
  return n
}

/**
 * @param {string[]} lines source lines of the example markdown
 * @returns {{line: number, marker: string, carve: number, html: number, unclosed?: true}[]}
 *   one entry per `::: compare` block, in source order
 */
export const censusComparePairs = (lines) => {
  const blocks = []
  let block = null
  let fence = null

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Inside a fence nothing is markup: an example whose CONTENT is a fenced
    // block (a ````carve holding a ``` mermaid) must not be read as one.
    if (fence !== null) {
      if (line.startsWith(fence) && line.slice(fence.length).trim() === '') fence = null
      continue
    }

    const ticks = leadingRun(line, '`')
    if (ticks >= 3) {
      fence = line.slice(0, ticks)
      const info = line.slice(ticks).trim()
      if (block !== null && info === 'carve') block.carve++
      if (block !== null && info === 'html') block.html++
      continue
    }

    const trimmed = line.trim()
    const colons = leadingRun(trimmed, ':')
    if (colons >= 3) {
      if (block === null) {
        const rest = trimmed.slice(colons)
        if (/^[ \t]+compare(?:[ \t]|$)/.test(rest)) {
          block = { line: i + 1, marker: trimmed.slice(0, colons), carve: 0, html: 0 }
        }
        continue
      }
      if (trimmed === block.marker) {
        blocks.push(block)
        block = null
      }
    }
  }

  if (block !== null) blocks.push({ ...block, unclosed: true })
  return blocks
}
