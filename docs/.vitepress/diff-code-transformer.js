/**
 * Highlight a unified-diff body with the fence's language grammar.
 *
 * The first character is structural when it is `+`, `-`, or a context space.
 * Remove it before tokenization, then restore it as its own token and annotate
 * the generated line. A fresh transformer is required for each code block so
 * its captured marker list cannot leak between renders.
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
