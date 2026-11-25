// A captioned fence moves its attribute line to the figure (markup-carve/carve#2370),
// so `.diff` sits on the figure, not on the code block.

/** True when a rendered `<pre>` is a diff fence: `pre.diff` or `figure.diff > pre`. */
export function isDiffPre(pre) {
  if (pre.classList.contains('diff')) return true
  const parent = pre.parentElement
  return parent?.tagName === 'FIGURE' && parent.classList.contains('diff')
}

/** True when an AST `code_block` is a diff fence; a captioned one keeps its classes in the tree. */
export function isDiffCodeBlock(node) {
  if (node?.type !== 'code_block') return false
  return node.syntax?.toLowerCase() === 'diff' || node.attrs?.classes?.includes('diff') === true
}
