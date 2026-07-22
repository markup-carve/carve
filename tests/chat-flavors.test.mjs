/*
 * Chat-flavor table validation.
 *
 * The flavor tables in resources/chat-flavors/ are data, not code: an
 * implementation reads them to render a Carve document into the markup a chat
 * client accepts. This runner needs no renderer, so the tables stay checkable
 * here even though the spec repo ships no chat implementation of its own.
 *
 * The tables are NON-NORMATIVE and versioned separately (see manifest.json).
 * Chat syntax is set by vendors and changes on their schedule; binding it to
 * the spec version would make Discord's roadmap force a Carve revision.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const flavorDir = resolve(here, '../resources/chat-flavors')

const manifest = JSON.parse(readFileSync(resolve(flavorDir, 'manifest.json'), 'utf8'))

/*
 * The normative node-type vocabulary, read from docs/profiles.md rather than
 * copied. A copy goes stale silently: when the vocabulary gained six types,
 * a hardcoded list here kept passing while every flavor was missing them.
 */
const profiles = readFileSync(resolve(here, '../docs/profiles.md'), 'utf8')

function vocabulary(label) {
  const section = profiles.match(new RegExp(`\\*\\*${label}:\\*\\*([\\s\\S]*?)\\n\\n`))
  assert.ok(section, `no ${label} vocabulary paragraph in docs/profiles.md`)

  return [...section[1].matchAll(/`([A-Za-z0-9_-]+)`/g)].map((m) => m[1])
}

const BLOCK_TYPES = vocabulary('Block')
const INLINE_TYPES = vocabulary('Inline')

const SUPPORT = ['native', 'none']
const FALLBACK = ['unwrap', 'carve', 'inline', 'codeblock', 'appendix', 'drop']
const LINK_STYLES = ['none', 'markdown', 'slackPipe', 'html']
const ESCAPE_MECHANISMS = ['backslash', 'entities', 'none']
const OUTPUT_MODES = ['markup', 'ranges']
const OFFSET_UNITS = ['utf16', 'utf8', 'codepoints']

function load(id) {
  return JSON.parse(readFileSync(resolve(flavorDir, `${id}.json`), 'utf8'))
}

/** Resolves `extends` so a derived flavor is checked as it finally reads. */
function resolved(id, seen = []) {
  assert.ok(!seen.includes(id), `flavor extends cycle at "${id}"`)
  const own = load(id)
  if (!own.extends) {
    return own
  }

  const parent = resolved(own.extends, [...seen, id])

  // A declared node entry replaces the inherited one outright; merging meant a
  // child could not dislodge a key it did not restate.
  return {
    ...parent,
    ...own,
    nodes: { ...(parent.nodes ?? {}), ...(own.nodes ?? {}) },
  }
}

test('manifest lists exactly the flavor files present', () => {
  const files = readdirSync(flavorDir)
    .filter((name) => name.endsWith('.json') && name !== 'manifest.json')
    .map((name) => name.slice(0, -5))
    .sort()

  assert.deepEqual(files, [...manifest.flavors].sort())
})

test('the tables declare themselves non-normative and separately versioned', () => {
  assert.equal(manifest.normative, false)
  assert.match(manifest.version, /^\d+\.\d+\.\d+$/)
})

for (const id of manifest.flavors) {
  test(`${id}: covers the whole normative node vocabulary`, () => {
    const flavor = resolved(id)
    for (const type of [...BLOCK_TYPES, ...INLINE_TYPES]) {
      assert.ok(
        flavor.nodes?.[type],
        `${id} has no entry for "${type}", so those nodes would degrade unchecked`,
      )
    }
  })

  test(`${id}: uses only known vocabulary`, () => {
    const flavor = resolved(id)

    assert.ok(LINK_STYLES.includes(flavor.link?.style ?? 'none'), `${id}: bad link.style`)
    assert.ok(
      ESCAPE_MECHANISMS.includes(flavor.escape?.mechanism ?? 'none'),
      `${id}: bad escape.mechanism`,
    )
    assert.ok(OUTPUT_MODES.includes(flavor.output ?? 'markup'), `${id}: bad output`)
    assert.ok(OFFSET_UNITS.includes(flavor.offsets ?? 'utf16'), `${id}: bad offsets`)

    for (const [type, config] of Object.entries(flavor.nodes ?? {})) {
      assert.ok(SUPPORT.includes(config.support), `${id}.${type}: bad support "${config.support}"`)
      if (config.fallback !== undefined) {
        assert.ok(
          FALLBACK.includes(config.fallback),
          `${id}.${type}: bad fallback "${config.fallback}"`,
        )
      }
    }
  })

  test(`${id}: carries a verification date`, () => {
    const flavor = resolved(id)
    assert.match(
      flavor.verified ?? '',
      /^\d{4}-\d{2}-\d{2}$/,
      `${id} must record when its syntax was last checked against the vendor`,
    )
  })

  test(`${id}: a range-based flavor names a style for what it supports`, () => {
    const flavor = resolved(id)
    if ((flavor.output ?? 'markup') !== 'ranges') {
      return
    }

    // A range-based target sends plain text, so a supported mark that names no
    // style would arrive as unformatted text with nothing carrying it.
    for (const type of ['strong', 'emphasis', 'strike', 'code']) {
      const config = flavor.nodes?.[type]
      if (config?.support === 'native') {
        assert.ok(config.style, `${id}.${type}: native in a ranges flavor but names no style`)
      }
    }
  })
}
