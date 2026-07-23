import { defineConfig } from 'vitepress'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import container from 'markdown-it-container'
import { carveMarkdown } from '@markup-carve/carve-grammars/shiki'
import carve from '@markup-carve/vite-plugin-carve'
// @ts-expect-error - local ESM helper without TS resolution context
import { carveExtensions } from './carve-extensions.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const loadGrammar = (file: string) =>
  JSON.parse(readFileSync(resolve(__dirname, `./syntaxes/${file}`), 'utf8'))

// Languages used in the docs that Shiki does not bundle. Without these,
// the build warns ("language 'ebnf' is not loaded, falling back to
// 'txt'") for the formal-grammar snippet import and the background.md
// comparison fences.
const ebnfGrammar = loadGrammar('ebnf.tmLanguage.json')
const orgGrammar = loadGrammar('org.tmLanguage.json')
const textileGrammar = loadGrammar('textile.tmLanguage.json')

// If the repo is published at https://markup-carve.github.io/carve/
// keep `base: '/carve/'`. If you publish from an org page repo named
// `markup-carve.github.io`, change `base` to '/'.
export default defineConfig({
  title: 'Carve',
  description: 'A post-Markdown markup language with visual mnemonics and human-centered design.',
  base: '/carve/',
  lang: 'en-US',
  // README.md is a GitHub-facing orientation file for people browsing the
  // docs/ source on GitHub; it is not a site page.
  srcExclude: ['README.md', 'superpowers/**'],
  cleanUrls: true,
  lastUpdated: true,

  vite: {
    // Render build-time .crv imports with the full extension set too, so
    // dogfooded demos match the Playground's all-extensions-on rendering.
    plugins: [carve({ render: { extensions: carveExtensions() } })],
  },

  markdown: {
    ...carveMarkdown({ languages: [ebnfGrammar, orgGrammar, textileGrammar] }),
    config(md) {
      // Custom container for two-column "Carve | HTML" example blocks.
      md.use(container, 'compare', {
        render(tokens: Array<{ nesting: number; info?: string }>, idx: number) {
          if (tokens[idx].nesting !== 1) return '</div>\n'
          // `::: compare no-render` opts a block out of the live "Rendered" tab
          // (for raw-HTML / security examples that should not inject into the page).
          const info = tokens[idx].info ?? ''
          const noRender = /\bno-render\b/.test(info)
          const cls = noRender ? 'carve-compare carve-compare--no-render' : 'carve-compare'
          return `<div class="${cls}">\n`
        },
      })
    },
  },

  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/carve/logo.svg' }],
    ['meta', { name: 'theme-color', content: '#3c8772' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:title', content: 'Carve' }],
    ['meta', { property: 'og:description', content: 'A post-Markdown markup language with visual mnemonics.' }],
    ['meta', { property: 'og:url', content: 'https://markup-carve.github.io/carve/' }],
    ['meta', { property: 'og:image', content: 'https://markup-carve.github.io/carve/og-image.svg' }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { name: 'twitter:title', content: 'Carve' }],
    ['meta', { name: 'twitter:description', content: 'A post-Markdown markup language with visual mnemonics.' }],
    ['meta', { name: 'twitter:image', content: 'https://markup-carve.github.io/carve/og-image.svg' }],
  ],

  themeConfig: {
    nav: [
      { text: 'Get Started', link: '/get-started' },
      { text: 'Playground', link: '/playground' },
      {
        text: 'Reference',
        items: [
          {
            text: 'Syntax',
            items: [
              { text: 'Cheat Sheet', link: '/cheatsheet' },
              { text: 'Examples', link: '/examples' },
              { text: 'Diagrams & Charts', link: '/diagrams' },
              { text: 'SVG Images', link: '/svg-images' },
              { text: 'Formal Grammar', link: '/grammar' },
              { text: 'Blocks & Attributes', link: '/blocks-and-attributes' },
              { text: 'Validation', link: '/validation' },
              { text: 'Extensions Contract', link: '/extensions' },
              { text: 'Writing an Extension (QR case study)', link: '/extension-tutorial' },
              { text: 'Profiles Contract', link: '/profiles' },
              { text: 'Edge Cases', link: '/edge-cases' },
              { text: 'Versioning & Changelog', link: '/versioning' },
            ],
          },
          {
            text: 'Design',
            items: [
              { text: 'Case Study', link: '/case-study/' },
              { text: 'Technical Rationale', link: '/technical-rationale' },
              { text: 'Native Features', link: '/native-features-analysis' },
              { text: 'Security', link: '/security' },
              { text: 'Graceful Degradation', link: '/graceful-degradation' },
              { text: 'Static Rendering Recipes', link: '/static-rendering-recipes' },
            ],
          },
          {
            text: 'Compare',
            items: [
              { text: 'Carve vs Markdown/Djot/MDX', link: '/comparison' },
              { text: 'Coming from Markdown', link: '/migrate-from-markdown' },
              { text: 'Divergence from Djot', link: '/divergence-from-djot' },
              { text: 'Markup Language Comparison', link: '/markup-languages' },
              { text: 'Implementation Comparison', link: '/implementation-comparison' },
              { text: 'Performance', link: '/performance' },
            ],
          },
        ],
      },
      {
        text: 'Ecosystem',
        items: [
          { text: 'Implementations & Tooling', link: '/ecosystem' },
          { text: 'Build Your Own', link: '/implementing-carve' },
        ],
      },
    ],

    // Path-keyed (multi) sidebar so each page's sub-nav lists only its own
    // section, not the whole site. Case Study has many pages, so it gets its
    // own sidebar and is dropped from the main one — keeping the sidebar on
    // every other page short enough to avoid overflow/scroll on small screens.
    sidebar: {
      '/case-study/': [
        {
          text: 'Case Study',
          items: [
            { text: 'Overview', link: '/case-study/' },
            { text: 'Background', link: '/case-study/background' },
            { text: 'Design', link: '/case-study/design' },
            { text: 'Syntax Specification', link: '/case-study/syntax' },
            { text: 'Parsing & AST', link: '/case-study/parsing-ast' },
            { text: 'Compatibility & Open Questions', link: '/case-study/compatibility' },
            { text: 'Implementation & Reflection', link: '/case-study/implementation' },
            { text: 'Dismissed Syntax', link: '/dismissed-syntax' },
            { text: 'Appendices', link: '/case-study/appendices' },
          ],
        },
        { text: '← Back to docs', link: '/get-started' },
      ],
      '/': [
        {
          text: 'Introduction',
          collapsed: true,
          items: [
            { text: 'Get Started', link: '/get-started' },
            { text: 'Coming from Markdown', link: '/migrate-from-markdown' },
            { text: 'Playground', link: '/playground' },
            { text: 'Cheat Sheet', link: '/cheatsheet' },
            {
              text: 'Examples',
              link: '/examples',
              items: [
                { text: 'Core', link: '/examples/core' },
                { text: 'Extensions', link: '/examples/extensions' },
                { text: 'Edge cases', link: '/examples/edge-cases' },
              ],
            },
            { text: 'Diagrams & Charts', link: '/diagrams' },
            { text: 'SVG Images', link: '/svg-images' },
          ],
        },
        {
          text: 'Reference',
          // Collapsed by default so the sidebar fits on small screens without
          // relying on scroll (a fixed overflow:auto drawer is unreliable on
          // iOS). VitePress auto-expands the group of the current page.
          collapsed: true,
          items: [
            { text: 'Technical Rationale', link: '/technical-rationale' },
            { text: 'Blocks & Attributes', link: '/blocks-and-attributes' },
            { text: 'Validation', link: '/validation' },
            { text: 'Extensions Contract', link: '/extensions' },
            { text: 'Writing an Extension', link: '/extension-tutorial' },
            { text: 'Profiles Contract', link: '/profiles' },
            { text: 'Formal Grammar', link: '/grammar' },
            { text: 'Native Features', link: '/native-features-analysis' },
            { text: 'Carve vs Markdown/Djot/MDX', link: '/comparison' },
            { text: 'Divergence from Djot', link: '/divergence-from-djot' },
            { text: 'Markup Language Comparison', link: '/markup-languages' },
            { text: 'Implementation Comparison', link: '/implementation-comparison' },
            { text: 'Security', link: '/security' },
            { text: 'Graceful Degradation', link: '/graceful-degradation' },
              { text: 'Static Rendering Recipes', link: '/static-rendering-recipes' },
            { text: 'Performance', link: '/performance' },
            { text: 'Edge Cases', link: '/edge-cases' },
            { text: 'Versioning & Changelog', link: '/versioning' },
          ],
        },
        {
          text: 'Ecosystem',
          collapsed: true,
          items: [
            { text: 'Implementations & Tooling', link: '/ecosystem' },
            { text: 'Build Your Own', link: '/implementing-carve' },
            { text: 'Case Study', link: '/case-study/' },
          ],
        },
      ],
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/markup-carve' },
    ],

    editLink: {
      pattern: 'https://github.com/markup-carve/carve/edit/main/docs/:path',
      text: 'Edit this page on GitHub',
    },

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Carve — a post-Markdown markup language.',
    },

    search: {
      provider: 'local',
    },

    outline: {
      level: [2, 3],
    },
  },
})
