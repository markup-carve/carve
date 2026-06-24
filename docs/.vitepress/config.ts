import { defineConfig } from 'vitepress'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import githubLight from 'shiki/themes/github-light.mjs'
import githubDark from 'shiki/themes/github-dark.mjs'
import container from 'markdown-it-container'
import carve from '@markup-carve/vite-plugin-carve'
// @ts-expect-error - local ESM helper without TS resolution context
import { carveExtensions } from './carve-extensions.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const loadGrammar = (file: string) =>
  JSON.parse(readFileSync(resolve(__dirname, `./syntaxes/${file}`), 'utf8'))

const carveGrammar = loadGrammar('carve.tmLanguage.json')
// Languages used in the docs that Shiki does not bundle. Without these,
// the build warns ("language 'ebnf' is not loaded, falling back to
// 'txt'") for the formal-grammar snippet import and the background.md
// comparison fences.
const ebnfGrammar = loadGrammar('ebnf.tmLanguage.json')
const orgGrammar = loadGrammar('org.tmLanguage.json')
const textileGrammar = loadGrammar('textile.tmLanguage.json')

// Extend the bundled GitHub themes with rules for Carve scopes that don't
// have stock styling: highlight, subscript, superscript. Strikethrough has
// a built-in rule (fontStyle: strikethrough) but Shiki's HTML emitter has
// a long-standing limitation where it doesn't translate the strikethrough
// fontStyle bit into text-decoration in its output — see the transformer
// below for that.
const carveLightExtras = [
  // markup.bold.italic is a more specific path than markup.bold, so it wins
  // over the base bold rule and combines both font styles.
  { scope: 'markup.bold.italic', settings: { foreground: '#24292e', fontStyle: 'italic bold' } },
  { scope: 'markup.highlight', settings: { foreground: '#b08800', fontStyle: 'bold' } },
  { scope: 'markup.superscript', settings: { foreground: '#6f42c1' } },
  { scope: 'markup.subscript', settings: { foreground: '#6f42c1' } },
  // Code: inline raw, fenced fences, fenced info string, fenced content.
  // (Themes use markup.inline.raw — our scope is markup.raw.inline, so we
  //  set our own rule rather than rely on prefix matching.)
  { scope: 'markup.raw.inline', settings: { foreground: '#005cc5' } },
  { scope: 'markup.raw.code', settings: { foreground: '#6a737d' } },
  { scope: 'fenced_code.block.language', settings: { foreground: '#22863a', fontStyle: 'bold' } },
  { scope: 'punctuation.definition.fenced', settings: { foreground: '#959da5' } },
  { scope: 'punctuation.definition.raw', settings: { foreground: '#959da5' } },
  // Lists and task checkboxes
  { scope: ['punctuation.definition.list.unnumbered', 'punctuation.definition.list.numbered', 'punctuation.definition.list'], settings: { foreground: '#d73a49', fontStyle: 'bold' } },
  { scope: 'punctuation.definition.checkbox', settings: { foreground: '#959da5' } },
  { scope: 'constant.language.checkbox', settings: { foreground: '#22863a', fontStyle: 'bold' } },
  // Tables: operators stand out, separators stay subtle
  { scope: 'keyword.operator.table.header', settings: { foreground: '#d73a49', fontStyle: 'bold' } },
  { scope: ['keyword.operator.table.rowspan', 'keyword.operator.table.colspan', 'keyword.operator.table.continuation'], settings: { foreground: '#e36209', fontStyle: 'bold' } },
  { scope: 'punctuation.separator.table', settings: { foreground: '#959da5' } },
  // Admonitions
  { scope: 'punctuation.definition.admonition', settings: { foreground: '#d73a49', fontStyle: 'bold' } },
  { scope: 'entity.name.tag.admonition', settings: { foreground: '#22863a', fontStyle: 'bold' } },
  { scope: 'string.unquoted.admonition.title', settings: { foreground: '#032f62' } },
  // Captions
  { scope: 'punctuation.definition.caption', settings: { foreground: '#e36209', fontStyle: 'bold' } },
  { scope: 'markup.caption', settings: { foreground: '#6a737d', fontStyle: 'italic' } },
  // Attributes {#id .class key=value}
  { scope: 'meta.attributes', settings: { foreground: '#e36209' } },
  { scope: 'punctuation.definition.attributes', settings: { foreground: '#959da5' } },
  // Mentions and tags
  { scope: 'punctuation.definition.mention', settings: { foreground: '#d73a49' } },
  { scope: 'variable.other.mention', settings: { foreground: '#d73a49', fontStyle: 'bold' } },
  { scope: 'punctuation.definition.tag', settings: { foreground: '#22863a' } },
  { scope: 'variable.other.tag', settings: { foreground: '#22863a', fontStyle: 'bold' } },
  // Abbreviations
  { scope: 'entity.name.abbreviation', settings: { foreground: '#005cc5', fontStyle: 'bold' } },
  { scope: 'string.unquoted.abbreviation', settings: { foreground: '#6a737d', fontStyle: 'italic' } },
]

