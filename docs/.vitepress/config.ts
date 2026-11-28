import { defineConfig } from 'vitepress'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import container from 'markdown-it-container'
import { carveMarkdown } from '@markup-carve/carve-grammars/shiki'
import carve from '@markup-carve/vite-plugin-carve'
// @ts-expect-error - local ESM helper without TS resolution context
import { carveExtensions, carveRenderers } from './carve-extensions.js'

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

const docsBase = process.env.DOCS_BASE ?? '/carve/'
const docsVersionText = process.env.DOCS_VERSION_TEXT
const docsLatestBase = process.env.DOCS_LATEST_BASE ?? '/carve/'
const docsOtherBase = process.env.DOCS_OTHER_BASE ?? '/carve/0.2/'
const siteUrl = (base: string) => `https://markup-carve.github.io${base}`

export default defineConfig({
  title: 'Carve',
  description: 'A markup language for structured documents.',
  base: docsBase,
  lang: 'en-US',
  // README.md is a GitHub-facing orientation file for people browsing the
  // docs/ source on GitHub; it is not a site page.
  srcExclude: ['README.md', 'superpowers/**'],
  cleanUrls: true,
  lastUpdated: true,

  vite: {
    // Render build-time .crv imports with the full extension set too, so
    // dogfooded demos match the Playground's all-extensions-on rendering.
    plugins: [carve({ render: { extensions: carveExtensions(), renderers: carveRenderers() } })],
  },

  markdown: {
    ...carveMarkdown({ languages: [ebnfGrammar, orgGrammar, textileGrammar] }),
    config(md) {
      // VitePress renders every page for the client and the server bundle, so
      // each fence was highlighted ~3 times; Shiki was ~90% of the build.
      const highlight = md.options.highlight!
      const highlighted = new Map<string, string>()
      md.options.highlight = (code, lang, attrs) => {
        const key = `${lang}\0${attrs}\0${code}`
        let html = highlighted.get(key)
        if (html === undefined) {
          html = highlight(code, lang, attrs)
          highlighted.set(key, html)
        }
        return html
      }
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
    // Every deploy replaces the whole site, so the hashed assets of the previous
    // build 404. Chrome restores a discarded tab from its cached HTML, which still
    // points at those, and the page stays unhydrated (empty playground editor).
    // A failed asset reloads the page once, which revalidates the HTML.
    [
      'script',
      {},
      `(function () {
  var KEY = 'carve-stale-asset-reload'
  function reload() {
    try {
      if (Date.now() - Number(sessionStorage.getItem(KEY) || 0) < 10000) return false
      sessionStorage.setItem(KEY, String(Date.now()))
    } catch (e) {
      return false
    }
    location.reload()
    return true
  }
  window.addEventListener('error', function (e) {
    var t = e.target
    var url = t && (t.src || t.href)
    if (url && (t.tagName === 'SCRIPT' || t.tagName === 'LINK') && url.indexOf('/assets/') !== -1) reload()
  }, true)
  window.addEventListener('vite:preloadError', function (e) {
    if (reload()) e.preventDefault()
  })
})()`,
    ],
    // The unreleased series must not compete with the released docs in search results.
    ...(process.env.VITE_DOCS_SERIES === 'dev' ? [['meta', { name: 'robots', content: 'noindex' }] as [string, Record<string, string>]] : []),
    ['link', { rel: 'icon', type: 'image/svg+xml', href: `${docsBase}logo.svg` }],
    ['meta', { name: 'theme-color', content: '#3c8772' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:title', content: 'Carve' }],
    ['meta', { property: 'og:description', content: 'A markup language for structured documents.' }],
    ['meta', { property: 'og:url', content: siteUrl(docsBase) }],
    ['meta', { property: 'og:image', content: `${siteUrl(docsBase)}og-image.svg` }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { name: 'twitter:title', content: 'Carve' }],
    ['meta', { name: 'twitter:description', content: 'A markup language for structured documents.' }],
    ['meta', { name: 'twitter:image', content: `${siteUrl(docsBase)}og-image.svg` }],
  ],

  themeConfig: {
    // Four entries plus the version switch. The Guide dropdown mirrors the
    // Start/Write/Integrate sidebar groups.
    nav: [
      {
        text: 'Guide',
        items: [
          {
            text: 'Start',
            items: [
              { text: 'Get Started', link: '/get-started' },
              { text: "What's new in 0.2", link: '/whats-new-0-2' },
              { text: 'Upgrade from 0.1', link: '/upgrade-0-2' },
              { text: 'Coming from Markdown', link: '/migrate-from-markdown' },
            ],
          },
          {
            text: 'Write',
            items: [
              { text: 'Blocks & Attributes', link: '/blocks-and-attributes' },
              { text: 'Diagrams & Charts', link: '/diagrams' },
              { text: 'SVG Images', link: '/svg-images' },
              { text: 'Styling Recipes', link: '/recipes' },
              { text: 'Optional Features & Extensions', link: '/extensions' },
            ],
          },
          {
            text: 'Integrate',
            items: [
              { text: 'Content Profiles', link: '/profiles' },
              { text: 'Validation', link: '/validation' },
              { text: 'Import HTML', link: '/html-import' },
              { text: 'Format Conversion', link: '/format-bridges' },
              { text: 'Parsed Document JSON', link: '/ast-json' },
            ],
          },
        ],
      },
      {
        text: 'Reference',
        items: [
          { text: 'Cheat Sheet', link: '/cheatsheet' },
          { text: 'Examples', link: '/examples' },
          { text: 'Extension Contract', link: '/extension-contract' },
          { text: 'HTML Import Contract', link: '/html-import-contract' },
          { text: 'JSON Contract', link: '/ast-json-contract' },
          { text: 'Formal Grammar', link: '/grammar' },
          { text: 'Conformance', link: '/conformance' },
        ],
      },
      {
        text: 'Ecosystem',
        items: [
          { text: 'Implementations & Tooling', link: '/ecosystem' },
          { text: 'Implement Carve', link: '/implementing-carve' },
          { text: 'Community', link: '/community' },
          { text: 'Case Study', link: '/case-study/' },
        ],
      },
      // A plain link before the version flyout: custom.css styles the LAST flyout as the version pill.
      { text: 'Playground', link: '/playground' },
      ...(docsVersionText ? [{
        text: docsVersionText,
        items: [
          { text: process.env.DOCS_LATEST_LABEL ?? '0.1 (latest)', link: siteUrl(docsLatestBase), target: '_self' },
          { text: process.env.DOCS_OTHER_LABEL ?? '0.2 (dev)', link: siteUrl(docsOtherBase), target: '_self' },
        ],
      }] : []),
    ],

    // Path-keyed (multi) sidebar so each page's sub-nav lists only its own
    // section, not the whole site. Case Study has many pages, so it gets its
    // own sidebar and is dropped from the main one. Groups follow the reader
    // (author, host, implementer), and the two deep groups start collapsed so
    // the sidebar fits small screens without relying on scroll (a fixed
    // overflow:auto drawer is unreliable on iOS). VitePress auto-expands the
    // group of the current page.
    sidebar: {
      // Dismissed Syntax belongs to the case study but lives at a top-level
      // route, so it needs its own sidebar key: VitePress picks a sidebar by
      // PATH PREFIX, and without this the page drops out of the case-study
      // sidebar and snaps back to the main one mid-read.
      '/case-study/': caseStudySidebar,
      '/dismissed-syntax': caseStudySidebar,
      '/': [
        {
          text: 'Start',
          collapsed: false,
          items: [
            { text: 'Get Started', link: '/get-started' },
            { text: "What's new in 0.2", link: '/whats-new-0-2' },
            { text: 'Upgrade from 0.1', link: '/upgrade-0-2' },
            { text: 'Coming from Markdown', link: '/migrate-from-markdown' },
            { text: 'Playground', link: '/playground' },
            { text: 'Cheat Sheet', link: '/cheatsheet' },
            {
              text: 'Examples',
              link: '/examples',
              collapsed: true,
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
          ],
        },
        {
          text: 'Write',
          collapsed: true,
          items: [
            { text: 'Blocks & Attributes', link: '/blocks-and-attributes' },
            {
              text: 'Include Files',
              link: '/include-files',
              collapsed: true,
              items: [{ text: 'File Inclusion Rules', link: '/includes' }],
            },
            { text: 'Metadata Blocks', link: '/metadata-blocks' },
            { text: 'Snippets', link: '/snippets' },
            { text: 'Revision Metadata', link: '/revision-metadata' },
            { text: 'Diagrams & Charts', link: '/diagrams' },
            { text: 'SVG Images', link: '/svg-images' },
            { text: 'Styling Recipes', link: '/recipes' },
            { text: 'Optional Features & Extensions', link: '/extensions' },
          ],
        },
        {
          text: 'Integrate',
          collapsed: true,
          items: [
            { text: 'Content Profiles', link: '/profiles' },
            { text: 'Validation', link: '/validation' },
            { text: 'Security', link: '/security' },
            { text: 'Output Without JavaScript', link: '/graceful-degradation' },
            { text: 'Static Output Recipes', link: '/static-rendering-recipes' },
            {
              text: 'Import HTML',
              link: '/html-import',
              collapsed: true,
              items: [{ text: 'HTML Import Contract', link: '/html-import-contract' }],
            },
            { text: 'Format Conversion', link: '/format-bridges' },
            {
              text: 'Parsed Document JSON',
              link: '/ast-json',
              collapsed: true,
              items: [
                { text: 'JSON Contract', link: '/ast-json-contract' },
                { text: 'Source Locations', link: '/ast-source-layout' },
                { text: 'Node Identity', link: '/ast-node-identity' },
                { text: 'Annotation Ranges', link: '/ast-annotation-ranges' },
                { text: 'Provenance', link: '/ast-provenance' },
                { text: 'Source-preserving Patches', link: '/source-patches' },
              ],
            },
            {
              text: 'Write an Extension',
              link: '/extension-tutorial',
              collapsed: true,
              items: [{ text: 'Extension Contract', link: '/extension-contract' }],
            },
          ],
        },
        {
          text: 'Implement',
          collapsed: true,
          items: [
            { text: 'Implement Carve', link: '/implementing-carve' },
            { text: 'Implementations & Tooling', link: '/ecosystem' },
            { text: 'Conformance', link: '/conformance' },
            { text: 'Rule Coverage', link: '/rule-coverage' },
            { text: 'Formal Grammar', link: '/grammar' },
            { text: 'Writer Escaping Strategy', link: '/writer-escaping-strategy' },
            { text: 'Container Ownership', link: '/ownership-procedure' },
            { text: 'Nested Braced Emphasis', link: '/nested-braced-emphasis' },
            { text: 'Syntax Edge Cases', link: '/parsing-ambiguities' },
            {
              text: 'Compare Implementations',
              link: '/implementation-comparison',
              collapsed: true,
              items: [{ text: 'Comparison Methodology', link: '/implementation-comparison-methodology' }],
            },
            { text: 'Supported CLI Paths', link: '/supported-path-matrix' },
            { text: 'Performance', link: '/performance' },
            { text: 'Development', link: '/development' },
          ],
        },
        {
          text: 'Background',
          collapsed: true,
          items: [
            { text: 'Technical Rationale', link: '/technical-rationale' },
            { text: 'Feature Design Notes', link: '/native-features-analysis' },
            {
              text: 'Compared to Other Formats',
              link: '/comparison',
              collapsed: true,
              items: [
                { text: 'Divergence from Djot', link: '/divergence-from-djot' },
                { text: 'Markup Language Comparison', link: '/markup-languages' },
                { text: 'Whitespace Across Formats', link: '/portable-whitespace' },
              ],
            },
            { text: 'Specification History', link: '/spec-history' },
            { text: 'Decision Trace', link: '/decision-trace' },
            { text: 'Case Study', link: '/case-study/' },
            {
              text: 'Experiments',
              collapsed: true,
              items: [
                { text: 'Comment Classification', link: '/experiments/comment-classification' },
                { text: 'Container Ownership', link: '/experiments/container-ownership' },
                { text: 'Definition and Footnote Bases', link: '/experiments/definition-footnote-authored-bases' },
              ],
            },
            { text: 'Terms Used Here', link: '/terms' },
            { text: 'Versioning & Changelog', link: '/versioning' },
            { text: 'Community', link: '/community' },
          ],
        },
      ],
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/markup-carve' },
      { icon: 'discord', link: 'https://discord.gg/ENgwFBdUZV' },
    ],

    editLink: {
      pattern: `https://github.com/markup-carve/carve/edit/${process.env.DOCS_EDIT_BRANCH ?? 'main'}/docs/:path`,
      text: 'Edit this page on GitHub',
    },

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Carve - a lightweight markup language for documents and the web.',
    },

    search: {
      provider: 'local',
    },

    outline: {
      level: [2, 3],
    },
  },
})
