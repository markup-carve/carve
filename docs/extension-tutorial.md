---
description: Claim an inline extension form and render it as interactive and static HTML.
---

# Writing an extension: a badge

This example claims an existing inline extension form and renders it as interactive and static HTML. It runs with Node.js 26 from a `carve-js` `main` checkout. The interface is provisional; pin a reference revision before using it in production. See [registration and matching](https://github.com/markup-carve/carve/blob/main/spec/0.2/extensions.md#registration-and-matching) and [extension status](https://github.com/markup-carve/carve/blob/main/spec/0.2/STATUS.md).

The source is a core inline extension before registration:

```carve
:badge[Ready]
```

Save the following as `badge.mjs` in a project that installs `@markup-carve/carve` and run `node badge.mjs`:

```js
import { render } from '@markup-carve/carve'

const badge = {
  name: 'org.example.badge',
  version: '1',
  matcher: { form: 'inline', name: 'badge' },
  props: {},
  slots: {},
  transform(claim) {
    if (claim.form !== 'inline') return null
    return {
      type: 'inline_extension',
      name: 'org.example.badge',
      version: '1',
      children: claim.children,
      fallback: structuredClone(claim.children),
      source: claim.source,
    }
  },
}

const badgeRenderer = {
  version: '1',
  render(node, host) {
    return `<span class="badge">${host.inlines(node.children)}</span>`
  },
  buildTime(node, host) {
    return `<span class="badge badge-static">${host.inlines(node.children)}</span>`
  },
}

const source = ':badge[Ready]'
const options = {
  extensions: [badge],
  renderers: { 'org.example.badge': badgeRenderer },
}
console.log(render(source, options))
console.log(render(source, { ...options, mode: 'static' }))
```

The program prints:

```html
<p><span class="badge">Ready</span></p>
<p><span class="badge badge-static">Ready</span></p>
```

The transform maps one claimed core node to one qualified inline node. The fallback is plain inline content, so a reader without the extension can still show `Ready`. The source record lets a writer recover the claimable `:badge[Ready]` form. The renderer uses `host.inlines` to escape and render child content. Do not concatenate untrusted source into raw HTML. See [transform and carriage](https://github.com/markup-carve/carve/blob/main/spec/0.2/extensions.md#transformation-and-carriage) and [rendering](https://github.com/markup-carve/carve/blob/main/spec/0.2/extensions.md#resolution-rendering-and-equality).

The first call renders in interactive mode, the default, and uses `render`. The second passes `mode: 'static'` and uses `buildTime`, which returns self-contained HTML for output that runs no script. Static mode never falls back to `render`: a renderer without `buildTime` is missing in that mode (C2-X-052). A missing renderer uses the fallback and reports `extension-fallback-rendered`. Test both paths when an extension carries content that must remain readable without the host code.

A second example, [acronyms](./extension-acronyms.md), claims a fence and uses a document transform to expand an acronym on its first use.
