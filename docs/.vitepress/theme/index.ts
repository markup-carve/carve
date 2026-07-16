import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import '@markup-carve/carve-grammars/shiki/carve.css'
import './custom.css'
import 'katex/dist/katex.min.css'
import Playground from './components/Playground.vue'
import DogfoodCarve from './components/DogfoodCarve.vue'
// @ts-expect-error - local ESM helper without TS resolution context
import { renderMathIn } from '../render-math.js'

/**
 * Upgrade `::: compare` blocks into "Carve source + output tabs (HTML / Rendered)".
 * The Rendered tab injects the HTML block's own text as live DOM, so it is the
 * exact same CI-verified string shown in the HTML tab - it cannot drift from the
 * engine output. Blocks marked `::: compare no-render` keep the plain HTML view
 * (for raw-HTML / security examples that should not inject into the page).
 * Idempotent: each block is processed once (guarded by data-carve-enhanced).
 */
function enhanceCompareBlocks(root: ParentNode): void {
  const blocks = root.querySelectorAll<HTMLElement>('.carve-compare:not([data-carve-enhanced])')
  blocks.forEach((block) => {
    block.setAttribute('data-carve-enhanced', '')
    if (block.classList.contains('carve-compare--no-render')) return
    const htmlDiv = block.querySelector<HTMLElement>('div[class*="language-html"]')
    const code = htmlDiv?.querySelector('code')
    if (!htmlDiv || !code) return

    const output = document.createElement('div')
    output.className = 'carve-output'

    const tabs = document.createElement('div')
    tabs.className = 'carve-output__tabs'
    // Rendered first and active by default: readers see the visual result up
    // front; the HTML source is one click away.
    const btnRendered = document.createElement('button')
    btnRendered.type = 'button'
    btnRendered.className = 'carve-output__tab is-active'
    btnRendered.textContent = 'Rendered'
    const btnHtml = document.createElement('button')
    btnHtml.type = 'button'
    btnHtml.className = 'carve-output__tab'
    btnHtml.textContent = 'HTML'
    tabs.append(btnRendered, btnHtml)

    const panes = document.createElement('div')
    panes.className = 'carve-output__panes'
    const renderedPane = document.createElement('div')
    renderedPane.className = 'carve-output__pane is-active'
    const result = document.createElement('div')
    // `carve-render` reuses the site's full Carve-construct stylesheet
    // (admonitions, task lists, mentions, kbd, math, spoilers, line blocks, …),
    // the same one the Playground uses; `carve-result` adds the pane framing.
    result.className = 'carve-result carve-render'
    result.innerHTML = code.textContent ?? ''
    renderedPane.appendChild(result)
    const htmlPane = document.createElement('div')
    htmlPane.className = 'carve-output__pane'

    // Slot the output wrapper where the HTML block was, then move the block in.
    htmlDiv.parentNode?.insertBefore(output, htmlDiv)
    htmlPane.appendChild(htmlDiv)
    panes.append(renderedPane, htmlPane)
    output.append(tabs, panes)

    const select = (rendered: boolean): void => {
      btnRendered.classList.toggle('is-active', rendered)
      btnHtml.classList.toggle('is-active', !rendered)
      renderedPane.classList.toggle('is-active', rendered)
      htmlPane.classList.toggle('is-active', !rendered)
    }
    btnRendered.addEventListener('click', () => select(true))
    btnHtml.addEventListener('click', () => select(false))

    // Render any Carve math inside the injected result.
    void renderMathIn(result)
  })
}

export default {
  extends: DefaultTheme,
  enhanceApp({ app, router }) {
    app.component('Playground', Playground)
    app.component('DogfoodCarve', DogfoodCarve)
    // Render Carve math (`.math` spans) on every page once the DOM settles, and
    // upgrade `::: compare` example blocks with the live "Rendered" output tab.
    // Covers static, build-time-rendered Carve content (e.g. the dogfood `.crv`).
    if (typeof window !== 'undefined') {
      const run = (): void => {
        requestAnimationFrame(() => {
          enhanceCompareBlocks(document.body)
          void renderMathIn(document.body)
        })
      }
      router.onAfterRouteChanged = run
      run()
    }
  },
} satisfies Theme
