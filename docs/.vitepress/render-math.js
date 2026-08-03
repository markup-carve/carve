// Render Carve math with KaTeX. The Carve renderer emits
// `<span class="math inline">\(…\)</span>` and
// `<span class="math display">\[…\]</span>` (TeX wrapped in MathJax/KaTeX
// delimiters); this renders the TeX in place. KaTeX is loaded lazily, only
// when a page actually contains math. Shared by the Playground (per render)
// and the site-wide theme pass (any other live-rendered Carve content).
let katexPromise = null
function getKatex() {
  if (!katexPromise) katexPromise = import('katex').then((m) => m.default ?? m)
  return katexPromise
}

// Codepoints that can sneak into the DOM text but aren't valid TeX: zero-width
// chars (drop) and exotic spaces (normalize to a plain space).
const DROP = new Set([0x200b, 0x200c, 0x200d, 0xfeff, 0x00ad])
const SPACE = new Set([0x00a0, 0x2007, 0x2009, 0x202f])
function clean(text) {
  let out = ''
  for (const ch of text) {
    const c = ch.codePointAt(0)
    if (DROP.has(c)) continue
    out += SPACE.has(c) ? ' ' : ch
  }
  return out
}

/** Render every Carve `.math` span under `root` with KaTeX (idempotent). */
export async function renderMathIn(root) {
  if (typeof window === 'undefined' || !root) return
  const spans = [...root.querySelectorAll('.math')].filter((s) => !s.dataset.katex)
  if (!spans.length) return
  const katex = await getKatex()
  for (const span of spans) {
    const display = span.classList.contains('display')
    // Strip the `\( \)` / `\[ \]` delimiters Carve wraps the TeX in.
    const tex = clean(span.textContent ?? '')
      .trim()
      .replace(/^\\[([]/, '')
      .replace(/\\[)\]]$/, '')
      .trim()
    try {
      katex.render(tex, span, { displayMode: display, throwOnError: false, strict: false })
      span.dataset.katex = '1'
    } catch {
      // Leave the raw TeX in place on a parse error.
    }
  }
}
