#!/usr/bin/env node
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const git = (...args) => execFileSync('git', ['-C', root, ...args], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 })
export function blobId(bytes) {
  return createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex')
}
export function sharedFiles(current, pinned) {
  return [...current.keys()].filter(name => pinned.every(tree => tree.get(name) === current.get(name)))
}

export function sharedDocuments(current, pinned) {
  const shared = new Set(sharedFiles(current, pinned))
  return [...current.keys()].filter(name => name.endsWith('.crv')).filter(name => {
    const stem = name.slice(0, -4)
    return shared.has(name) && shared.has(`${stem}.html`) && [...current.keys()]
      .filter(file => file.startsWith(`${stem}.`)).every(file => shared.has(file))
  })
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const output = resolve(process.argv[2] ?? '/tmp/carve-formatter-corpus')
  const pins = {}
  const trees = []
  for (const engine of ['js', 'rs', 'php']) {
    const directory = process.env[`CARVE_${engine.toUpperCase()}_DIR`]
    if (!directory) throw new Error(`CARVE_${engine.toUpperCase()}_DIR is required`)
    const path = engine === 'js' ? 'spec' : 'tests/spec'
    const entry = execFileSync('git', ['-C', directory, 'ls-tree', 'HEAD', '--', path], { encoding: 'utf8' })
    const pin = /^160000 commit ([a-f0-9]{40})\t/.exec(entry)?.[1]
    if (!pin) throw new Error(`${engine} has no recorded spec pin`)
    try { git('merge-base', '--is-ancestor', pin, 'HEAD') }
    catch { throw new Error(`${engine} spec pin ${pin} is not reachable from the checked-out corpus`) }
    pins[engine] = pin
    trees.push(new Map(git('ls-tree', '-r', '-z', pin, '--', 'tests/corpus').split('\0').filter(Boolean).map(row => {
      const match = /^100644 blob ([a-f0-9]{40})\ttests\/corpus\/(.+)$/.exec(row)
      if (!match) throw new Error(`Unexpected corpus entry: ${row}`)
      return [match[2], match[1]]
    })))
  }
  const current = new Map(readdirSync(resolve(root, 'tests/corpus')).map(name => [name, blobId(readFileSync(resolve(root, 'tests/corpus', name)))]))
  const shared = new Set(sharedFiles(current, trees))
  const documents = [...current.keys()].filter(name => name.endsWith('.crv'))
  const included = sharedDocuments(current, trees)
  if (!included.length) throw new Error('No unchanged corpus documents at all engine pins')
  mkdirSync(output, { recursive: false })
  for (const name of included) {
    const stem = name.slice(0, -4)
    for (const file of shared) if (file === name || file === `${stem}.html` || file.startsWith(`${stem}.`) && !file.endsWith('.crv')) {
      writeFileSync(resolve(output, file), readFileSync(resolve(root, 'tests/corpus', file)))
    }
  }
  const report = { pins, included: included.length, excluded: documents.filter(name => !included.includes(name)) }
  writeFileSync(`${output}.json`, JSON.stringify(report, null, 2) + '\n')
  console.log(JSON.stringify(report, null, 2))
}
