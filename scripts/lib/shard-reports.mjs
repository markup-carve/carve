import { createHash } from 'node:crypto'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { parseShard, selectShard } from './shard.mjs'

export function populationFingerprint(values) {
  return createHash('sha256').update(JSON.stringify(values)).digest('hex')
}

export function readShardReports(directory, mode) {
  return readdirSync(directory).filter(name => name.startsWith(`${mode}-`) && name.endsWith('.json'))
    .sort().map(name => JSON.parse(readFileSync(resolve(directory, name), 'utf8')))
}

export function verifyShardReports(reports, population, mode) {
  if (!reports.length) throw new Error(`No ${mode} shard reports`)
  const total = reports[0].shard?.total
  const indices = new Set()
  const covered = new Set()
  for (const report of reports) {
    if (!report.complete || report.mode !== mode) throw new Error(`Incomplete ${mode} shard report`)
    const shard = parseShard(`${report.shard?.index}/${report.shard?.total}`)
    if (shard.total !== total || indices.has(shard.index)) throw new Error('Duplicate or inconsistent shard index')
    indices.add(shard.index)
    if (report.population !== populationFingerprint(population)) throw new Error('Shard population differs from the full corpus')
    if (JSON.stringify(report.revisions) !== JSON.stringify(reports[0].revisions)) throw new Error('Engine revisions differ between shards')
    const expected = selectShard(population, shard)
    if (JSON.stringify(report.documents) !== JSON.stringify(expected)) throw new Error(`Shard ${shard.index} omitted or added a document`)
    for (const document of report.documents) {
      if (covered.has(document)) throw new Error(`Document measured twice: ${document}`)
      covered.add(document)
    }
  }
  if (indices.size !== total || covered.size !== population.length) throw new Error('Shard union does not cover the full corpus')
  return reports
}
