/*
 * Runs core corpus rows through one copy of the spec model and prints the rows
 * whose HTML differs from the committed file. Stops at the first such row
 * unless the job asks for the full set. A throw counts as a differing row.
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const [modelRoot, jobPath] = process.argv.slice(2)
const job = JSON.parse(readFileSync(jobPath, 'utf8'))
const { parse } = await import(pathToFileURL(resolve(modelRoot, 'scripts/spec/layout.mjs')))
const { renderDoc } = await import(pathToFileURL(resolve(modelRoot, 'scripts/spec/html.mjs')))

const failing = []
for (const row of job.rows) {
  const source = readFileSync(resolve(job.corpusDir, `${row}.crv`), 'utf8')
  const expected = readFileSync(resolve(job.corpusDir, `${row}.html`), 'utf8').trim()
  let actual
  try {
    actual = renderDoc(parse(source)).trim()
  } catch {
    actual = null
  }
  if (actual !== expected) {
    failing.push(row)
    if (!job.full) break
  }
}
process.stdout.write(JSON.stringify({ failing }))
