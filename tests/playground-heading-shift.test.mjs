import { test } from 'node:test'
import assert from 'node:assert/strict'
import { render } from '../docs/.vitepress/engine.js'

// The playground's Heading shift control passes headingShift to the bundled 0.2 engine (C2-H-208).
test('the playground engine shifts headings and keeps their ids', () => {
  assert.equal(
    render('= A\n\n== B\n', { headingShift: 1 }),
    '<section id="A">\n  <h2>A</h2>\n  <section id="B">\n    <h3>B</h3>\n  </section>\n</section>',
  )
})

test('the playground engine writes a shifted level above 6 as a heading div', () => {
  assert.match(render('====== F\n', { headingShift: 1 }), /<div role="heading" aria-level="7">F<\/div>/)
})

test('the playground engine refuses a heading shift above 5', () => {
  assert.throws(() => render('= A\n', { headingShift: 6 }))
})
