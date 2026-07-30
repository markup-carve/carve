/*
 * Reference-build behavior the corpus cannot express.
 *
 * The corpus fixtures are plain source/HTML pairs, so they cannot state what a
 * RENDER OPTION does. These cases pin option-driven output through the pinned
 * `@markup-carve/carve` build (see the pin in package.json), which is also the
 * build the docs Playground ships.
 *
 * Corpus conformance itself does NOT live here: tests/corpus.test.mjs renders
 * through the executable spec, and each engine checks itself against the corpus
 * via its own spec submodule.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { carveToHtml } from '@markup-carve/carve'

test('mentions and tags render as non-link spans by default', () => {
  assert.equal(
    carveToHtml('Hey @alice, see #release-1.0.').trim(),
    '<p>Hey <span class="mention"><strong>@alice</strong></span>, see <span class="tag"><strong>#release-1.0</strong></span>.</p>',
  )
})

test('mentions and tags render as links when URL templates are configured', () => {
  assert.equal(
    carveToHtml('Hey @alice, see #release-1.0.', {
      mentionUrl: 'https://github.com/{user}',
      tagUrl: '/topics/{name}',
    }).trim(),
    '<p>Hey <a class="mention" href="https://github.com/alice">@alice</a>, see <a class="tag" href="/topics/release-1.0">#release-1.0</a>.</p>',
  )
})

test('mention and tag URL templates replace every placeholder occurrence', () => {
  assert.equal(
    carveToHtml('Hey @john.doe, see #release-1.0.', {
      mentionUrl: '/users/{user}?q={user}',
      tagUrl: '/topics/{name}?tag={name}',
    }).trim(),
    '<p>Hey <a class="mention" href="/users/john.doe?q=john.doe">@john.doe</a>, see <a class="tag" href="/topics/release-1.0?tag=release-1.0">#release-1.0</a>.</p>',
  )
})
