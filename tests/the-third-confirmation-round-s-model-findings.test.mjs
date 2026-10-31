import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (src) => renderDoc(parse(src)).replace(/\n[ \t]*(?=<)/g, '').trim()
const body = (src) => html(src).split('<section')[0]
const note = (src) => /<li id="fn1">(.*?)<a href="#fnref1"/s.exec(html(src))?.[1]

test('a marker between an item\'s columns on another axis folds into the note (carve#4614)', () => {
  for (const [marker, other] of [['- ', '* c'], ['- ', '- [ ] c'], ['1. ', '* c'], ['1. ', '2) c'], ['- [ ] ', '- c']]) {
    assert.match(note(`${marker}[^q]: n\n ${other}\n\nr[^q]\n`), /<p>n\n/, `${marker}${other}`)
  }
  assert.match(note('> - [^q]: n\n>  * c\n\nr[^q]\n'), /<p>n\n\* c/)
})

test('a full sibling and a marker at the list column still leave the note (carve#4614)', () => {
  assert.equal(body('- [^q]: n\n - c\n\nr[^q]\n').slice(0, 27), '<ul><li></li><li>c</li></ul')
  assert.match(body('- [^q]: n\n* c\n\nr[^q]\n'), /^<ul><li><\/li><\/ul><ul><li>c<\/li><\/ul>/)
})

test('a lazy line closes no line block in any host (carve#4615)', () => {
  const block = '<div class="line-block"><p>a<br>\nlazy</p></div>'
  assert.equal(html('- ::: |\n  a\nlazy\n  :::\ntail\n'), `<ul><li>${block}</li></ul><p>tail</p>`)
  assert.equal(html(':: t\n: ::: |\n  a\nlazy\n  :::\ntail\n'), `<dl><dt>t</dt><dd>${block}</dd></dl><p>tail</p>`)
  assert.equal(html('> - ::: |\n>   a\nlazy\n>   :::\n> tail\n'), `<blockquote><ul><li>${block}</li></ul><p>tail</p></blockquote>`)
  assert.equal(body('[^n]: ::: |\n  a\nlazy\n  :::\ntail\n\nr[^n]\n').slice(0, 11), '<p>tail</p>')
})

test('a blank before the line still ends the line block (carve#4615)', () => {
  assert.match(html('- ::: |\n  a\n\nlazy\n'), /<\/ul><p>lazy<\/p>$/)
})

test('a caption number stays out of the tag or mention before it (carve#4616)', () => {
  assert.match(html('| b |\n^ #y#\n'), /<caption><span class="tag"><strong>#y<\/strong><\/span>1<\/caption>/)
  assert.match(html('| b |\n^ @m#: c\n'), /<caption><span class="mention"><strong>@m<\/strong><\/span>1: c<\/caption>/)
  assert.match(html('| b |\n^ *a*#\n'), /<caption><strong>a<\/strong>1<\/caption>/)
  assert.match(html('| b |\n^ Fig #: x\n'), /<caption>Fig 1: x<\/caption>/)
  assert.match(html('| b |\n^ #: x\n'), /<caption>1: x<\/caption>/)
})

test('a line that misses a comment fence\'s owner ends the fence in every host (carve#4617)', () => {
  assert.match(html('> %%%\n> x\ny\n> %%%\n'), /^<blockquote><p>x<\/p><\/blockquote><p>y<\/p>/)
  assert.equal(html(':: t\n: %%%\n  x\ny\n  %%%\n'), '<dl><dt>t</dt><dd>x</dd></dl><p>y</p>')
  assert.match(html('[^n]: %%%\n  x\ny\n  %%%\n\nr[^n]\n'), /^<p>y<\/p>/)
  assert.equal(html('- %%%\n  x\ny\n  %%%\n'), '<ul><li>x</li></ul><p>y</p>')
})

test('a span that closes in its host stays hidden, and an unclosed one still folds (carve#4617)', () => {
  assert.equal(html('> %%%\n> x\n> %%%\ny\n'), '<blockquote>\n</blockquote><p>y</p>')
  assert.equal(html('> %%%\n> x\ny\n'), '<blockquote><p>x\ny</p></blockquote>')
})

test('a task item reads the same column as its plain twin at every gap (carve#4618)', () => {
  const plain = (s) => s.replace(/<input[^>]*> ?/g, '').replace(' class="task-list"', '')
  for (const gap of [1, 2, 3, 4]) for (let column = 0; column < 8; column++) for (const block of ['# H', '> q', 'para']) {
    const follower = `\n\n${' '.repeat(column)}${block}\n`
    assert.equal(plain(html(`-${' '.repeat(gap)}[ ] a${follower}`)), html(`-${' '.repeat(gap)}a${follower}`), `${gap} ${column} ${block}`)
  }
})

test('a paragraph after a literal directive loosens an item, and a lone directive stays tight (carve#4619)', () => {
  assert.equal(html('- {{ _x_ @code:js }}\n  ^ c\n'), '<ul><li><p>{{ _x_ @code:js }}</p><p>^ c</p></li></ul>')
  assert.equal(html('- {{ f @code }}\n'), '<ul><li>{{ f @code }}</li></ul>')
  assert.equal(html('- a\n  b\n'), '<ul><li>a\nb</li></ul>')
})

test('an attached attribute run holds no arrow and no closer for a substitution (carve#4620)', () => {
  assert.equal(html('{~`a`{k="~>"}b~}\n'), '<p><s><code k="~&gt;">a</code>b</s></p>')
  assert.equal(html('{~{+a+}{k="~>"}b~}\n'), '<p><s><ins k="~&gt;">a</ins>b</s></p>')
  assert.equal(html('{~[x](/u){k="~>"}b~}\n'), '<p><s><a href="/u" k="~&gt;">x</a>b</s></p>')
  assert.equal(html('{~p~>`a`{k="~}"}b~}\n'), '<p><del>p</del><ins><code k="~}">a</code>b</ins></p>')
})

test('a brace group after a bare closer or a comment still holds the arrow (carve#4620)', () => {
  assert.equal(html('{~*a*{k="~>"}b~}\n'), '<p><del><strong>a</strong>{k=“</del><ins>“}b</ins></p>')
  assert.equal(html('{~{#c#}{k="~>"}b~}\n'), '<p><del><span class="critic-comment">c</span>{k=“</del><ins>“}b</ins></p>')
})

test('a comment does not hide a caption host (carve#4621)', () => {
  const math = '<figure><p><span class="math display" role="math">\\[a\\]</span></p><figcaption>cap</figcaption></figure>'
  assert.equal(html('$$`a` %% c\n^ cap\n'), math)
  assert.equal(html('{%%}$$`a`\n^ cap\n'), math)
  assert.equal(html('{%%}![a](/i)\n^ cap\n'), '<figure><img src="/i" alt="a"><figcaption>cap</figcaption></figure>')
  assert.equal(html('$$`a`\nb %% c\n^ cap\n').slice(0, 3), '<p>')
})

test('a base class takes the class slot\'s spelling (carve#4622)', () => {
  assert.match(html('{CLASS=c}\n- [ ] a\n'), /^<ul CLASS="task-list c">/)
  assert.match(html('$`a`{CLASS=c}\n'), /<span CLASS="math inline c" role="math">/)
  assert.match(html(':w[x]{CLASS=c}\n'), /<span CLASS="ext-w c">/)
  assert.match(html('{.c}\n- [ ] a\n'), /^<ul class="task-list c">/)
  assert.match(html('- [ ] a\n'), /^<ul class="task-list">/)
})
