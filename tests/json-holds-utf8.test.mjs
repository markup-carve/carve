/*
 * A JSON data file in this repo holds real UTF-8, not `\uXXXX` escapes.
 *
 * Both forms parse to the same string, so nothing downstream notices - which is
 * exactly why this rots. Editing one entry of a JSON file by parsing it and
 * writing it back runs the whole file through the serializer, and a serializer
 * that escapes non-ASCII (Python's `json.dump` does by default) rewrites every
 * untouched line that held a section sign, an arrow or an accented letter. The
 * change is invisible to the schema, invisible to the tests, and visible to the
 * next human who opens the file or reads the diff.
 *
 * It happened twice before this test existed. `resources/ast-schema.json`
 * carried five section signs written as escapes, and adding one case to
 * `tests/corpus-optional/manifest.json` in carve#1252 rewrote two unrelated
 * descriptions the same way - caught in review rather than by anything here,
 * on a docs PR whose diff was supposed to be one entry long.
 *
 * Scope is JSON on purpose. In Markdown an escape is literal text a reader
 * sees, so a doc that discusses escapes has to be able to write one; in JSON it
 * is a serializer artifact with no reason to exist by hand.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/**
 * The files the repository actually owns, from git rather than from a directory
 * walk with a skip list.
 *
 * A walk has to name what to leave out, and the first version of this test got
 * that wrong twice over: it skipped every dot-directory, which hid the
 * hand-written editor grammars under `docs/.vitepress`, and once that was fixed
 * it started reporting a stale copy of a fixture inside an agent worktree under
 * `.claude`. Tracked-or-not is the line that was wanted both times, and git
 * already knows it.
 */
const jsonFiles = () =>
  execFileSync('git', ['ls-files', '-z', '*.json'], { cwd: root, encoding: 'utf8' })
    .split('\0')
    .filter(Boolean)

/**
 * Files where the escape IS the subject.
 *
 * `profile-fixtures.json` pins what smart typography produces, and its cases
 * turn on the difference between an en dash and an em dash - two glyphs that
 * are one pixel apart in most fonts. There the escape is the unambiguous
 * spelling of the thing under test, which is the one situation that earns it.
 */
const ALLOWED = new Set(['tests/profile-fixtures.json'])

/**
 * An escape for a character JSON could have held directly.
 *
 * Control characters below U+0020 have no literal form in JSON, so an escape
 * there is the only spelling and never a defect. Everything above ASCII does
 * have one, and that is what this test is about.
 */
const ESCAPE = /\\u[0-9a-fA-F]{4}/g
const isAvoidable = (escape) => JSON.parse(`"${escape}"`).codePointAt(0) > 0x7e


test('every JSON file holds its non-ASCII characters as themselves', () => {
  const offenders = []
  for (const file of jsonFiles()) {
    if (ALLOWED.has(file)) continue
    const text = readFileSync(resolve(root, file), 'utf8')
    const found = (text.match(ESCAPE) ?? []).filter(isAvoidable)
    if (!found.length) continue
    const shown = [...new Set(found)]
      .map((escape) => `${escape} (${JSON.parse(`"${escape}"`)})`)
      .join(', ')
    offenders.push(`${file}: ${shown}`)
  }

  assert.deepEqual(
    offenders,
    [],
    'a JSON file gained an ASCII escape for a character it used to hold directly. '
    + 'Write the character itself: in Python pass ensure_ascii=False, in PHP '
    + 'JSON_UNESCAPED_UNICODE. Better still, edit the entry in place instead of '
    + 're-serializing the whole file, so the diff stays the size of the change.',
  )
})

test('the scan reaches the dot-directories that hold authored JSON', () => {
  // A directory walk skipping every dot-prefixed name quietly put
  // `docs/.vitepress` - hand-written editor grammars, JSON full of non-ASCII -
  // outside a test that claims to cover the repository. A check that cannot
  // reach the files it is about passes for the wrong reason.
  const scanned = jsonFiles()
  assert.ok(
    scanned.some((file) => file.startsWith('docs/.vitepress/')),
    'the walker descends into docs/.vitepress',
  )
})

test('the allowlist names files that exist, and only ones that need it', () => {
  // An allowlist entry that stops matching a real file is a hole nobody can
  // see: the test keeps passing while the file it was meant to cover is gone,
  // renamed, or has been cleaned up and no longer needs the exemption.
  for (const file of ALLOWED) {
    const text = readFileSync(resolve(root, file), 'utf8')
    assert.ok(
      (text.match(ESCAPE) ?? []).some(isAvoidable),
      `${file} is allowlisted but holds no avoidable escapes; drop it from the list`,
    )
  }
})
