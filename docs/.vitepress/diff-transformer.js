// The diff-fence transformer carve-grammars shipped as shiki/diff before its 0.2 grammar replaced the 0.1 surfaces.
/**
 * Highlight an instructional unified diff with the code block's underlying
 * language grammar. Call this factory once per block: the returned transformer
 * captures that block's line markers while Shiki runs.
 *
 * The first character is structural when it is `+`, `-`, or a context space.
 * It is removed before tokenization, restored as a `diff-marker` span, and
 * added/removed lines receive `diff add` / `diff remove` classes. Pair with
 * `@markup-carve/carve-grammars/shiki/carve.css` for the baseline presentation.
 *
 * This module has no Node imports and is safe to bundle into browser clients.
 */
export function diffCodeTransformer() {
  let markers = []

  return {
    name: 'carve:language-diff',
    preprocess(code) {
      const lines = code.split('\n')
      markers = lines.map((line) => /^[+\- ]/.test(line) ? line[0] : '')
      return lines.map((line, index) => markers[index] ? line.slice(1) : line).join('\n')
    },
    pre(node) {
      this.addClassToHast(node, 'has-diff')
    },
    line(node, line) {
      const marker = markers[line - 1]
      if (!marker) return
      if (marker === '+') this.addClassToHast(node, ['diff', 'add'])
      if (marker === '-') this.addClassToHast(node, ['diff', 'remove'])
      node.children.unshift({
        type: 'element',
        tagName: 'span',
        properties: { class: ['diff-marker'] },
        children: [{ type: 'text', value: marker }],
      })
    },
  }
}
