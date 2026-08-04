/*
 * The reference-build pin means one thing.
 *
 * `package.json` names the `@markup-carve/carve` commit this repo measures
 * against, and every human-readable claim about "the pinned build" reads that
 * field. What actually gets installed is the LOCKFILE's resolution, because CI
 * runs `npm ci`. When the two disagree, `npm run engine:report` is describing a
 * build the repo does not declare, and `resources/engine-pin-drift.txt` records
 * drift against that other build - so both the report and the drift file can be
 * green while the stated pin is fiction.
 *
 * They can disagree by accident: `npm run bump-carve-pin` writes package.json
 * and then PRINTS "Now run: npm install". Skip that line - or land the bump
 * without committing the regenerated lock - and the two part company silently.
 * Found 16 commits apart (carve#661).
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const pkg = JSON.parse(readFileSync(resolve(repo, 'package.json'), 'utf8'))
const lock = JSON.parse(readFileSync(resolve(repo, 'package-lock.json'), 'utf8'))

const SHA = /[0-9a-f]{40}/

test('the carve-js pin in package.json is the one the lockfile installs', () => {
  const declared = pkg.devDependencies['@markup-carve/carve'] ?? pkg.dependencies['@markup-carve/carve']
  assert.ok(declared, 'no @markup-carve/carve dependency in package.json')

  const entry = lock.packages?.['node_modules/@markup-carve/carve']
  assert.ok(entry, 'no @markup-carve/carve entry in package-lock.json')

  const declaredSha = declared.match(SHA)?.[0]
  const lockedSha = String(entry.resolved ?? '').match(SHA)?.[0]

  assert.ok(declaredSha, `package.json pin has no commit: ${declared}`)
  assert.ok(lockedSha, `lockfile resolution has no commit: ${entry.resolved}`)
  assert.equal(
    lockedSha,
    declaredSha,
    'package.json and package-lock.json name DIFFERENT carve-js commits. ' +
      'CI installs the lockfile one, so the report and the drift file describe ' +
      'that build while the repo declares the other. Run `npm install` after ' +
      '`npm run bump-carve-pin` and commit the lockfile with it.',
  )
})
