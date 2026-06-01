import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import './custom.css'
import Playground from './components/Playground.vue'
import DogfoodCarve from './components/DogfoodCarve.vue'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('Playground', Playground)
    app.component('DogfoodCarve', DogfoodCarve)
  },
} satisfies Theme