const carveDarkExtras = [
  { scope: 'markup.bold.italic', settings: { foreground: '#e1e4e8', fontStyle: 'italic bold' } },
  { scope: 'markup.highlight', settings: { foreground: '#ffd33d', fontStyle: 'bold' } },
  { scope: 'markup.superscript', settings: { foreground: '#b392f0' } },
  { scope: 'markup.subscript', settings: { foreground: '#b392f0' } },
  { scope: 'markup.raw.inline', settings: { foreground: '#79b8ff' } },
  { scope: 'markup.raw.code', settings: { foreground: '#959da5' } },
  { scope: 'fenced_code.block.language', settings: { foreground: '#85e89d', fontStyle: 'bold' } },
  { scope: 'punctuation.definition.fenced', settings: { foreground: '#6a737d' } },
  { scope: 'punctuation.definition.raw', settings: { foreground: '#6a737d' } },
  { scope: ['punctuation.definition.list.unnumbered', 'punctuation.definition.list.numbered', 'punctuation.definition.list'], settings: { foreground: '#f97583', fontStyle: 'bold' } },
  { scope: 'punctuation.definition.checkbox', settings: { foreground: '#6a737d' } },
  { scope: 'constant.language.checkbox', settings: { foreground: '#85e89d', fontStyle: 'bold' } },
  { scope: 'keyword.operator.table.header', settings: { foreground: '#f97583', fontStyle: 'bold' } },
  { scope: ['keyword.operator.table.rowspan', 'keyword.operator.table.colspan', 'keyword.operator.table.continuation'], settings: { foreground: '#ffab70', fontStyle: 'bold' } },
  { scope: 'punctuation.separator.table', settings: { foreground: '#6a737d' } },
  { scope: 'punctuation.definition.admonition', settings: { foreground: '#f97583', fontStyle: 'bold' } },
  { scope: 'entity.name.tag.admonition', settings: { foreground: '#85e89d', fontStyle: 'bold' } },
  { scope: 'string.unquoted.admonition.title', settings: { foreground: '#79b8ff' } },
  { scope: 'punctuation.definition.caption', settings: { foreground: '#ffab70', fontStyle: 'bold' } },
  { scope: 'markup.caption', settings: { foreground: '#959da5', fontStyle: 'italic' } },
  { scope: 'meta.attributes', settings: { foreground: '#ffab70' } },
  { scope: 'punctuation.definition.attributes', settings: { foreground: '#6a737d' } },
  { scope: 'punctuation.definition.mention', settings: { foreground: '#f97583' } },
  { scope: 'variable.other.mention', settings: { foreground: '#f97583', fontStyle: 'bold' } },
  { scope: 'punctuation.definition.tag', settings: { foreground: '#85e89d' } },
  { scope: 'variable.other.tag', settings: { foreground: '#85e89d', fontStyle: 'bold' } },
  { scope: 'entity.name.abbreviation', settings: { foreground: '#79b8ff', fontStyle: 'bold' } },
  { scope: 'string.unquoted.abbreviation', settings: { foreground: '#959da5', fontStyle: 'italic' } },
]

