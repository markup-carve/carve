import { readFileSync } from 'node:fs'

const TARGETS = new Set(['html', 'markdown', 'plain', 'ansi'])
const ENGINES = new Set(['js', 'php', 'rust'])

export function parseTargetDrift(path) {
  const entries = new Map()
  for (const [index, raw] of readFileSync(path, 'utf8').split('\n').entries()) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const match = /^(\w+)\/(\w+)\/([a-z0-9-]+) {2,}(.+)$/.exec(line)
    if (!match) throw new Error(`${path}:${index + 1}: expected target/engine/slug  reason`)
    const [, target, engine, slug, reason] = match
    if (!TARGETS.has(target) || !ENGINES.has(engine)) {
      throw new Error(`${path}:${index + 1}: unsupported target or engine`)
    }
    if (!/[A-Za-z0-9-]+\/[A-Za-z0-9-]+#[0-9]+/.test(reason)) {
      throw new Error(`${path}:${index + 1}: reason must cite an owner/repo#N issue`)
    }
    const key = `${target}/${engine}/${slug}`
    if (entries.has(key)) throw new Error(`${path}:${index + 1}: duplicate ${key}`)
    entries.set(key, { target, engine, slug, reason })
  }
  return entries
}

export function targetDriftKey(target, slug, outputs, entries) {
  if (outputs.length !== 3 || outputs.some(([, value]) => value.startsWith('ERROR:'))) return null
  const byEngine = new Map(outputs)
  if (byEngine.size !== 3) return null
  for (const engine of ENGINES) {
    const key = `${target}/${engine}/${slug}`
    if (!entries.has(key) || !byEngine.has(engine)) continue
    const others = outputs.filter(([name]) => name !== engine).map(([, value]) => value)
    if (others.length === 2 && others[0] === others[1] && byEngine.get(engine) !== others[0]) {
      return key
    }
  }
  return null
}
