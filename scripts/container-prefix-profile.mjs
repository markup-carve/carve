#!/usr/bin/env node
import { writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'
import { createHash } from 'node:crypto'
const option = key => process.argv.find(a => a.startsWith(`--${key}=`))?.slice(key.length + 3)
const modulePath = option('module'), output = option('report')
if (!modulePath || !output) throw new Error('Provide --module=/path/parser.js and --report=/path/report.json')
const { parse } = await import(pathToFileURL(resolve(modulePath)).href)
const rows = []
for (const marker of ['> ', '- ', '1. ']) for (const follower of ['', 'tail\n']) for (const depth of [32, 64, 128]) {
  const source = marker.repeat(depth) + 'end\n' + follower
  let until = performance.now() + 50
  while (performance.now() < until) parse(source)
  const timings = []
  for (let batch = 0; batch < 5; batch++) {
    let calls = 0
    const start = performance.now()
    do { parse(source); calls++ } while (performance.now() - start < 30)
    timings.push((performance.now() - start) / calls)
  }
  const exec = RegExp.prototype.exec
  let regexCalls = 0
  RegExp.prototype.exec = function(value) { regexCalls++; return Reflect.apply(exec, this, [value]) }
  let ast
  try { ast = parse(source) } finally { RegExp.prototype.exec = exec }
  rows.push({ marker, follower, depth, bytes: Buffer.byteLength(source), regexCalls,
    medianMs: timings.sort((a, b) => a - b)[2],
    astSha256: createHash('sha256').update(JSON.stringify(ast)).digest('hex') })
}
writeFileSync(output, JSON.stringify({ node: process.version, rows }, null, 2) + '\n')
