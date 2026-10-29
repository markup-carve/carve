// A captioned fence moves its attribute line to the figure (markup-carve/carve#2370),
// so `.diff` sits on the figure, not on the code block.

/** True when a rendered `<pre>` is a diff fence: `pre.diff` or `figure.diff > pre`. */
export function isDiffPre(pre) {
  if (pre.classList.contains('diff')) return true
  const parent = pre.parentElement
  return parent?.tagName === 'FIGURE' && parent.classList.contains('diff')
}

/** True when an AST `code_block` is a diff fence, given its parent node (a figure carries the classes). */
export function isDiffCodeBlock(node, parent) {
  if (node?.type !== 'code_block') return false
  if (node.lang?.toLowerCase() === 'diff' || node.attrs?.classes?.includes('diff')) return true
  return parent?.type === 'figure' && parent.target === node && parent.attrs?.classes?.includes('diff') === true
}
