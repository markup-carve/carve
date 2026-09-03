import { defineConfig } from 'vitepress'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import container from 'markdown-it-container'
import { carveMarkdown } from '@markup-carve/carve-grammars/shiki'
import carve from '@markup-carve/vite-plugin-carve'
// @ts-expect-error - local ESM helper without TS resolution context
import { carveExtensions } from './carve-extensions.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const generatedExamplesFile = resolve(__dirname, 'generated-examples.json')
/* A direct VitePress invocation must still boot before generated pages exist. */
const generatedExamples = existsSync(generatedExamplesFile)
  ? JSON.parse(readFileSync(generatedExamplesFile, 'utf8'))
  : { edgeCases: [] }
const loadGrammar = (file: string) =>
  JSON.parse(readFileSync(resolve(__dirname, `./syntaxes/${file}`), 'utf8'))

// Languages used in the docs that Shiki does not bundle. Without these,
// the build warns ("language 'ebnf' is not loaded, falling back to
// 'txt'") for the formal-grammar snippet import and the background.md
// comparison fences.
const ebnfGrammar = loadGrammar('ebnf.tmLanguage.json')
const orgGrammar = loadGrammar('org.tmLanguage.json')
const textileGrammar = loadGrammar('textile.tmLanguage.json')

const caseStudySidebar = [
  {
    text: 'Case Study',
    items: [
      { text: 'Overview', link: '/case-study/' },
      { text: 'Background', link: '/case-study/background' },
      { text: 'Design', link: '/case-study/design' },
      { text: 'Original Syntax Write-up', link: '/case-study/syntax' },
      { text: 'Parsing & AST', link: '/case-study/parsing-ast' },
      { text: 'Compatibility & Open Questions', link: '/case-study/compatibility' },
      { text: 'Implementation & Reflection', link: '/case-study/implementation' },
      { text: 'Dismissed Syntax', link: '/dismissed-syntax' },
      { text: 'Appendices', link: '/case-study/appendices' },
    ],
  },
  { text: '← Back to docs', link: '/get-started' },
]

