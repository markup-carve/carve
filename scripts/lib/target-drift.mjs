import { readFileSync } from 'node:fs'

const TARGETS = new Set(['html', 'markdown', 'plain', 'ansi', 'carve'])
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

// A fixture can identify two lagging engines against a third, or all three
// engines against its own output. Require one declaration per lagging engine.
export function targetDriftKeys(target, slug, outputs, entries, expected = null) {
  if (outputs.length !== 3 || outputs.some(([, value]) => value.startsWith('ERROR:'))) return null
  const unique = new Set(outputs.map(([, value]) => value))
  if (unique.size === 1) {
    if (expected === null || unique.has(expected)) return null
    const keys = outputs.map(([engine]) => `${target}/${engine}/${slug}`)
    return keys.every(key => entries.has(key)) ? keys : null
  }
  if (unique.size !== 2) return null
  const lone = targetDriftKey(target, slug, outputs, entries)
  if (lone !== null) {
    const peerValue = outputs.find(([name]) => name !== lone.split('/')[1])?.[1]
    if (expected === null || peerValue === expected) return [lone]
  }
  const pair = outputs.filter(([, value]) => outputs.filter(([, other]) => other === value).length === 2)
  if (pair.length !== 2) return null
  const singleton = outputs.find(([, value]) => value !== pair[0][1])
  if (expected !== null && singleton?.[1] !== expected) return null
  const keys = pair.map(([engine]) => `${target}/${engine}/${slug}`)
  return keys.every(key => entries.has(key)) ? keys : null
}
