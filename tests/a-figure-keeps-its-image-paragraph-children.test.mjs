import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { Ajv2020 } from 'ajv/dist/2020.js'
import { parse as parseModel } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'
import { parse, resolve, toAstJson, fromAstJson, renderCarve, renderHtml } from '@markup-carve/carve'

const fixtures = JSON.parse(readFileSync(new URL('../resources/ast-figure-image-target-fixtures.json', import.meta.url), 'utf8'))
const schema = JSON.parse(readFileSync(new URL('../resources/ast-schema.json', import.meta.url), 'utf8'))
const validate = new Ajv2020({ allErrors: true, strict: true }).compile(schema)
const figureHtml = '<figure>\n  <img src="/i" alt="a">\n  <figcaption>cap</figcaption>\n</figure>'

function ruledWire(source, targetChildren) {
  const paragraph = toAstJson(resolve(parse(`${source.split('\n')[0]}\n`))).children[0]
  const figure = {
    type: 'figure',
    target: targetChildren.length === 1 ? paragraph.children[0] : paragraph,
    caption: [{ type: 'text', value: 'cap' }],
  }
  return { paragraph, figure, wire: { type: 'document', children: [figure], srcByteLength: source.length } }
}

for (const { name, source, canonical, targetChildren, commentContent } of fixtures) {
  test(`${name}: model and interchange keep the captioned image host`, () => {
    const model = parseModel(source)
    assert.equal(renderDoc(model), figureHtml)
    assert.equal(model.blocks[0].blockImage, true)
    assert.equal(model.blocks[0].lines[0], source.split('\n')[0])

    // The current spec pin predates carve-js#4342. Build the ruled target from
    // its uncaptioned paragraph, whose children and promotion it already
    // publishes, then check the interchange and writer contracts directly.
    const { paragraph, figure, wire } = ruledWire(source, targetChildren)
    assert.equal(paragraph.type, 'paragraph')
    assert.equal(paragraph.blockImage, true)
    assert.deepEqual(paragraph.children.map(child => child.type), targetChildren)
    assert.equal(validate(wire), true, JSON.stringify(validate.errors))
    if (targetChildren.length === 1) {
      assert.equal(figure.target.type, 'image')
    } else {
      assert.equal(figure.target.type, 'paragraph')
      assert.equal(figure.target.blockImage, true)
      assert.equal(figure.target.children.find(child => child.type === 'comment').content, commentContent)
    }
    assert.deepEqual(toAstJson(fromAstJson(JSON.parse(JSON.stringify(wire)))), wire)
    const written = renderCarve(fromAstJson(wire))
    assert.equal(written, canonical)
  })

  // The current package pin predates carve-js#4342. Keep the still-failing
  // parse-after-write and HTML obligations visible until a separate pin PR
  // brings that merged engine change into this repository.
  test(`${name}: the pinned parser round-trips the ruled target`,
    { todo: targetChildren.length > 1 ? 'carve-js pin predates #4342' : undefined }, () => {
      const wire = toAstJson(resolve(parse(source)))
      const written = renderCarve(fromAstJson(wire))
      const reparsed = toAstJson(resolve(parse(written))).children[0]
      assert.equal(reparsed.type, 'figure')
      assert.equal(reparsed.target.type, targetChildren.length === 1 ? 'image' : 'paragraph')
      if (targetChildren.length > 1) {
        assert.equal(reparsed.target.blockImage, true)
        assert.deepEqual(reparsed.target.children.map(child => child.type), targetChildren)
      }
    })

  test(`${name}: the pinned renderer honors a promoted paragraph target`,
    { todo: targetChildren.length > 1 ? 'carve-js pin predates #4342' : undefined }, () => {
      const { wire } = ruledWire(source, targetChildren)
      assert.equal(renderHtml(fromAstJson(wire)), figureHtml)
    })
}
