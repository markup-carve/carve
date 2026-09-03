/*
 * PART 12 §16 THE INDEX BASIS AND ITS THREE EXEMPTIONS, RUN
 * (markup-carve/carve#1556).
 *
 * The clause says a step's index counts among ALL of the parent's child nodes,
 * and for three element kinds it does not: the traversal renumbers a list's
 * items, a table's rows and a row's cells, so `<li>`, `<tr>` and `<td>`/`<th>`
 * are numbered among their own kind. That came in with the convergence on one
 * convention (markup-carve/carve#1257, point 5), and the clause read as
 * universal for two months, which is how markup-carve/carve#1556 came to ask
 * whether the `<li>` case was a defect.
 *
 * WHY THIS EXISTS BESIDE THE FIXTURE. `tests/html-import/traversal-shaped-index`
 * pins the three exemptions on one document, and the contract check runs it. A
 * fixture can only pin the shapes it spells: it cannot say the list of
 * exemptions is CLOSED. The failure this file exists to catch is a fourth kind
 * joining quietly, which is exactly how the `<li>` case arrived - unremarked, in
 * an importer whose every other kind counted children.
 *
 * SO THE PROPERTY IS MEASURED, NOT THE NUMBER. Hard-coding a path per kind
 * samples the vocabulary and would stay green while an unsampled kind changed
 * basis. Instead each shape is imported twice, once with a newline inserted
 * between two ELEMENT siblings and once without, and the question is only
 * whether the index MOVED. A kind that counts children moves by exactly one;
 * a kind the traversal renumbers does not move at all. The insertion goes
 * between two elements on purpose: dropped next to a text node it would grow
 * that node instead of adding one, and every kind would look stable.
 */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'

/* The three exemptions, as step names. `<td>` and `<th>` are one rule. */
const EXEMPT = new Set(['li', 'tr', 'td', 'th'])

/*
 * A shape per element kind the importer reports a path for: a prefix that ends
 * in a complete element sibling, the target carrying a loss, and the closing
 * markup.
 */
const SHAPES = [
  ['li', '<ul><li>a</li>', '<li onclick="x()">b</li>', '</ul>'],
  ['tr', '<table><tr><td>a</td></tr>', '<tr onclick="x()"><td>b</td></tr>', '</table>'],
  ['td', '<table><tr><td>a</td>', '<td onclick="x()">b</td>', '</tr></table>'],
  ['th', '<table><tr><th>a</th>', '<th onclick="x()">b</th>', '</tr></table>'],
  ['dd', '<dl><dt>t</dt>', '<dd onclick="x()">v</dd>', '</dl>'],
  ['dt', '<dl><dt>s</dt><dd>u</dd>', '<dt onclick="x()">t</dt><dd>v</dd>', '</dl>'],
  ['p', '<div><p>a</p>', '<p onclick="x()">b</p>', '</div>'],
  ['summary', '<details>', '<summary onclick="x()">S</summary><p>b</p>', '</details>'],
  ['colgroup', '<table><caption>C</caption>', '<colgroup span="2" onclick="x()"><col></colgroup>', '<tr><td>a</td></tr></table>'],
  ['h2', '<div><p>a</p>', '<h2 onclick="x()">H</h2>', '</div>'],
  ['blockquote', '<div><p>a</p>', '<blockquote onclick="x()"><p>q</p></blockquote>', '</div>'],
  ['pre', '<div><p>a</p>', '<pre onclick="x()"><code>c</code></pre>', '</div>'],
  ['ul', '<div><p>a</p>', '<ul onclick="x()"><li>a</li></ul>', '</div>'],
  ['section', '<div><p>a</p>', '<section onclick="x()"><p>b</p></section>', '</div>'],
  ['aside', '<div><p>a</p>', '<aside onclick="x()"><p>b</p></aside>', '</div>'],
  ['hr', '<div><p>a</p>', '<hr onclick="x()">', '</div>'],
  ['table', '<div><p>a</p>', '<table onclick="x()"><tr><td>a</td></tr></table>', '</div>'],
  ['dl', '<div><p>a</p>', '<dl onclick="x()"><dt>t</dt><dd>v</dd></dl>', '</div>'],
  ['figure', '<div><p>a</p>', '<figure onclick="x()"><img src="a.png" alt="a"></figure>', '</div>'],
  ['details', '<div><p>a</p>', '<details onclick="x()"><summary>S</summary><p>b</p></details>', '</div>'],
  ['img', '<p><em>a</em>', '<img src="a.png" alt="a" onclick="x()">', '</p>'],
  ['kbd', '<p><em>a</em>', '<kbd onclick="x()">K</kbd>', '</p>'],
  ['abbr', '<p><em>a</em>', '<abbr onclick="x()" title="t">A</abbr>', '</p>'],
  ['a', '<p><em>a</em>', '<a href="u" onclick="x()">L</a>', '</p>'],
  ['span', '<p><em>a</em>', '<span onclick="x()">S</span>', '</p>'],
  ['mark', '<p><em>a</em>', '<mark onclick="x()">m</mark>', '</p>'],
  ['code', '<p><em>a</em>', '<code onclick="x()">c</code>', '</p>'],
  ['figcaption', '<figure><img src="a.png" alt="a">', '<figcaption onclick="x()">c</figcaption>', '</figure>'],
  ['caption', '<table>', '<caption onclick="x()">C</caption>', '<tr><td>a</td></tr></table>'],
  ['cite', '<blockquote><p>q</p>', '<cite onclick="x()">a</cite>', '</blockquote>'],
]