const carveLightTheme = {
  ...githubLight,
  tokenColors: [...githubLight.tokenColors, ...carveLightExtras],
}

const carveDarkTheme = {
  ...githubDark,
  tokenColors: [...githubDark.tokenColors, ...carveDarkExtras],
}

// Shiki sets fontStyle bit 8 for strikethrough on the token but does not
// emit `text-decoration: line-through` in its dual-theme HTML output.
// Bridge that with a transformer that adds the inline CSS for any token
// whose fontStyle bit is set, plus vertical-align / background for tokens
// matching our subscript / superscript / highlight scopes (detected via
// explanation, which we opt into in preprocess).
const FontStyle = { Italic: 1, Bold: 2, Underline: 4, Strikethrough: 8 }

const carveStylingTransformer = {
  name: 'carve-extras',
  preprocess(_code: string, options: Record<string, unknown>) {
    options.includeExplanation = 'scopeName'
  },
  tokens(tokens: Array<Array<{
    fontStyle?: number
    htmlAttrs?: Record<string, string>
    explanation?: Array<{ scopes: Array<{ scopeName: string }> }>
  }>>) {
    for (const line of tokens) {
      for (const tk of line) {
        const scopes = tk.explanation?.flatMap((e) =>
          e.scopes.map((s) => s.scopeName),
        ) ?? []
        const hasScope = (prefix: string) => scopes.some((s) => s.startsWith(prefix))

        const mark = (attr: string) => {
          if (!tk.htmlAttrs) tk.htmlAttrs = {}
          tk.htmlAttrs[attr] = ''
        }

        if ((tk.fontStyle ?? 0) & FontStyle.Strikethrough || hasScope('markup.strikethrough')) {
          mark('data-carve-strike')
        }
        if (hasScope('markup.superscript')) mark('data-carve-super')
        if (hasScope('markup.subscript')) mark('data-carve-sub')
        if (hasScope('markup.highlight')) mark('data-carve-highlight')
      }
    }
  },
}

// If the repo is published at https://markup-carve.github.io/carve/
// keep `base: '/carve/'`. If you publish from an org page repo named
// `markup-carve.github.io`, change `base` to '/'.
export default defineConfig({
  title: 'Carve',
  description: 'A post-Markdown markup language with visual mnemonics and human-centered design.',
  base: '/carve/',
  lang: 'en-US',
  cleanUrls: true,
  lastUpdated: true,

  vite: {
    // Render build-time .crv imports with the full extension set too, so
    // dogfooded demos match the Playground's all-extensions-on rendering.
    plugins: [carve({ render: { extensions: carveExtensions() } })],
  },

  markdown: {
    languages: [carveGrammar, ebnfGrammar, orgGrammar, textileGrammar],
    theme: { light: carveLightTheme, dark: carveDarkTheme },
    codeTransformers: [carveStylingTransformer],
    config(md) {
      // Custom container for two-column "Carve | HTML" example blocks.
      md.use(container, 'compare', {
        render(tokens: Array<{ nesting: number }>, idx: number) {
          return tokens[idx].nesting === 1
            ? '<div class="carve-compare">\n'
            : '</div>\n'
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
              { text: 'Formal Grammar', link: '/grammar' },
              { text: 'Blocks & Attributes', link: '/blocks-and-attributes' },
              { text: 'Validation', link: '/validation' },
              { text: 'Extensions Contract', link: '/extensions' },
              { text: 'Profiles Contract', link: '/profiles' },
              { text: 'Edge Cases', link: '/edge-cases' },
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
            { text: 'Playground', link: '/playground' },
            { text: 'Cheat Sheet', link: '/cheatsheet' },
            { text: 'Examples', link: '/examples' },
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
      pattern: 'https://github.com/markup-carve/carve/edit/master/docs/:path',
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
