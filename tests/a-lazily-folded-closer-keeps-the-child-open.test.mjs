import assert from 'node:assert/strict'
import {test} from 'node:test'
import {parse} from '../scripts/spec/layout.mjs'
import {renderDoc} from '../scripts/spec/html.mjs'

const render = source => renderDoc(parse(source))
// The run at the head's column opens with no closer (carve#4018). A run left of
// that column ends it: in the outer item from column 2, at document level below.
test('a run below the child column ends the child fence and opens where it lands', () => {
  for (const opener of [4, 5, 6]) for (const closer of [0, 1, 2, 3]) {
    const source = '- outer\n  - head\n' + ' '.repeat(opener) + '```\n' +
      ' '.repeat(opener) + 'a\n' + ' '.repeat(closer) + '```\n\n    tail\n'
    const head = '<ul>\n  <li>outer\n    <ul>\n      <li>head\n        <pre><code>a\n</code></pre>\n      </li>\n    </ul>\n'
    const expected = closer < 2
      ? head + `  </li>\n</ul>\n<pre><code>\n${' '.repeat(4 - closer)}tail\n</code></pre>`
      : head + `    <pre><code>\n${' '.repeat(4 - closer)}tail\n</code></pre>\n  </li>\n</ul>`
    assert.equal(render(source), expected, JSON.stringify({opener, closer}))
  }
})

