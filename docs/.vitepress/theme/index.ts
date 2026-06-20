import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import './custom.css'
import 'katex/dist/katex.min.css'
import Playground from './components/Playground.vue'
import DogfoodCarve from './components/DogfoodCarve.vue'
// @ts-expect-error - local ESM helper without TS resolution context
import { renderMathIn } from '../render-math.js'

export default {
  extends: DefaultTheme,
  enhanceApp({ app, router }) {
    app.component('Playground', Playground)
    app.component('DogfoodCarve', DogfoodCarve)
    // Render Carve math (`.math` spans) on every page once the DOM settles.
    // The Playground re-renders its own output on each edit; this covers
    // static, build-time-rendered Carve content (e.g. the dogfood `.crv`).
    if (typeof window !== 'undefined') {
      const run = (): void => {
        requestAnimationFrame(() => void renderMathIn(document.body))
      }
      router.onAfterRouteChanged = run
      run()
    }
  },
} satisfies Theme