/*
 * Kinds the PINNED build gives no path for, so the property cannot be read off
 * it. Declared rather than omitted, and checked in both directions below: a
 * silent omission is how a kind escapes a sweep, which is the whole subject of
 * markup-carve/carve#1556.
 *
 * Empty since the pin moved to carve-js 71add23: `figcaption` and `caption`
 * both report a path now (markup-carve/carve-js#1332 and #1335), so both are
 * read by SHAPES like every other kind.
 */
const NO_PATH_ON_THE_PIN = new Map([])

/*
 * Kinds the pinned build MISREADS: it reports a path and the index does not
 * move, which looks exactly like an exemption and is not one. `<cite>` after a
 * `<p>` is a bare inline run, and the pin used to number it inside the
 * paragraph it synthesized rather than among the quote's children - the defect
 * markup-carve/carve#1554 ruled.
 *
 * Empty since the pin moved to carve-js 71add23, which shifts that shape, so
 * `cite` is read by SHAPES with the rest.
 */
const MISREAD_ON_THE_PIN = new Map([])

const stepFor = async (name, html) => {
  const { htmlToCarve } = await import('@markup-carve/carve')
  const hit = htmlToCarve(html).report.diagnostics.find(
    (diagnostic) => diagnostic.path?.includes(`/${name}[`),
  )
  if (!hit) return null
  return Number(hit.path.match(new RegExp(`/${name}\\[(\\d+)\\]`))[1])
}

const declared = (name) => NO_PATH_ON_THE_PIN.has(name) || MISREAD_ON_THE_PIN.has(name)

const bothWays = async (name, pre, target, post) => ({
  tight: await stepFor(name, pre + target + post),
  loose: await stepFor(name, `${pre}\n${target}${post}`),
})

test('a kind the traversal does not renumber moves by exactly one added text node', async () => {
  for (const [name, pre, target, post] of SHAPES) {
    if (EXEMPT.has(name) || declared(name)) continue
    const { tight, loose } = await bothWays(name, pre, target, post)
    assert.ok(tight !== null && loose !== null, `<${name}>: the import reported no path to read`)
    assert.equal(
      loose,
      tight + 1,
      `<${name}> is not one of PART 12 §16's three exemptions, so its index counts ` +
        `among ALL the parent's child nodes and one added whitespace text node has ` +
        `to move it: ${tight} -> ${tight + 1}. It went to ${loose}. Standing still ` +
        `is a FOURTH exemption the clause does not have (markup-carve/carve#1556).`,
    )
  }
})

