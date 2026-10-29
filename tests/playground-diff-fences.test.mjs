import assert from 'node:assert/strict'
import { test } from 'node:test'
import { carveToHtml, parse } from '@markup-carve/carve'
import { isDiffCodeBlock, isDiffPre } from '../docs/.vitepress/diff-fences.js'

function element(tagName, className = '', parentElement = null) {
  const classes = className.split(/\s+/).filter(Boolean)
  return { tagName, parentElement, classList: { contains: (c) => classes.includes(c) } }
}

function diffBlocks(source) {
  const found = []
  const visit = (value, parent) => {
    if (value === null || typeof value !== 'object') return
    if (Array.isArray(value)) return value.forEach((item) => visit(item, parent))
    if (isDiffCodeBlock(value, parent)) found.push(value.content)
    for (const [key, child] of Object.entries(value)) {
      if (key !== 'pos' && key !== 'attrs') visit(child, value)
    }
  }
  visit(parse(source))
  return found
}

const CAPTIONED = '{#lst-a .diff}\n```php\n-a\n+b\n```\n^ Listing #: x\n'

test('the captioned diff fence renders the class on the figure', () => {
  assert.match(carveToHtml(CAPTIONED), /<figure id="lst-a" class="diff">\s*<pre><code class="language-php">/)
})

test('isDiffPre accepts pre.diff and figure.diff > pre', () => {
  assert.equal(isDiffPre(element('PRE', 'diff')), true)
  assert.equal(isDiffPre(element('PRE', '', element('FIGURE', 'diff'))), true)
  assert.equal(isDiffPre(element('PRE', '', element('FIGURE', 'wide diff'))), true)
})

test('isDiffPre rejects near-miss classes and non-figure parents', () => {
  assert.equal(isDiffPre(element('PRE', 'side-diff')), false)
  assert.equal(isDiffPre(element('PRE', '', element('FIGURE', 'diffs'))), false)
  assert.equal(isDiffPre(element('PRE', '', element('DIV', 'diff'))), false)
  assert.equal(isDiffPre(element('PRE')), false)
})

test('isDiffCodeBlock finds captioned and uncaptioned diff fences in the AST', () => {
  assert.deepEqual(diffBlocks(CAPTIONED), ['-a\n+b\n'])
  assert.deepEqual(diffBlocks('{.diff}\n```php\n-a\n+b\n```\n'), ['-a\n+b\n'])
  assert.deepEqual(diffBlocks('```diff\n-a\n```\n'), ['-a\n'])
})

test('isDiffCodeBlock ignores near-miss classes on figure and code block', () => {
  assert.deepEqual(diffBlocks('{#lst-a .diffs}\n```php\n-a\n```\n^ Listing #: x\n'), [])
  assert.deepEqual(diffBlocks('{.side-diff}\n```php\n-a\n```\n'), [])
})
