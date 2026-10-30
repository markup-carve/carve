import assert from 'node:assert/strict'
import {test} from 'node:test'
import {parse} from '../scripts/spec/layout.mjs'
import {renderDoc} from '../scripts/spec/html.mjs'

const rows = [
  {
    "id": "gen-224",
    "source": ">  ::: |\n :::",
    "html": "<blockquote>\n  <div class=\"line-block\">\n\n  </div>\n</blockquote>\n<div>\n\n</div>\n"
  },
  {
    "id": "gen-249",
    "source": "> 1. :: t\n   : para",
    "html": "<blockquote>\n  <ol>\n    <li>\n      <dl>\n        <dt>t</dt>\n      </dl>\n    </li>\n  </ol>\n</blockquote>\n<p>: para</p>\n"
  },
  {
    "id": "gen-250",
    "source": "```\n```\n- > :: t\n```",
    "html": "<pre><code></code></pre>\n<ul>\n  <li>\n    <blockquote>\n      <dl>\n        <dt>t</dt>\n      </dl>\n    </blockquote>\n  </li>\n</ul>\n<pre><code></code></pre>\n"
  },
  {
    "id": "gen-299",
    "source": "> - :: term\n  : definition",
    "html": "<blockquote>\n  <ul>\n    <li>\n      <dl>\n        <dt>term</dt>\n      </dl>\n    </li>\n  </ul>\n</blockquote>\n<p>: definition</p>\n"
  },
  {
    "id": "gen-346",
    "source": "- :: t\n:  ",
    "html": "<ul>\n  <li>\n    <dl>\n      <dt>t\n:</dt>\n    </dl>\n  </li>\n</ul>\n"
  },
  {
    "id": "gen-351",
    "source": "- - ```\n    x\n\n[^1]: a",
    "html": "<ul>\n  <li>\n    <ul>\n      <li>\n        <pre><code>x\n\n</code></pre>\n      </li>\n    </ul>\n  </li>\n</ul>\n"
  },
  {
    "id": "gen-362",
    "source": "- a\n  [^f]: t\n[^f]: a\n     [r]: /url\n[r][]",
    "html": "<ul>\n  <li>a</li>\n</ul>\n<p><a href=\"/url\">r</a></p>\n"
  },
  {
    "id": "gen-249-column-zero",
    "source": "> - :: t\n: d",
    "html": "<blockquote>\n  <ul>\n    <li>\n      <dl>\n        <dt>t</dt>\n      </dl>\n    </li>\n  </ul>\n</blockquote>\n<p>: d</p>\n"
  }
]

for (const {id, source, html} of rows) {
  test(id, () => assert.equal(renderDoc(parse(source)) + '\n', html))
}

const payload = (source) => renderDoc(parse(source)).match(/<code>([^<]*)<\/code>/)[1]
const FENCE = '```'

test('a nested marker-line fence keeps the blank at every depth and for every follower', () => {
  for (const depth of [1, 2, 3]) {
    const lead = '- '.repeat(depth)
    const pad = ' '.repeat(2 * depth)
    for (const follower of ['tail', '[^1]: a', '[r]: /u', '{.x}', '']) {
      for (const end of ['', '\n']) {
        const source = `${lead}${FENCE}\n${pad}x\n\n${follower}${end}`
        const expected = follower === '' && end === '\n' ? 'x\n\n\n' : 'x\n\n'
        assert.equal(payload(source), expected, JSON.stringify(source))
      }
    }
  }
})

test('an interior blank in a nested marker-line fence is kept once', () => {
  assert.equal(payload(`- - ${FENCE}\n    x\n\n    y\n\ntail\n`), 'x\n\ny\n\n')
  assert.equal(payload(`- - ${FENCE}\n\n    x\n\ntail\n`), '\nx\n\n')
})

test('a continuation marker ends the nested fence before the blank', () => {
  assert.equal(payload(`- - ${FENCE}\n+\n\ntail\n`), '')
})

test('an unterminated fence below a closed description leaves the item', () => {
  for (const block of ['    ---', '        | a |', '  {#x}']) {
    const html = renderDoc(parse(`- :: t\n  : para\n${block}\n${FENCE}\nx\n`))
    assert.match(html, /<\/ul>\n<pre><code>x\n<\/code><\/pre>\n?$/, block)
  }
})
