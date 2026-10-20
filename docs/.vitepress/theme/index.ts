import DefaultTheme from 'vitepress/theme'
import { getScrollOffset } from 'vitepress'
import type { Theme } from 'vitepress'
import '@markup-carve/carve-grammars/shiki/carve.css'
// The tokens and the opt-in recipes layer from the shipped stylesheet, rather
// than a copy of them in custom.css. tokens.css defines only `--carve-*` custom
// properties; recipes.css styles the containers the engine has no handler for
// (`::: tree`, `::: cards`, ...), which custom.css has never covered. Both are
// scoped under `.carve`, so they reach rendered examples and nothing else.
import '@markup-carve/carve-css/tokens.css'
import '@markup-carve/carve-css/recipes.css'
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
    // `carve` is the scope every carve-css rule sits under, so a rendered
    // example gets the same treatment a consumer's own page gets.
    output.className = 'carve-output carve'

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

/**
 * VitePress scrolls to the URL hash once, at load. Enhancing the compare blocks
 * afterward changes the height above the target (the HTML pane is hidden), so the
 * heading ends up away from where it was placed. Re-align once after enhancing,
 * unless the reader has already scrolled.
 */
let readerScrolled = false
let realigned = false
let alignedPath = ''
function realignHash(): void {
  if (location.pathname !== alignedPath) {
    alignedPath = location.pathname
    realigned = false
    readerScrolled = false
  }
  if (realigned || readerScrolled || !location.hash) return
  realigned = true
  let target: HTMLElement | null = null
  try {
    target = document.getElementById(decodeURIComponent(location.hash).slice(1))
  } catch {
    return
  }
  if (!target) return
  const padding = parseInt(getComputedStyle(target).paddingTop, 10) || 0
  const top = window.scrollY + target.getBoundingClientRect().top - getScrollOffset() + padding
  if (Math.abs(top - window.scrollY) > 1) window.scrollTo(0, top)
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
          realignHash()
        })
      }
      for (const type of ['wheel', 'touchstart', 'keydown', 'mousedown']) {
        window.addEventListener(type, () => { readerScrolled = true }, { passive: true })
      }
      // Chain rather than clobber, in case another hook is already installed.
      const prevHook = router.onAfterRouteChanged
      router.onAfterRouteChanged = (...args) => {
        prevHook?.(...args)
        run()
      }
      run()
    }
  },
} satisfies Theme
