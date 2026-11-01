import assert from 'node:assert/strict'
import { test } from 'node:test'
import { renderInline } from '../scripts/spec/render.mjs'

test('bare emphasis respects Unicode letters and numbers at both boundaries', () => {
  for (const [left, right] of [
    ['é', 'ö'], ['Ж', 'я'], ['日', '本'], ['𐐀', '𐐁'], ['𝟘', '𝟙'],
  ]) {
    for (const mark of ['/', '*', '_', '~', '=']) {
      assert.equal(renderInline(`${left}${mark}x${mark}`), `${left}${mark}x${mark}`, `${left} before ${mark}`)
      assert.equal(renderInline(`${mark}x${mark}${right}`), `${mark}x${mark}${right}`, `${right} after ${mark}`)
    }
  }
  assert.equal(renderInline('日本{/中国/}韩国'), '日本<em>中国</em>韩国')
  assert.equal(renderInline('a *x* b'), 'a <strong>x</strong> b')
})

test('an intraword slash sees complete supplementary-plane code points', () => {
  for (const source of ['/a/𐐀/b/', '/a/𝟘/b/', '/a/𐐀́/b/']) {
    assert.equal(renderInline(source), source)
  }
})
