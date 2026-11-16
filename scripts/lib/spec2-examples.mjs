// The one extractor of the examples of the nine 0.2 documents. spec2-trees.mjs and spec2-conformance.mjs read
// the examples through it, so the tree gate and the conformance corpus see the same inputs.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

export const DOCUMENTS = ['syntax-blocks', 'syntax-inline', 'ast', 'html', 'writer', 'source-layout', 'includes', 'extensions', 'import-html']

export const HEADER = /^Example (\d+) \((generated|unverified|verified)([^)]*)\)\s*$/
export const FENCE = /^(`{3,}|~{3,})(\w*)\s*$/
const CLAUSE = /^\*\*(?:Exception )?(C2-[A-Z]-\d{3})\*\*/
const FILE_LINE = /^File `([^`]+)`:\s*$/
// The line of an example that states what is reported: the only source of its expected diagnostics.
export const REPORTED = /^Reported: /
const FILE_BYTES = /^File `([^`]+)` holds the (?:\w+ )?bytes `([0-9A-F]{2}(?: [0-9A-F]{2})*)`/
// The end of an example: the next example, clause or heading.
const endsExample = (line) => HEADER.test(line) || /^(\*\*|#)/.test(line)
export const flagsOf = (text) => text.split(',').map(flag => flag.replaceAll('`', '').trim()).filter(Boolean)

/** The fence that starts at `line`: its language, its body and the line after its closer. */
export function fenceAt(lines, line) {
  const open = FENCE.exec(lines[line] ?? '')
  if (!open) return null
  let end = line + 1
  while (end < lines.length && lines[end] !== open[1]) end++
  return { lang: open[2], body: lines.slice(line + 1, end).join('\n'), next: end + 1 }
}

/** The clause ids of the section around `line`: from the heading before it to the next heading. */
function sectionClauses(lines, line) {
  let start = line
  while (start > 0 && !/^#/.test(lines[start])) start--
  let end = line + 1
  while (end < lines.length && !/^#/.test(lines[end])) end++
  const ids = []
  for (let at = start; at < end; at++) {
    const clause = CLAUSE.exec(lines[at])
    if (clause) ids.push(clause[1])
  }
  return { heading: lines[start].replace(/^#+\s*/, ''), clauses: ids }
}

/**
 * Every example of one document. Each has `document`, `number`, `status`, `flags`, `section`, `clauses`, the
 * fences in order (`lang`, `body`, `label`: the line of text above the fence inside the example), `files` of an
 * include example (a `File` line and its fence, or its bytes), and `reported`, the `Reported:` lines of the example.
 */
export function examplesOf(spec, document) {
  const lines = readFileSync(join(spec, `${document}.md`), 'utf8').split('\n')
  const out = []
  for (let at = 0; at < lines.length; at++) {
    const header = HEADER.exec(lines[at])
    if (!header) continue
    const fences = []
    const files = {}
    const reported = []
    let label = null
    let line = at + 1
    while (line < lines.length && !endsExample(lines[line])) {
      const named = FILE_LINE.exec(lines[line])
      const bytes = FILE_BYTES.exec(lines[line])
      if (named) {
        let fence = line + 1
        while (fence < lines.length && !FENCE.test(lines[fence])) fence++
        const block = fenceAt(lines, fence)
        files[named[1]] = { text: `${block.body}\n`, lang: block.lang }
        line = block.next
        continue
      }
      if (bytes) files[bytes[1]] = { bytes: bytes[2] }
      const block = fenceAt(lines, line)
      if (block) {
        fences.push({ lang: block.lang, body: block.body, label })
        label = null
        line = block.next
        continue
      }
      const text = lines[line].trim()
      if (text && !text.startsWith(':::')) {
        label = text
        if (REPORTED.test(text)) reported.push(text)
      }
      line++
    }
    const { heading, clauses } = sectionClauses(lines, at)
    out.push({
      document,
      number: Number(header[1]),
      status: header[2],
      flags: flagsOf(header[3]),
      section: heading,
      clauses,
      fences,
      files,
      reported,
      line: at + 1,
    })
  }
  return out
}

/** Every example of the nine documents, in document order. */
export const allExamples = (spec) => DOCUMENTS.flatMap(document => examplesOf(spec, document))