// If the repo is published at https://markup-carve.github.io/carve/
// keep `base: '/carve/'`. If you publish from an org page repo named
// `markup-carve.github.io`, change `base` to '/'.
export default defineConfig({
  title: 'Carve',
  description: 'A markup language for structured documents.',
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
    // VitePress signals dark with a `dark` CLASS on <html>. carve-css keys its
    // palette off `data-theme`, with `prefers-color-scheme` as the fallback for
    // an unstamped root. Left alone that breaks BOTH ways: a dark page keeps the
    // light tokens (white cards on a dark ground), and on a dark-OS machine a
    // LIGHT page picks up the dark tokens, because nothing said otherwise.
    //
    // So stamp both directions, never just dark. In head rather than the theme so
    // it lands before first paint - a sync at hydration flashes the wrong palette.
    [
      'script',
      {},
      `(function () {
  var root = document.documentElement
  function sync() {
    root.setAttribute('data-theme', root.classList.contains('dark') ? 'dark' : 'light')
  }
  sync()
  new MutationObserver(sync).observe(root, { attributes: true, attributeFilter: ['class'] })
})()`,
    ],
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/carve/logo.svg' }],
    ['meta', { name: 'theme-color', content: '#3c8772' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:title', content: 'Carve' }],
    ['meta', { property: 'og:description', content: 'A markup language for structured documents.' }],
    ['meta', { property: 'og:url', content: 'https://markup-carve.github.io/carve/' }],
    ['meta', { property: 'og:image', content: 'https://markup-carve.github.io/carve/og-image.svg' }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { name: 'twitter:title', content: 'Carve' }],
    ['meta', { name: 'twitter:description', content: 'A markup language for structured documents.' }],
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
              { text: 'Styling Recipes', link: '/recipes' },
              { text: 'Formal Grammar', link: '/grammar' },
              { text: 'Blocks & Attributes', link: '/blocks-and-attributes' },
              { text: 'Validation', link: '/validation' },
              { text: 'Optional Features & Extensions', link: '/extensions' },
              { text: 'Write an Extension', link: '/extension-tutorial' },
              { text: 'Content Profiles', link: '/profiles' },
              { text: 'Parsed Document JSON', link: '/ast-json' },
              { text: 'Source Locations in JSON', link: '/ast-source-layout' },
              { text: 'HTML Import', link: '/html-import' },
              { text: 'Format Conversion', link: '/format-bridges' },
              { text: 'Syntax Edge Cases', link: '/parsing-ambiguities' },
              { text: 'Versioning & Changelog', link: '/versioning' },
            ],
          },
          {
            text: 'Design',
            items: [
              { text: 'Case Study', link: '/case-study/' },
              { text: 'Technical Rationale', link: '/technical-rationale' },
              { text: 'Feature Availability', link: '/native-features-analysis' },
              { text: 'Security', link: '/security' },
              { text: 'Output Without JavaScript', link: '/graceful-degradation' },
              { text: 'Static Output Recipes', link: '/static-rendering-recipes' },
            ],
          },
          {
            text: 'Compare',
            items: [
              { text: 'Carve vs Markdown/Djot/MDX', link: '/comparison' },
              { text: 'Coming from Markdown', link: '/migrate-from-markdown' },
              { text: 'Divergence from Djot', link: '/divergence-from-djot' },
              { text: 'Whitespace Across Formats', link: '/portable-whitespace' },
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
          { text: 'Implement Carve', link: '/implementing-carve' },
        ],
      },
    ],

    // Path-keyed (multi) sidebar so each page's sub-nav lists only its own
    // section, not the whole site. Case Study has many pages, so it gets its
    // own sidebar and is dropped from the main one — keeping the sidebar on
    // every other page short enough to avoid overflow/scroll on small screens.
    sidebar: {
      // Dismissed Syntax belongs to the case study but lives at a top-level
      // route, so it needs its own sidebar key: VitePress picks a sidebar by
      // PATH PREFIX, and without this the page drops out of the case-study
      // sidebar and snaps back to the main one mid-read.
      '/case-study/': caseStudySidebar,
      '/dismissed-syntax': caseStudySidebar,
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
                { text: 'Processor options', link: '/examples/processor-options' },
                {
                  text: 'Edge cases',
                  link: '/examples/edge-cases/',
                  items: generatedExamples.edgeCases,
                  collapsed: true,
                },
              ],
            },
            { text: 'Diagrams & Charts', link: '/diagrams' },
            { text: 'Styling Recipes', link: '/recipes' },
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
            { text: 'Optional Features & Extensions', link: '/extensions' },
            { text: 'Write an Extension', link: '/extension-tutorial' },
            { text: 'Content Profiles', link: '/profiles' },
            { text: 'Parsed Document JSON', link: '/ast-json' },
            { text: 'Source Locations in JSON', link: '/ast-source-layout' },
            { text: 'HTML Import', link: '/html-import' },
            { text: 'Format Conversion', link: '/format-bridges' },
            { text: 'Formal Grammar', link: '/grammar' },
            {
              text: 'Specification Rules',
              collapsed: true,
              items: [
                { text: 'Overview', link: '/rules/' },
                { text: 'Parsing', link: '/rules/parsing' },
                { text: 'References & Output', link: '/rules/resolution-rendering' },
                { text: 'Parsed Document JSON', link: '/rules/ast-interchange' },
                { text: 'Standard Formatting', link: '/rules/canonical-writing' },
                { text: 'Import, Security & Extensions', link: '/rules/imports-security-extensions' },
              ],
            },
            { text: 'Feature Availability', link: '/native-features-analysis' },
            { text: 'Carve vs Markdown/Djot/MDX', link: '/comparison' },
            { text: 'Divergence from Djot', link: '/divergence-from-djot' },
            { text: 'Whitespace Across Formats', link: '/portable-whitespace' },
            { text: 'Markup Language Comparison', link: '/markup-languages' },
            { text: 'Implementation Comparison', link: '/implementation-comparison' },
            { text: 'Security', link: '/security' },
            { text: 'Output Without JavaScript', link: '/graceful-degradation' },
            { text: 'Static Output Recipes', link: '/static-rendering-recipes' },
            { text: 'Performance', link: '/performance' },
            { text: 'Syntax Edge Cases', link: '/parsing-ambiguities' },
            { text: 'Terms Used Here', link: '/terms' },
            { text: 'Versioning & Changelog', link: '/versioning' },
          ],
        },
        {
          text: 'Ecosystem',
          collapsed: true,
          items: [
            { text: 'Implementations & Tooling', link: '/ecosystem' },
            { text: 'Implement Carve', link: '/implementing-carve' },
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
