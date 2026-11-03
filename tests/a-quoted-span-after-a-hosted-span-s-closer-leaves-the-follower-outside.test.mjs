// The quote's span tracker leaves a line held by a hosted span to that span (carve#5026).
import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const normalize = (html) => html.replace(/>\s+</g, '><').replace(/\s+/g, ' ').trim()
const html = (source) => normalize(renderDoc(parse(source)))

for (const [name, source, expected] of [
  ['depth two', '> > - %%%\n> > %%%\n> > %%%\n> > x\nt\n',
    '<blockquote><blockquote><ul><li></li></ul></blockquote></blockquote><p>t</p>'],
  ['depth one', '> - %%%\n> %%%\n> %%%\n> x\nt\n',
    '<blockquote><ul><li></li></ul></blockquote><p>t</p>'],
  ['depth three, numbered item, list follower', '> > > 1. %%%%\n> > > %%%%\n> > > %%%%\n> > > x\n- t\n',
    '<blockquote><blockquote><blockquote><ol><li></li></ol></blockquote></blockquote></blockquote><ul><li>t</li></ul>'],
  ['description host', '> :: d\n> : %%%\n> %%%\n> %%%\n> x\n: t\n',
    '<blockquote><dl><dt>d</dt><dd></dd></dl></blockquote><p>: t</p>'],
  ['indented closer of a sublist span', '> > - - %%%\n> >  %%%\n> > %%%\n> > x\n> - t\n',
    '<blockquote><blockquote><ul><li><ul><li></li></ul></li></ul></blockquote><ul><li>t</li></ul></blockquote>'],
  ['control: the quote span closes, the follower folds', '> > - %%%\n> > %%%\n> > %%%\n> > %%%\n> > x\nt\n',
    '<blockquote><blockquote><ul><li></li></ul><p>x t</p></blockquote></blockquote>'],
]) {
  test(name, () => assert.equal(html(source), normalize(expected)))
}