test('the three exempt kinds do not move, however the markup is spaced', async () => {
  for (const [name, pre, target, post] of SHAPES) {
    if (!EXEMPT.has(name) || declared(name)) continue
    const { tight, loose } = await bothWays(name, pre, target, post)
    assert.ok(tight !== null && loose !== null, `<${name}>: the import reported no path to read`)
    assert.equal(
      loose,
      tight,
      `<${name}> IS one of PART 12 §16's three exemptions: the traversal numbers it ` +
        `among its own kind, so whitespace between the siblings cannot move it and ` +
        `it stays at ${tight}. It went to ${loose}, which is the all-children index ` +
        `(markup-carve/carve#1556).`,
    )
  }
})

/*
 * The closure claim itself, read off the measurement rather than off the table:
 * the kinds that stand still must be EXACTLY the three the clause names.
 */
test('exactly the named kinds are exempt, no more and no fewer', async () => {
  const stable = []
  for (const [name, pre, target, post] of SHAPES) {
    if (declared(name)) continue
    const { tight, loose } = await bothWays(name, pre, target, post)
    if (tight !== null && loose !== null && tight === loose) stable.push(name)
  }
  assert.deepEqual(
    stable.sort(),
    [...EXEMPT].sort(),
    `PART 12 §16 says the exemption list is closed at the list item, the row and ` +
      `the cell. The kinds measured as exempt were ${stable.join(', ')} ` +
      `(markup-carve/carve#1556).`,
  )
})

/*
 * Fails in BOTH directions, the same rule as the contract check's PIN_LAG: a
 * declared kind that starts reporting a path has to leave this map and join
 * SHAPES, or the closure test above never sees it.
 */
test('the kinds with no path on the pinned build are the declared ones', async () => {
  for (const [name, reason] of NO_PATH_ON_THE_PIN) {
    const shape = SHAPES.find(([candidate]) => candidate === name)
    assert.ok(shape, `<${name}> is declared ("${reason}") with no shape in SHAPES to read it by`)
    const { tight, loose } = await bothWays(...shape)
    assert.ok(
      tight === null && loose === null,
      `<${name}> is declared as reporting no path on the pinned build, and it now ` +
        `reports one (${tight} / ${loose}). Move it into SHAPES so the closure ` +
        `test reads it (markup-carve/carve#1556).`,
    )
  }
})

/*
 * The clause is what the engines are read against, so the sentence that closes
 * the list has to be IN it. Without this, the exemptions could measure green
 * while the prose still read as universal - the state
 * markup-carve/carve#1556 was filed about.
 */
test('the kinds the pinned build misreads are the declared ones', async () => {
  for (const [name, reason] of MISREAD_ON_THE_PIN) {
    const shape = SHAPES.find(([candidate]) => candidate === name)
    assert.ok(shape, `<${name}> is declared ("${reason}") with no shape in SHAPES to read it by`)
    const { tight, loose } = await bothWays(...shape)
    assert.ok(
      tight !== null && loose !== null && tight === loose,
      `<${name}> is declared as misread by the pinned build, and the pin now moves ` +
        `its index (${tight} -> ${loose}) the way the clause requires. Delete the ` +
        `entry, in the commit that moved the pin (markup-carve/carve#1556).`,
    )
  }
})

test('the clause names the exemptions and says the list is closed', async () => {
  const doc = await readFile(new URL('../docs/html-import-contract.md', import.meta.url), 'utf8')
  assert.match(doc, /There are exactly three, because\nthe importer reads their parent through a shape of its own/)
  assert.match(doc, /MUST\nNOT number any other kind among its same-named siblings/)
})
