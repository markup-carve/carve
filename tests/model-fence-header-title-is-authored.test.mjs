import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source))

test('a fence header title follows the attribute line above the fence', () => {
  assert.equal(
    html('{.x}\n```php "src/Auth.php"\ncomposer require x\n```\n'),
    '<pre class="x" title="src/Auth.php"><code class="language-php">composer require x\n</code></pre>',
  )
  assert.match(html('{#i k=v .x}\n```js "a" [L]\nc\n```\n'), /^<pre id="i" k="v" class="x" title="a">/)
  assert.match(html('> {.x}\n> ```"t"\n> c\n> ```\n'), /<pre class="x" title="t">/)
})

test('an authored title still replaces the header title', () => {
  assert.match(html('{title="w" .x}\n```js "h"\nc\n```\n'), /^<pre title="w" class="x"><code/)
})
