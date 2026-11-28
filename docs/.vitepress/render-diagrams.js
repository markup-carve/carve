// Draw the output of the standard `mermaid` and `chart` extensions in rendered
// docs examples. Both libraries load lazily, only when a page has a diagram.
let mermaidSeq = 0
let chartSeq = 0

/** Replace each `pre.mermaid` and `div.chart` under `root` with the drawn diagram (idempotent). */
export async function renderDiagramsIn(root) {
  if (typeof window === 'undefined' || !root) return
  const diagrams = [...root.querySelectorAll('pre.mermaid')]
  if (diagrams.length) {
    const mermaid = (await import('mermaid')).default
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'strict',
      theme: document.documentElement.classList.contains('dark') ? 'dark' : 'default',
    })
    for (const pre of diagrams) {
      try {
        const { svg } = await mermaid.render(`carve-docs-mermaid-${mermaidSeq++}`, pre.textContent ?? '')
        const figure = document.createElement('div')
        figure.className = 'mermaid-rendered'
        // The extension's accessible name stays on the drawing.
        for (const name of ['role', 'aria-label']) {
          const value = pre.getAttribute(name)
          if (value !== null) figure.setAttribute(name, value)
        }
        figure.innerHTML = svg
        pre.replaceWith(figure)
      } catch {
        // A diagram that does not parse keeps its source, as the extension's fallback does.
      }
    }
  }
  const charts = [...root.querySelectorAll('div.chart')].filter((el) => !el.dataset.chartDone)
  if (!charts.length) return
  const Chart = (await import('chart.js/auto')).default
  for (const el of charts) {
    let config
    try {
      config = JSON.parse(el.querySelector('script[type="application/json"]')?.textContent ?? '')
    } catch {
      continue
    }
    const canvas = document.createElement('canvas')
    canvas.id = `carve-docs-chart-${chartSeq++}`
    el.replaceChildren(canvas)
    el.dataset.chartDone = '1'
    try {
      new Chart(canvas, config)
    } catch {
      // A config Chart.js refuses leaves the empty canvas.
    }
  }
}