const protectedCases = [
  {
    "name": "oc=4 cc=0 tail=2",
    "source": "- outer\n  - head\n    ```\n    a\n```\n\n  tail\n",
    "expected": "<ul>\n  <li>outer\n    <ul>\n      <li>head\n        <pre><code>a\n</code></pre>\n      </li>\n    </ul>\n  </li>\n</ul>\n<pre><code>\n  tail\n</code></pre>"
  },
  {
    "name": "oc=4 cc=1 tail=2",
    "source": "- outer\n  - head\n    ```\n    a\n ```\n\n  tail\n",
    "expected": "<ul>\n  <li>outer\n    <ul>\n      <li>head\n        <pre><code>a\n</code></pre>\n      </li>\n    </ul>\n  </li>\n</ul>\n<pre><code>\n tail\n</code></pre>"
  },
  {
    "name": "oc=4 cc=2 tail=2",
    "source": "- outer\n  - head\n    ```\n    a\n  ```\n\n  tail\n",
    "expected": "<ul>\n  <li>outer\n    <ul>\n      <li>head\n        <pre><code>a\n</code></pre>\n      </li>\n    </ul>\n    <pre><code>\ntail\n</code></pre>\n  </li>\n</ul>"
  },
  {
    "name": "oc=4 cc=3 tail=2",
    "source": "- outer\n  - head\n    ```\n    a\n   ```\n\n  tail\n",
    "expected": "<ul>\n  <li>outer\n    <ul>\n      <li>head\n        <pre><code>a\n</code></pre>\n      </li>\n    </ul>\n    <pre><code>\ntail\n</code></pre>\n  </li>\n</ul>"
  },
  {
    "name": "oc=4 cc=4 tail=2",
    "source": "- outer\n  - head\n    ```\n    a\n    ```\n\n  tail\n",
    "expected": "<ul>\n  <li><p>outer</p>\n    <ul>\n      <li>head\n        <pre><code>a\n</code></pre>\n      </li>\n    </ul>\n    <p>tail</p>\n  </li>\n</ul>"
  },
  {
    "name": "oc=4 cc=4 tail=4",
    "source": "- outer\n  - head\n    ```\n    a\n    ```\n\n    tail\n",
    "expected": "<ul>\n  <li>outer\n    <ul>\n      <li><p>head</p>\n        <pre><code>a\n</code></pre>\n        <p>tail</p>\n      </li>\n    </ul>\n  </li>\n</ul>"
  },
  {
    "name": "oc=5 cc=0 tail=2",
    "source": "- outer\n  - head\n     ```\n     a\n```\n\n  tail\n",
    "expected": "<ul>\n  <li>outer\n    <ul>\n      <li>head\n        <pre><code>a\n</code></pre>\n      </li>\n    </ul>\n  </li>\n</ul>\n<pre><code>\n  tail\n</code></pre>"
  },
  {
    "name": "oc=5 cc=1 tail=2",
    "source": "- outer\n  - head\n     ```\n     a\n ```\n\n  tail\n",
    "expected": "<ul>\n  <li>outer\n    <ul>\n      <li>head\n        <pre><code>a\n</code></pre>\n      </li>\n    </ul>\n  </li>\n</ul>\n<pre><code>\n tail\n</code></pre>"
  },
  {
    "name": "oc=5 cc=2 tail=2",
    "source": "- outer\n  - head\n     ```\n     a\n  ```\n\n  tail\n",
    "expected": "<ul>\n  <li>outer\n    <ul>\n      <li>head\n        <pre><code>a\n</code></pre>\n      </li>\n    </ul>\n    <pre><code>\ntail\n</code></pre>\n  </li>\n</ul>"
  },
  {
    "name": "oc=5 cc=3 tail=2",
    "source": "- outer\n  - head\n     ```\n     a\n   ```\n\n  tail\n",
    "expected": "<ul>\n  <li>outer\n    <ul>\n      <li>head\n        <pre><code>a\n</code></pre>\n      </li>\n    </ul>\n    <pre><code>\ntail\n</code></pre>\n  </li>\n</ul>"
  },
  {
    "name": "oc=5 cc=4 tail=2",
    "source": "- outer\n  - head\n     ```\n     a\n    ```\n\n  tail\n",
    "expected": "<ul>\n  <li><p>outer</p>\n    <ul>\n      <li>head\n        <pre><code>a\n</code></pre>\n      </li>\n    </ul>\n    <p>tail</p>\n  </li>\n</ul>"
  },
  {
    "name": "oc=5 cc=4 tail=4",
    "source": "- outer\n  - head\n     ```\n     a\n    ```\n\n    tail\n",
    "expected": "<ul>\n  <li>outer\n    <ul>\n      <li><p>head</p>\n        <pre><code>a\n</code></pre>\n        <p>tail</p>\n      </li>\n    </ul>\n  </li>\n</ul>"
  },
  {
    "name": "oc=6 cc=0 tail=2",
    "source": "- outer\n  - head\n      ```\n      a\n```\n\n  tail\n",
    "expected": "<ul>\n  <li>outer\n    <ul>\n      <li>head\n        <pre><code>a\n</code></pre>\n      </li>\n    </ul>\n  </li>\n</ul>\n<pre><code>\n  tail\n</code></pre>"
  },
  {
    "name": "oc=6 cc=1 tail=2",
    "source": "- outer\n  - head\n      ```\n      a\n ```\n\n  tail\n",
    "expected": "<ul>\n  <li>outer\n    <ul>\n      <li>head\n        <pre><code>a\n</code></pre>\n      </li>\n    </ul>\n  </li>\n</ul>\n<pre><code>\n tail\n</code></pre>"
  },
  {
    "name": "oc=6 cc=2 tail=2",
    "source": "- outer\n  - head\n      ```\n      a\n  ```\n\n  tail\n",
    "expected": "<ul>\n  <li>outer\n    <ul>\n      <li>head\n        <pre><code>a\n</code></pre>\n      </li>\n    </ul>\n    <pre><code>\ntail\n</code></pre>\n  </li>\n</ul>"
  },
  {
    "name": "oc=6 cc=3 tail=2",
    "source": "- outer\n  - head\n      ```\n      a\n   ```\n\n  tail\n",
    "expected": "<ul>\n  <li>outer\n    <ul>\n      <li>head\n        <pre><code>a\n</code></pre>\n      </li>\n    </ul>\n    <pre><code>\ntail\n</code></pre>\n  </li>\n</ul>"
  },
  {
    "name": "oc=6 cc=4 tail=2",
    "source": "- outer\n  - head\n      ```\n      a\n    ```\n\n  tail\n",
    "expected": "<ul>\n  <li><p>outer</p>\n    <ul>\n      <li>head\n        <pre><code>a\n</code></pre>\n      </li>\n    </ul>\n    <p>tail</p>\n  </li>\n</ul>"
  },
  {
    "name": "oc=6 cc=4 tail=4",
    "source": "- outer\n  - head\n      ```\n      a\n    ```\n\n    tail\n",
    "expected": "<ul>\n  <li>outer\n    <ul>\n      <li><p>head</p>\n        <pre><code>a\n</code></pre>\n        <p>tail</p>\n      </li>\n    </ul>\n  </li>\n</ul>"
  },
  {
    "name": "blank-before-run",
    "source": "- outer\n  - head\n\n    ```\n    a\n   ```\n\n    tail\n",
    "expected": "<ul>\n  <li>outer\n    <ul>\n      <li>head\n        <pre><code>a\n</code></pre>\n      </li>\n    </ul>\n    <pre><code>\n tail\n</code></pre>\n  </li>\n</ul>"
  },
  {
    "name": "outer-tail-four",
    "source": "- outer\n  - head\n     ````\n     a\n  ```\n\n  tail\n",
    "expected": "<ul>\n  <li>outer\n    <ul>\n      <li>head\n        <pre><code>a\n</code></pre>\n      </li>\n    </ul>\n    <pre><code>\ntail\n</code></pre>\n  </li>\n</ul>"
  },
  {
    "name": ">  oc=4 cc=0",
    "source": "> - outer\n>   - head\n>     ```\n>     a\n> ```\n> \n>   tail\n",
    "expected": "<blockquote>\n  <ul>\n    <li>outer\n      <ul>\n        <li>head\n          <pre><code>a\n</code></pre>\n        </li>\n      </ul>\n    </li>\n  </ul>\n  <pre><code>\n  tail\n</code></pre>\n</blockquote>"
  },
  {
    "name": ">  oc=4 cc=1",
    "source": "> - outer\n>   - head\n>     ```\n>     a\n>  ```\n> \n>   tail\n",
    "expected": "<blockquote>\n  <ul>\n    <li>outer\n      <ul>\n        <li>head\n          <pre><code>a\n</code></pre>\n        </li>\n      </ul>\n    </li>\n  </ul>\n  <pre><code>\n tail\n</code></pre>\n</blockquote>"
  },
  {
    "name": ">  oc=4 cc=2",
    "source": "> - outer\n>   - head\n>     ```\n>     a\n>   ```\n> \n>   tail\n",
    "expected": "<blockquote>\n  <ul>\n    <li>outer\n      <ul>\n        <li>head\n          <pre><code>a\n</code></pre>\n        </li>\n      </ul>\n      <pre><code>\ntail\n</code></pre>\n    </li>\n  </ul>\n</blockquote>"
  },
  {
    "name": ">  oc=4 cc=3",
    "source": "> - outer\n>   - head\n>     ```\n>     a\n>    ```\n> \n>   tail\n",
    "expected": "<blockquote>\n  <ul>\n    <li>outer\n      <ul>\n        <li>head\n          <pre><code>a\n</code></pre>\n        </li>\n      </ul>\n      <pre><code>\ntail\n</code></pre>\n    </li>\n  </ul>\n</blockquote>"
  },
  {
    "name": ">  oc=5 cc=0",
    "source": "> - outer\n>   - head\n>      ```\n>      a\n> ```\n> \n>   tail\n",
    "expected": "<blockquote>\n  <ul>\n    <li>outer\n      <ul>\n        <li>head\n          <pre><code>a\n</code></pre>\n        </li>\n      </ul>\n    </li>\n  </ul>\n  <pre><code>\n  tail\n</code></pre>\n</blockquote>"
  },
  {
    "name": ">  oc=5 cc=1",
    "source": "> - outer\n>   - head\n>      ```\n>      a\n>  ```\n> \n>   tail\n",
    "expected": "<blockquote>\n  <ul>\n    <li>outer\n      <ul>\n        <li>head\n          <pre><code>a\n</code></pre>\n        </li>\n      </ul>\n    </li>\n  </ul>\n  <pre><code>\n tail\n</code></pre>\n</blockquote>"
  },
  {
    "name": ">  oc=5 cc=2",
    "source": "> - outer\n>   - head\n>      ```\n>      a\n>   ```\n> \n>   tail\n",
    "expected": "<blockquote>\n  <ul>\n    <li>outer\n      <ul>\n        <li>head\n          <pre><code>a\n</code></pre>\n        </li>\n      </ul>\n      <pre><code>\ntail\n</code></pre>\n    </li>\n  </ul>\n</blockquote>"
  },
  {
    "name": ">  oc=5 cc=3",
    "source": "> - outer\n>   - head\n>      ```\n>      a\n>    ```\n> \n>   tail\n",
    "expected": "<blockquote>\n  <ul>\n    <li>outer\n      <ul>\n        <li>head\n          <pre><code>a\n</code></pre>\n        </li>\n      </ul>\n      <pre><code>\ntail\n</code></pre>\n    </li>\n  </ul>\n</blockquote>"
  },
  {
    "name": ">  oc=6 cc=0",
    "source": "> - outer\n>   - head\n>       ```\n>       a\n> ```\n> \n>   tail\n",
    "expected": "<blockquote>\n  <ul>\n    <li>outer\n      <ul>\n        <li>head\n          <pre><code>a\n</code></pre>\n        </li>\n      </ul>\n    </li>\n  </ul>\n  <pre><code>\n  tail\n</code></pre>\n</blockquote>"
  },
  {
    "name": ">  oc=6 cc=1",
    "source": "> - outer\n>   - head\n>       ```\n>       a\n>  ```\n> \n>   tail\n",
    "expected": "<blockquote>\n  <ul>\n    <li>outer\n      <ul>\n        <li>head\n          <pre><code>a\n</code></pre>\n        </li>\n      </ul>\n    </li>\n  </ul>\n  <pre><code>\n tail\n</code></pre>\n</blockquote>"
  },
  {
    "name": ">  oc=6 cc=2",
    "source": "> - outer\n>   - head\n>       ```\n>       a\n>   ```\n> \n>   tail\n",
    "expected": "<blockquote>\n  <ul>\n    <li>outer\n      <ul>\n        <li>head\n          <pre><code>a\n</code></pre>\n        </li>\n      </ul>\n      <pre><code>\ntail\n</code></pre>\n    </li>\n  </ul>\n</blockquote>"
  },
  {
    "name": ">  oc=6 cc=3",
    "source": "> - outer\n>   - head\n>       ```\n>       a\n>    ```\n> \n>   tail\n",
    "expected": "<blockquote>\n  <ul>\n    <li>outer\n      <ul>\n        <li>head\n          <pre><code>a\n</code></pre>\n        </li>\n      </ul>\n      <pre><code>\ntail\n</code></pre>\n    </li>\n  </ul>\n</blockquote>"
  },
  {
    "name": "1.  oc=4 cc=0",
    "source": "1. - outer\n1.   - head\n1.     ```\n1.     a\n1. ```\n1. \n1.   tail\n",
    "expected": "<ol>\n  <li>\n    <ul>\n      <li>outer</li>\n    </ul>\n  </li>\n  <li>\n    <ul>\n      <li>head</li>\n    </ul>\n  </li>\n  <li>\n    <pre><code></code></pre>\n  </li>\n  <li>a</li>\n  <li>\n    <pre><code></code></pre>\n  </li>\n</ol>\n<p>1.\n1.   tail</p>"
  },
  {
    "name": "1.  oc=4 cc=1",
    "source": "1. - outer\n1.   - head\n1.     ```\n1.     a\n1.  ```\n1. \n1.   tail\n",
    "expected": "<ol>\n  <li>\n    <ul>\n      <li>outer</li>\n    </ul>\n  </li>\n  <li>\n    <ul>\n      <li>head</li>\n    </ul>\n  </li>\n  <li>\n    <pre><code></code></pre>\n  </li>\n  <li>a</li>\n  <li>\n    <pre><code></code></pre>\n  </li>\n</ol>\n<p>1.\n1.   tail</p>"
  },
  {
    "name": "1.  oc=4 cc=2",
    "source": "1. - outer\n1.   - head\n1.     ```\n1.     a\n1.   ```\n1. \n1.   tail\n",
    "expected": "<ol>\n  <li>\n    <ul>\n      <li>outer</li>\n    </ul>\n  </li>\n  <li>\n    <ul>\n      <li>head</li>\n    </ul>\n  </li>\n  <li>\n    <pre><code></code></pre>\n  </li>\n  <li>a</li>\n  <li>\n    <pre><code></code></pre>\n  </li>\n</ol>\n<p>1.\n1.   tail</p>"
  },
  {
    "name": "1.  oc=4 cc=3",
    "source": "1. - outer\n1.   - head\n1.     ```\n1.     a\n1.    ```\n1. \n1.   tail\n",
    "expected": "<ol>\n  <li>\n    <ul>\n      <li>outer</li>\n    </ul>\n  </li>\n  <li>\n    <ul>\n      <li>head</li>\n    </ul>\n  </li>\n  <li>\n    <pre><code></code></pre>\n  </li>\n  <li>a</li>\n  <li>\n    <pre><code></code></pre>\n  </li>\n</ol>\n<p>1.\n1.   tail</p>"
  },
  {
    "name": "1.  oc=5 cc=0",
    "source": "1. - outer\n1.   - head\n1.      ```\n1.      a\n1. ```\n1. \n1.   tail\n",
    "expected": "<ol>\n  <li>\n    <ul>\n      <li>outer</li>\n    </ul>\n  </li>\n  <li>\n    <ul>\n      <li>head</li>\n    </ul>\n  </li>\n  <li>\n    <pre><code></code></pre>\n  </li>\n  <li>a</li>\n  <li>\n    <pre><code></code></pre>\n  </li>\n</ol>\n<p>1.\n1.   tail</p>"
  },
  {
    "name": "1.  oc=5 cc=1",
    "source": "1. - outer\n1.   - head\n1.      ```\n1.      a\n1.  ```\n1. \n1.   tail\n",
    "expected": "<ol>\n  <li>\n    <ul>\n      <li>outer</li>\n    </ul>\n  </li>\n  <li>\n    <ul>\n      <li>head</li>\n    </ul>\n  </li>\n  <li>\n    <pre><code></code></pre>\n  </li>\n  <li>a</li>\n  <li>\n    <pre><code></code></pre>\n  </li>\n</ol>\n<p>1.\n1.   tail</p>"
  },
  {
    "name": "1.  oc=5 cc=2",
    "source": "1. - outer\n1.   - head\n1.      ```\n1.      a\n1.   ```\n1. \n1.   tail\n",
    "expected": "<ol>\n  <li>\n    <ul>\n      <li>outer</li>\n    </ul>\n  </li>\n  <li>\n    <ul>\n      <li>head</li>\n    </ul>\n  </li>\n  <li>\n    <pre><code></code></pre>\n  </li>\n  <li>a</li>\n  <li>\n    <pre><code></code></pre>\n  </li>\n</ol>\n<p>1.\n1.   tail</p>"
  },
  {
    "name": "1.  oc=5 cc=3",
    "source": "1. - outer\n1.   - head\n1.      ```\n1.      a\n1.    ```\n1. \n1.   tail\n",
    "expected": "<ol>\n  <li>\n    <ul>\n      <li>outer</li>\n    </ul>\n  </li>\n  <li>\n    <ul>\n      <li>head</li>\n    </ul>\n  </li>\n  <li>\n    <pre><code></code></pre>\n  </li>\n  <li>a</li>\n  <li>\n    <pre><code></code></pre>\n  </li>\n</ol>\n<p>1.\n1.   tail</p>"
  },
  {
    "name": "1.  oc=6 cc=0",
    "source": "1. - outer\n1.   - head\n1.       ```\n1.       a\n1. ```\n1. \n1.   tail\n",
    "expected": "<ol>\n  <li>\n    <ul>\n      <li>outer</li>\n    </ul>\n  </li>\n  <li>\n    <ul>\n      <li>head</li>\n    </ul>\n  </li>\n  <li>\n    <pre><code></code></pre>\n  </li>\n  <li>a</li>\n  <li>\n    <pre><code></code></pre>\n  </li>\n</ol>\n<p>1.\n1.   tail</p>"
  },
  {
    "name": "1.  oc=6 cc=1",
    "source": "1. - outer\n1.   - head\n1.       ```\n1.       a\n1.  ```\n1. \n1.   tail\n",
    "expected": "<ol>\n  <li>\n    <ul>\n      <li>outer</li>\n    </ul>\n  </li>\n  <li>\n    <ul>\n      <li>head</li>\n    </ul>\n  </li>\n  <li>\n    <pre><code></code></pre>\n  </li>\n  <li>a</li>\n  <li>\n    <pre><code></code></pre>\n  </li>\n</ol>\n<p>1.\n1.   tail</p>"
  },
  {
    "name": "1.  oc=6 cc=2",
    "source": "1. - outer\n1.   - head\n1.       ```\n1.       a\n1.   ```\n1. \n1.   tail\n",
    "expected": "<ol>\n  <li>\n    <ul>\n      <li>outer</li>\n    </ul>\n  </li>\n  <li>\n    <ul>\n      <li>head</li>\n    </ul>\n  </li>\n  <li>\n    <pre><code></code></pre>\n  </li>\n  <li>a</li>\n  <li>\n    <pre><code></code></pre>\n  </li>\n</ol>\n<p>1.\n1.   tail</p>"
  },
  {
    "name": "1.  oc=6 cc=3",
    "source": "1. - outer\n1.   - head\n1.       ```\n1.       a\n1.    ```\n1. \n1.   tail\n",
    "expected": "<ol>\n  <li>\n    <ul>\n      <li>outer</li>\n    </ul>\n  </li>\n  <li>\n    <ul>\n      <li>head</li>\n    </ul>\n  </li>\n  <li>\n    <pre><code></code></pre>\n  </li>\n  <li>a</li>\n  <li>\n    <pre><code></code></pre>\n  </li>\n</ol>\n<p>1.\n1.   tail</p>"
  }
]

test('neighboring fence and host readings stay fixed', () => {
  for (const {name, source, expected} of protectedCases) {
    assert.equal(render(source), expected, name)
  }
})
