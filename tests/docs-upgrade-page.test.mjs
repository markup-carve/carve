import test from 'node:test'
import assert from 'node:assert/strict'
import { cpSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { build, guideIds } from '../scripts/docs-upgrade-page.mjs'

const pagePaths = ['docs/upgrade-0-2.md', ...readdirSync('docs/upgrade-0-2').sort().map((name) => `docs/upgrade-0-2/${name}`)]
const page = pagePaths.map((path) => readFileSync(path, 'utf8')).join('\n')
const guide = readFileSync('spec/0.2/UPGRADING.md', 'utf8')

test('every U- row the upgrade guide names is on the upgrade pages', () => {
  const listed = new Set(page.match(/^(?:\*\*|- )(U-\d+)\b/gm)?.map((line) => line.replace(/^(?:\*\*|- )/, '')))
  const missing = guideIds(guide).filter((id) => !listed.has(id))
  assert.deepEqual(missing, [])
})

test('the upgrade pages and the construct index are current', () => {
  const { files, guide: indexed, errors } = build()
  assert.deepEqual(errors, [])
  for (const [path, text] of files) assert.equal(readFileSync(path, 'utf8'), text, `${path}: run npm run docs:upgrade:write`)
  assert.equal(guide, indexed, 'run npm run docs:upgrade:write')
})

test('the upgrade pages link the spec only from their closing paragraph', () => {
  for (const path of pagePaths) {
    const stray = readFileSync(path, 'utf8').split('\n').filter((line) => line.includes('/blob/main/spec/') && !line.startsWith('**Specification (external):**'))
    assert.deepEqual(stray, [], path)
  }
})

test('every old section anchor maps to the page that holds it', () => {
  const anchors = JSON.parse(readFileSync('docs/.vitepress/theme/upgrade-anchors.json', 'utf8'))
  const { sections } = JSON.parse(readFileSync('scripts/docs-upgrade-page.json', 'utf8'))
  assert.deepEqual(Object.keys(anchors).sort(), [...sections.map((section) => section.key), 'withdrawn'].sort())
  for (const [key, target] of Object.entries(anchors)) {
    const text = readFileSync(`docs/upgrade-0-2/${target.split('#')[0]}.md`, 'utf8')
    assert.ok(text.includes(`{#${key}}`), `${key} -> ${target}`)
  }
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
