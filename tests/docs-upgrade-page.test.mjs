import test from 'node:test'
import assert from 'node:assert/strict'
import { cpSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { build, guideIds } from '../scripts/docs-upgrade-page.mjs'

const page = readFileSync('docs/upgrade-0-2.md', 'utf8')
const guide = readFileSync('spec/0.2/UPGRADING.md', 'utf8')

test('every U- row the upgrade guide names is on the upgrade page', () => {
  const linked = new Set(page.match(/\[(U-\d+)\]\(/g)?.map((link) => link.slice(1, -2)))
  const missing = guideIds(guide).filter((id) => !linked.has(id))
  assert.deepEqual(missing, [])
})

test('the upgrade page and the construct index are current', () => {
  const { page: built, guide: indexed, errors } = build()
  assert.deepEqual(errors, [])
  assert.equal(page, built, 'run npm run docs:upgrade:write')
  assert.equal(guide, indexed, 'run npm run docs:upgrade:write')
})

test('a map row in no section fails the build', () => {
  const root = mkdtempSync(join(tmpdir(), 'docs-upgrade-page-'))
  for (const path of ['scripts/docs-upgrade-page.json', 'spec/0.2/data/upgrade-map.json', 'spec/0.2/UPGRADING.md']) {
    cpSync(path, join(root, path), { recursive: true })
  }
  const configPath = join(root, 'scripts/docs-upgrade-page.json')
  const config = JSON.parse(readFileSync(configPath, 'utf8'))
  config.sections[0].rows = config.sections[0].rows.filter((id) => id !== 'U-001')
  writeFileSync(configPath, JSON.stringify(config))
  assert.deepEqual(build(root).errors, ['U-001 of the upgrade map is in no section of scripts/docs-upgrade-page.json'])
})

function copyRoot(edit) {
  const root = mkdtempSync(join(tmpdir(), 'docs-upgrade-page-'))
  for (const path of ['scripts/docs-upgrade-page.json', 'spec/0.2/data/upgrade-map.json', 'spec/0.2/UPGRADING.md']) {
    cpSync(path, join(root, path), { recursive: true })
  }
  const configPath = join(root, 'scripts/docs-upgrade-page.json')
  const config = JSON.parse(readFileSync(configPath, 'utf8'))
  edit(config)
  writeFileSync(configPath, JSON.stringify(config))
  return root
}

test('a 0.2 sample that lints after fmt needs a reason', () => {
  const root = copyRoot((config) => { delete config.samples['U-111'] })
  assert.deepEqual(build(root).errors, ['U-111: the 0.2 sample lints after carve fmt (unused-link-reference-definition); give a reason in samples of scripts/docs-upgrade-page.json'])
})

test('a reason for a 0.2 sample that passes lint is stale', () => {
  const root = copyRoot((config) => { config.samples['U-001'] = 'stale' })
  assert.deepEqual(build(root).errors, ['U-001: the 0.2 sample passes lint; drop its entry from samples of scripts/docs-upgrade-page.json'])
})

test('each sample marker on the page comes from a reason in the config', () => {
  const markers = page.match(/<!-- carve-sample \{"(lint|skip)":/g) ?? []
  const { samples } = JSON.parse(readFileSync('scripts/docs-upgrade-page.json', 'utf8'))
  assert.equal(markers.length, Object.keys(samples).length)
})
