import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import './custom.css'
import Playground from './components/Playground.vue'
import DogfoodCarve from './components/DogfoodCarve.vue'
import CarveExample from './components/CarveExample.vue'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('Playground', Playground)
    app.component('DogfoodCarve', DogfoodCarve)
    app.component('CarveExample', CarveExample)
  },
} satisfies Theme
