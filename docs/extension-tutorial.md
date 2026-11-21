---
description: Claim an inline extension form and render it in static HTML.
---

# Writing an extension: a badge

This example claims an existing inline extension form and renders it in static HTML. It runs with Node.js 26 from a `carve-js` `next2` checkout. The interface is provisional; pin a reference revision before using it in production. See [registration and matching](https://github.com/markup-carve/carve/blob/next2/spec/0.2/extensions.md#registration-and-matching) and [extension status](https://github.com/markup-carve/carve/blob/next2/spec/0.2/STATUS.md).

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
}

const source = ':badge[Ready]'
console.log(render(source, {
  extensions: [badge],
  mode: 'static',
  renderers: { 'org.example.badge': badgeRenderer },
}))
```

The program prints:

```html
<p><span class="badge">Ready</span></p>
```

The transform maps one claimed core node to one qualified inline node. The fallback is plain inline content, so a reader without the extension can still show `Ready`. The source record lets a writer recover the claimable `:badge[Ready]` form. The renderer uses `host.inlines` to escape and render child content. Do not concatenate untrusted source into raw HTML. See [transform and carriage](https://github.com/markup-carve/carve/blob/next2/spec/0.2/extensions.md#transformation-and-carriage) and [rendering](https://github.com/markup-carve/carve/blob/next2/spec/0.2/extensions.md#resolution-rendering-and-equality).

The renderer is selected in static mode. A missing renderer uses the fallback and reports `extension-fallback-rendered`. Test both paths when an extension carries content that must remain readable without the host code.
