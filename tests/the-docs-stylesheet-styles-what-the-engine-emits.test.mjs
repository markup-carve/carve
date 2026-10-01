// The docs site's own stylesheet, measured against engine output rather than
// hand-written HTML: a tab set, a highlight and an uncaptioned block image.
//
// Measurement limits, stated because a weak assertion dressed up as proof is
// worse than a disclosed gap. jsdom (reached indirectly, through
// @mermaid-lint/cli, the same way tests/import-roundtrip-ratchets.check-helper
// reaches it) resolves selector matching and the cascade, so the tab ladder is
// measured for real. It does NOT resolve var(), so the highlight's ink is
// checked for being declared and distinct from its surroundings rather than for
// a contrast ratio. It has no layout, so "two block images do not share a line"
// is measured as both computing display: block, which is the mechanism, not the
// rendered geometry. jsdom also drives :checked from the attribute, not the
// property, so the tab loop sets the attribute.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { JSDOM } from 'jsdom'
import { carveToHtml } from '@markup-carve/carve'
import { carveExtensions } from '../docs/.vitepress/carve-extensions.js'

const CUSTOM_CSS = readFileSync(
  new URL('../docs/.vitepress/theme/custom.css', import.meta.url),
  'utf8',
)

// The VitePress variables custom.css reads. The site defines them; a bare jsdom
// document does not, so name them here and nowhere else.
const VP_VARS = `:root {
  --vp-c-text-1: #213547; --vp-c-text-2: #476582; --vp-c-text-3: #8e9aaf;
  --vp-c-divider: #e2e2e3; --vp-c-bg-soft: #f6f6f7;
  --vp-c-brand-1: #3451b2; --vp-c-brand-soft: rgba(52, 81, 178, 0.14);
  --vp-c-yellow-soft: rgba(234, 179, 8, 0.22);
}`

/** Render Carve through the docs site's own extension set. */
const render = (src) => carveToHtml(src, { extensions: carveExtensions() })

/** A jsdom document carrying the site's stylesheet around engine output. */
function mount(html) {
  const dom = new JSDOM(
    `<!doctype html><html><head><style>${VP_VARS}</style>` +
      `<style>${CUSTOM_CSS}</style></head>` +
      `<body><div class="carve-result carve-render">${html}</div></body></html>`,
  )
  return dom.window
}

const TAB_SOURCE = `:::: tabs
::: tab [First]
First body.
:::
::: tab [Second]
Second body.
:::
::: tab [Third]
Third body.
:::
::::
`

test('with radio N checked, panel N is the only visible panel', () => {
  const html = render(TAB_SOURCE)
  // Guard the premise: the ladder is written against this DOM order, so a
  // render that stopped emitting radios must fail here rather than silently
  // make every assertion below vacuous.
  assert.match(html, /class="tabs-radio"/, 'engine emitted no CSS-mode radios')

  const win = mount(html)
  const radios = [...win.document.querySelectorAll('.tabs-radio')]
  const panels = [...win.document.querySelectorAll('.tabs-panel')]
  assert.equal(radios.length, 3)
  assert.equal(panels.length, 3)

  for (let n = 0; n < radios.length; n++) {
    for (const r of radios) r.removeAttribute('checked')
    radios[n].setAttribute('checked', '')
    const shown = panels
      .map((p, i) => [i, win.getComputedStyle(p).display])
      .filter(([, d]) => d !== 'none')
      .map(([i]) => i)
    assert.deepEqual(
      shown,
      [n],
      `radio ${n + 1} checked: expected only panel ${n + 1} visible, got panels ` +
        `${shown.map((i) => i + 1).join(', ') || '(none)'} - the ladder pairs ` +
        'a checked radio with the wrong panel',
    )
  }
})

test("a highlight's ink does not come from the surrounding theme", () => {
  const html = render('Plain text with =a [link](x) inside= it.\n')
  assert.match(html, /<mark>/, 'engine emitted no <mark> for =highlight=')

  const win = mount(html)
  const mark = win.document.querySelector('mark')
  const around = win.document.querySelector('p')
  // Give the surroundings an ink nothing else in the cascade uses, so an
  // inherited or undeclared highlight ink is distinguishable from a declared
  // one. jsdom reports a declared var() unresolved, which is enough to tell
  // "declared" from "inherit" and from the UA default.
  around.style.color = 'rgb(1, 2, 3)'
  const ink = win.getComputedStyle(mark).color
  const wash = win.getComputedStyle(mark).background

  assert.notEqual(ink, '', 'the highlight declares no ink of its own')
  assert.notEqual(
    ink,
    'inherit',
    'the highlight inherits its ink, so it takes whatever color surrounds it',
  )
  assert.notEqual(
    ink,
    win.getComputedStyle(around).color,
    "the highlight's ink is the surrounding text's ink",
  )
  assert.notEqual(
    ink,
    'rgb(0, 0, 0)',
    'the highlight ink is the browser default, so it ignores the dark theme',
  )
  assert.notEqual(
    wash,
    'rgb(255, 255, 0)',
    'the highlight keeps the browser default yellow wash, which no theme defines',
  )

  // A nested inline takes the highlight's ink rather than its own palette.
  const nested = win.document.querySelector('mark a')
  assert.ok(nested, 'the sample has no link inside the highlight')
  assert.equal(
    win.getComputedStyle(nested).color,
    'inherit',
    'a link inside a highlight keeps its own palette color over the highlight wash',
  )
})

test('two consecutive block images do not share a line', () => {
  const html = render('![One](a.png)\n\n![Two](b.png)\n')
  // An uncaptioned block image is a bare <img>: no <figure>, no <p>.
  assert.doesNotMatch(html, /<figure>|<p>/, 'the engine wrapped a block image')

  const win = mount(html)
  const images = [...win.document.querySelectorAll('img')]
  assert.equal(images.length, 2)
  for (const [i, img] of images.entries()) {
    assert.equal(
      win.getComputedStyle(img).display,
      'block',
      `block image ${i + 1} is not display: block, so it shares a line with its neighbor`,
    )
  }
})

test("a figure's image keeps the caption's spacing, not the block-image margin", () => {
  const win = mount(render('![Cap](c.png)\n^ A caption.\n'))
  const img = win.document.querySelector('figure img')
  assert.ok(img, 'the engine emitted no figure for a captioned image')
  assert.equal(win.getComputedStyle(img).display, 'block')
  assert.equal(win.getComputedStyle(img).marginBottom, '')
})
