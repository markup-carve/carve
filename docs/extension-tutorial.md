---
description: Claim an inline extension form and render it as interactive and static HTML.
---

# Writing an extension: a QR-code case study

This is the hands-on companion to [Optional features and extensions](./extensions) and the [extension contract](./extension-contract). It builds one application extension, a `qr` fenced block, end to end, and on the way touches every layer you use for any extension: choosing the source form, claiming a core node, keeping a pure builder testable, rendering in interactive and static mode, keeping a readable fallback, and the security boundary.

QR is a good teaching example because it is small but not trivial. The symbol only ever encodes a string, yet the kind of QR code (a URL, a vCard, a WiFi join, an SMS) is only a payload convention. That split, a pure payload builder in front of a renderer, is the shape most useful extensions take.

The code on this page uses the JavaScript reference engine, `@markup-carve/carve`, and runs on Node.js 20 or later. Save each file as an ES module (`.mjs`) in a project that installs the package. The 0.2 extension interface is provisional and may change in a 0.2.x release, so pin the engine revision you build against.

The author writes any of these. The type rides on the hyphenated fence language (`qr-wifi`, `qr-sms`, and so on); a bare `qr` is a URL:

::: code-group

````crv [URL]
```qr
https://example.com
```
````

````crv [WiFi]
```qr-wifi
ssid: HomeNet
password: hunter2
security: WPA
```
````

````crv [SMS]
```qr-sms
to: +15550100
body: Running late, be there soon
```
````

````crv [vCard]
```qr-vcard
name: Jane Doe
org: ACME, Inc
tel: +15550100
email: jane@example.com
url: https://example.com
```
````

:::

With the extension registered, each one becomes a scannable QR code: a link to open, a network to join, a text to send, a contact to save. It is the same extension with a different payload convention (Step 1).

::: tip An application extension
The `qr` extension is not part of the standard catalog. It is off unless a host registers it, and it changes nothing about core Carve: it only claims code fences whose language starts with `qr`. Without it, those fences stay ordinary code blocks, so the text is never lost.
:::

## The extension surface

Carve 0.2 keeps its syntax fixed. An extension cannot add a delimiter or line shape. Instead it claims one of three existing core forms after the core parser has finished: an inline `:name[content]`, a named div (`::: name`), or a fenced code block by its language. The QR extension needs no new parser at all: core already parses a fenced code block and records its language.

An extension has two parts. The definition claims core nodes and transforms each into an extension node; the renderer turns that node into HTML. This excerpt shows the fields of the JavaScript types that this page uses:

```ts
interface ExtensionDefinition {
  name: string                       // qualified, e.g. 'org.example.qr.qr'
  version: string                    // exact; the node carries the same version
  matcher?: { form: 'inline' | 'div' | 'fence'; name: string }
  props: Record<string, 'string' | 'number' | 'boolean' | 'object' | 'array'>
  slots: Record<string, ExtensionSlot>
  children?: 'none'
  transform?: (claim: ExtensionClaim) => BlockExtensionNode | InlineExtensionNode | null
}

interface ExtensionRenderer {
  version: string
  render?: (node, host: ExtensionRenderHost) => string     // interactive mode
  buildTime?: (node, host: ExtensionRenderHost) => string  // static mode
}
```

A host passes the definitions as the `extensions` render option and the renderers as `renderers`, a map keyed by qualified name. The standard extensions in `@markup-carve/carve/extensions` use the same shape: each factory returns `{ extensions, renderers }`, which you can spread straight into the render options. Other engines that implement the 0.2 extension interface follow the same claim, transform and render steps under their own function names.

## Step 1: the payload conventions

The QR symbol encodes a string; scanners recognize a type by the shape of that string. These are de facto conventions, not a single standard, and support varies by scanner (especially for vCard versions and the WiFi hidden flag):

| type | payload | notes |
|---|---|---|
| `url` / `text` | the string as is | a URL is text the scanner offers to open |
| `tel` | `tel:+15550100` | |
| `sms` | `SMSTO:+15550100:message` | the most compatible form |
| `email` | `mailto:a@b.com?subject=Hi&body=…` | |
| `geo` | `geo:37.42,-122.08` | optional `?q=Label` |
| `wifi` | `WIFI:T:WPA;S:ssid;P:pass;H:false;;` | escape `\ ; , : "` in values |
| `mecard` | `MECARD:N:Doe,Jane;TEL:…;EMAIL:…;;` | compact, widely supported |
| `vcard` | `BEGIN:VCARD␍␊VERSION:3.0␍␊…END:VCARD` | richer, larger symbol |

The type rides on the fence language: a bare `qr` fence is a URL or text, and a type is a hyphenated language such as `qr-wifi` or `qr-vcard`. It has to be one hyphenated word, not a second word. In ```` ```qr wifi ```` the opener reads only `qr` as the language, ignores `wifi`, and `fence-title-syntax` warns that the text after `qr` is neither a quoted title nor a label. The block would then be claimed as a plain URL code.

::: tip Authors never escape
WiFi, MeCard and vCard payloads treat `\ ; , :` (and `"` for WiFi) as structure, but that is the builder's job, not the author's. The author writes the plain value (`password: pa;ss`, `org: ACME, Inc`) and `buildQrPayload` escapes it. A fenced code body is verbatim, with no inline parsing, so the builder receives exactly what the author typed. Forget the escaping and a value with `;` or `,` silently corrupts the symbol.
:::

## Step 2: the payload builder (pure, testable)

Keep this separate from the extension. It is pure string logic, the easiest part of any extension to unit-test, and the part you extend when you add a new type without touching rendering. Save it as `qr-payload.mjs`:

```js
// Puts a backslash before each character of `chars` found in `value`.
const escape = (value, chars) =>
  [...String(value ?? '')].map((c) => (chars.includes(c) ? '\\' + c : c)).join('')

// "key: value" lines into an object; the value keeps any later colons.
function fields(body) {
  const result = {}
  for (const line of body.split('\n')) {
    const at = line.indexOf(':')
    if (at > 0) result[line.slice(0, at).trim()] = line.slice(at + 1).trim()
  }
  return result
}

export function buildQrPayload(type, body) {
  const f = fields(body)
  const [first = '', last = ''] = (f.name ?? '').split(' ')

  switch (type) {
    case 'url':
    case 'text':
      return body.trim()
    case 'tel':
      return `tel:${body.trim()}`
    case 'geo':
      return `geo:${body.trim()}`
    case 'sms':
      return `SMSTO:${f.to ?? ''}:${f.body ?? ''}`
    case 'email':
      return `mailto:${f.to ?? ''}?subject=${encodeURIComponent(f.subject ?? '')}` +
        `&body=${encodeURIComponent(f.body ?? '')}`
    case 'wifi': {
      const e = (s) => escape(s, '\\;,:"')
      return `WIFI:T:${(f.security ?? 'WPA').toUpperCase()};S:${e(f.ssid)};` +
        `P:${e(f.password)};H:${f.hidden === 'true'};;`
    }
    case 'mecard': {
      const e = (s) => escape(s, '\\;,:')
      return `MECARD:N:${e(last)},${e(first)};` +
        (f.tel ? `TEL:${e(f.tel)};` : '') +
        (f.email ? `EMAIL:${e(f.email)};` : '') +
        (f.url ? `URL:${e(f.url)};` : '') + ';'
    }
    case 'vcard': {
      // vCard 3.0 escapes \ ; , and writes a line break inside a value as \n.
      const v = (s) => escape(s, '\\;,').replace(/\r?\n/g, '\\n')
      return [
        'BEGIN:VCARD', 'VERSION:3.0',
        `N:${v(last)};${v(first)};;;`, `FN:${v(f.name)}`,
        f.org && `ORG:${v(f.org)}`, f.tel && `TEL:${v(f.tel)}`,
        f.email && `EMAIL:${v(f.email)}`, f.url && `URL:${v(f.url)}`,
        'END:VCARD',
      ].filter(Boolean).join('\r\n')
    }
    default:
      return body.trim()
  }
}
```

Try it with a few bodies (`payload-demo.mjs`):

```js
import { buildQrPayload } from './qr-payload.mjs'

console.log(buildQrPayload('url', 'https://example.com\n'))
console.log(buildQrPayload('wifi', 'ssid: Home;Net\npassword: pa:ss, "x"\nsecurity: wpa\n'))
console.log(buildQrPayload('sms', 'to: +15550100\nbody: Running late, be there soon\n'))
console.log(buildQrPayload('mecard', 'name: Jane Doe\ntel: +15550100\n'))
console.log(JSON.stringify(buildQrPayload('vcard', 'name: Jane Doe\norg: ACME, Inc\n')))
```

`node payload-demo.mjs` prints:

```text
https://example.com
WIFI:T:WPA;S:Home\;Net;P:pa\:ss\, \"x\";H:false;;
SMSTO:+15550100:Running late, be there soon
MECARD:N:Doe,Jane;TEL:+15550100;;
"BEGIN:VCARD\r\nVERSION:3.0\r\nN:Doe;Jane;;;\r\nFN:Jane Doe\r\nORG:ACME\\, Inc\r\nEND:VCARD"
```

## Step 3: the encoder (string to SVG)

Use a real QR library for the symbol itself. It takes the final payload string unchanged and picks an error-correction level and symbol version large enough for the data, which matters for vCard payloads. In JavaScript, [`qrcode`](https://www.npmjs.com/package/qrcode) does this with `QRCode.toString(text, { type: 'svg' })`. A renderer must return a string, so when your library encodes asynchronously, as that call does without a callback, encode the payloads before rendering and look them up in the renderer.

Keep the encoder a one-function seam, `encode(payload) -> string`, passed in by the host. The extension then never depends on a specific library, and a test can pass a stand-in.

## Step 4: wiring it into Carve

A fence matcher claims a code block by its language, one language per definition. The extension therefore registers one definition for `qr` and one for each `qr-<type>`, and each gets its own qualified name, as the standard `carve.imgFence.img` and `carve.imgFence.image` do. Save it as `qr-extension.mjs`:

```js
import { buildQrPayload } from './qr-payload.mjs'

const TYPES = ['url', 'text', 'tel', 'geo', 'sms', 'email', 'wifi', 'mecard', 'vcard']

// Fence language -> payload type: `qr` is a URL, `qr-wifi` is wifi.
const LANGUAGES = { qr: 'url', ...Object.fromEntries(TYPES.map((t) => [`qr-${t}`, t])) }

// One fence matcher per language, so one name per language as well.
const nameOf = (language) => `org.example.qr.${language}`

function transform(claim) {
  if (claim.form !== 'fence') return null
  const { attrs, ...fallback } = claim.node // the extension node carries the attributes
  return {
    type: 'block_extension',
    name: nameOf(claim.name),
    version: '1',
    children: [],
    props: { type: LANGUAGES[claim.name], payload: buildQrPayload(LANGUAGES[claim.name], claim.value) },
    fallback: [fallback],
    source: claim.source,
    ...(claim.attrs ? { attrs: claim.attrs } : {}),
  }
}

// `encode` turns a payload string into trusted SVG markup, for example with the `qrcode` package.
export function qr({ encode }) {
  const figure = (node, host) => {
    const attrs = { ...node.attrs, classes: ['qr', ...(node.attrs?.classes ?? [])] }
    return `<figure${host.attributes({ ...node, attrs }, { block: true })}>${encode(node.props.payload)}</figure>`
  }
  const renderer = { version: '1', render: figure, buildTime: figure }
  const languages = Object.keys(LANGUAGES)
  return {
    extensions: languages.map((language) => ({
      name: nameOf(language),
      version: '1',
      matcher: { form: 'fence', name: language },
      props: { type: 'string', payload: 'string' },
      slots: {},
      children: 'none',
      transform,
    })),
    renderers: Object.fromEntries(languages.map((language) => [nameOf(language), renderer])),
  }
}
```

Some points of the contract show up here:

- The transform receives a claim with the fence language (`claim.name`), the code text (`claim.value`), the attributes and the core node. It returns one block extension node for one claimed block, and it reads nothing outside that node.
- `fallback` is mandatory. It is core content of the same role, here the code block itself, which a reader without the extension renders instead. The attributes move to the extension node, so the fallback does not repeat them.
- `source` is the claim's source record. It lets the Carve writer spell the node again as the original `qr` fence.
- The renderer returns an HTML string that the host inserts unchanged. `host.attributes` writes the authored id, classes and pairs in the core order.

A document mixes QR blocks with other code (`doc.crv`):

````crv
```qr
https://example.com
```

{#guest-wifi}
```qr-wifi
ssid: HomeNet
password: pa;ss
```

```js
console.log('not a QR code')
```
````

The program (`main.mjs`) renders it with a stand-in encoder that writes the payload as the SVG title, so the output stays readable:

```js
import { readFileSync } from 'node:fs'
import { render } from '@markup-carve/carve'
import { qr } from './qr-extension.mjs'

// A stand-in encoder for this demo: it writes the payload as the SVG title.
const escape = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')
const encode = (payload) => `<svg role="img"><title>${escape(payload)}</title></svg>`

const source = readFileSync('doc.crv', 'utf8')
console.log(render(source, qr({ encode })))
```

`node main.mjs` prints:

```html
<figure class="qr"><svg role="img"><title>https://example.com</title></svg></figure>
<figure id="guest-wifi" class="qr"><svg role="img"><title>WIFI:T:WPA;S:HomeNet;P:pa\;ss;H:false;;</title></svg></figure>
<pre><code class="language-js">console.log('not a QR code')
</code></pre>
```

That is the whole extension. Authors now write `qr` blocks, and every other fenced block behaves exactly as before.

### What a reader without the extension sees

Without registration, the same document is three ordinary code blocks. This is the core render, as every Carve processor writes it:

::: compare
````crv
```qr
https://example.com
```

{#guest-wifi}
```qr-wifi
ssid: HomeNet
password: pa;ss
```

```js
console.log('not a QR code')
```
````
```html
<pre><code class="language-qr">https://example.com
</code></pre>
<pre id="guest-wifi"><code class="language-qr-wifi">ssid: HomeNet
password: pa;ss
</code></pre>
<pre><code class="language-js">console.log('not a QR code')
</code></pre>
```
:::

## Step 5: static and interactive rendering

Carve 0.2 renders in one of two modes. The default, `interactive`, calls a renderer's `render`. `static` mode, for output that runs no script (email, PDF, archived HTML), calls `buildTime` and nothing else: a renderer registered for interactive mode alone does not handle static mode, and the node falls back. The QR renderer registers the same function in both channels because its SVG is already self-contained.

If you would rather ship the payload and let the browser draw the symbol (smaller HTML, as Mermaid does), emit a placeholder in interactive mode and let a client script turn it into a canvas. The shipped `fencedRender` factory writes such a placeholder for any fence language (`client.mjs`):

```js
import { render } from '@markup-carve/carve'
import { fencedRender } from '@markup-carve/carve/extensions'

const qrClient = fencedRender({ language: ['qr', 'qr-wifi'], cssClass: 'qr', label: 'QR code' })
console.log(render('```qr\nhttps://example.com\n```\n', qrClient))
console.log(render('```qr\nhttps://example.com\n```\n', { ...qrClient, mode: 'static' }))
```

`node client.mjs` prints:

```html
<pre class="qr" role="img" aria-label="QR code">https://example.com</pre>
<pre><code class="language-qr">https://example.com
</code></pre>
```

The second line is static mode: `fencedRender` without a `build` function registers no build-time renderer, so the fallback code block is written. Pass `build: (source) => svg` to `fencedRender` to fill the static channel. See [Static rendering recipes](./static-rendering-recipes) for when each mode fits.

### Fallbacks and diagnostics

Test the paths a reader takes when part of the extension is missing (`fallback.mjs`):

```js
import { readFileSync } from 'node:fs'
import { parse, renderWithDiagnostics, write } from '@markup-carve/carve'
import { qr } from './qr-extension.mjs'

const source = readFileSync('doc.crv', 'utf8')
const { extensions, renderers } = qr({ encode: () => '<svg></svg>' })

// Registered matcher, but no renderer: the fallback code block is written.
const out = renderWithDiagnostics(source, { extensions })
console.log(out.html)
for (const d of out.diagnostics) console.log(d.code, '-', d.message)

// A renderer without buildTime: static mode writes the fallback too.
const interactiveOnly = Object.fromEntries(
  Object.entries(renderers).map(([name, r]) => [name, { version: r.version, render: r.render }]))
console.log(renderWithDiagnostics('```qr\nhttps://example.com\n```\n',
  { extensions, renderers: interactiveOnly, mode: 'static' }).html)

// The source record lets the writer spell the claimed fence again.
console.log(write(parse(source, { extensions }), { extensions }) === source)
```

`node fallback.mjs` prints:

```text
<pre><code class="language-qr">https://example.com
</code></pre>
<div id="guest-wifi">
  <pre><code class="language-qr-wifi">ssid: HomeNet
password: pa;ss
</code></pre>
</div>
<pre><code class="language-js">console.log('not a QR code')
</code></pre>
extension-fallback-rendered - Rendered the fallback of the extension "org.example.qr.qr", which has no matching renderer
extension-fallback-rendered - Rendered the fallback of the extension "org.example.qr.qr-wifi", which has no matching renderer
<pre><code class="language-qr">https://example.com
</code></pre>
true
```

Three behaviors show here:

- With a matcher but no renderer, the HTML renderer writes the fallback and reports `extension-fallback-rendered`. A node with attributes keeps them on a wrapping `<div>`, so `#guest-wifi` still resolves.
- In static mode, a renderer without `buildTime` counts as missing, and the fallback is written.
- `write` with the extension registered gives back the original source, because each node carries its source record.

A renderer or transform that throws does not break the render: a failed transform keeps the core code block, a failed renderer writes the fallback, and both report a diagnostic that names the extension.

## Step 6: testing

Because the two halves are separate, the interesting logic tests without a renderer: give `buildQrPayload` a type and body and assert the exact payload, escaping included. A render test then asserts the HTML wrapper once, with a stand-in encoder (`qr.test.mjs`):

```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { render } from '@markup-carve/carve'
import { buildQrPayload } from './qr-payload.mjs'
import { qr } from './qr-extension.mjs'

test('wifi values are escaped', () => {
  assert.equal(buildQrPayload('wifi', 'ssid: a;b\npassword: c,d\n'), 'WIFI:T:WPA;S:a\\;b;P:c\\,d;H:false;;')
})

test('a qr fence renders as a figure', () => {
  const html = render('```qr\nhttps://example.com\n```\n', qr({ encode: (p) => `[${p}]` }))
  assert.equal(html, '<figure class="qr">[https://example.com]</figure>')
})
```

`node --test qr.test.mjs` passes both tests. This is the same shape the core uses: a pure transform pinned by examples, the rendering asserted once.

## The security boundary

An extension renderer is trusted host code. The host writes its HTML string unchanged, so the extension owns the safety of that output:

- The QR extension only emits `<figure>` and the encoder's `<svg>`. It never puts author text into an attribute or a `<script>` without escaping. Author values flow into payload data, not into markup.
- Use the host helpers for anything authored: `host.escapeText`, `host.escapeAttribute`, `host.attributes`, and `host.inlines` or `host.blocks` for child content. Profile restrictions and the URL policy apply inside slots and the fallback.
- If you sanitize the converted HTML downstream (recommended for untrusted input), allow the tags your extensions produce. The `json` content mode of `fencedRender`, used by the `chart` and `vega-lite` presets, emits a `<script type="application/json">`; QR needs none of that.
- A host that renders untrusted documents registers only renderers it trusts.

The escaping in Step 2 is about QR correctness, not HTML safety. Keep both. See [Security](./security) for the document-level model.

## A smaller example: an inline badge

The QR extension claims a block. An inline extension claims `:name[content]` and gets the parsed inline children instead of text. This one claims `:badge[Ready]` and renders it differently per mode (`badge.mjs`):

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

The fallback is plain inline content, so a reader without the extension still shows `Ready`. The renderer uses `host.inlines` to escape and render the children; never concatenate untrusted source into raw HTML. Without the extension, core renders `:badge[Ready]` as a generic span that keeps the name as a class:

::: compare
```crv
:badge[Ready]
```
```html
<p><span class="ext-badge">Ready</span></p>
```
:::

## Second example: a static map

QR showed the build-time image shape. A `map` block shows the same pure-builder and render-seam split, with three interchangeable render modes behind one source form, the choice most embed extensions face.

The author writes a coordinate, an optional style and an optional caption. A body that is no coordinate stays a code block (`map.crv`):

````crv
```map
52.520,13.405,12
style: dark
Brandenburg Gate, Berlin
```

```map
somewhere near the river
```
````

### Builder (pure): parse and check the coordinate

```js
// "lat,lon[,zoom]", then optional "style: name" and caption lines -> a checked model, or null.
export function parseMap(body) {
  const [coords = '', ...rest] = body.trim().split('\n')
  const [lat, lon, zoom = 12] = coords.split(',').map((s) => Number(s.trim()))
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return null
  const style = rest.find((line) => line.startsWith('style:'))?.slice(6).trim() || 'light'
  const caption = rest.filter((line) => !line.startsWith('style:')).join(' ').trim()
  return { lat, lon, zoom: Number.isFinite(zoom) ? zoom : 12, style, caption }
}
```

Everything after this decides which seam turns the model into HTML. All three take the same `parseMap` result.

### Mode A: build-time SVG (self-contained, offline, no key)

No network, no API key, no client script: the coordinate becomes a small inline SVG with a pin. This fits email, PDF and archived HTML. Only numbers and palette constants reach the markup, so there is nothing to escape and nothing to inject.

```js
// Mode A: a self-contained SVG. Only numbers and palette constants reach the markup.
export function renderMapSvg(m) {
  const p = PALETTES[m.style] ?? PALETTES.light
  const label = `${m.lat.toFixed(3)}, ${m.lon.toFixed(3)}`
  return `<svg viewBox="0 0 240 140" width="240" role="img" aria-label="Map of ${label}">` +
    `<rect width="240" height="140" fill="${p.ground}"/>` +
    `<path d="M0 80 Q70 55 130 88 T240 70" fill="none" stroke="${p.road}" stroke-width="9"/>` +
    `<path d="M60 0 L78 140" stroke="${p.road}" stroke-width="6"/>` +
    `<circle cx="120" cy="70" r="7" fill="${p.pin}" stroke="${p.ring}" stroke-width="2"/>` +
    `<text x="120" y="100" text-anchor="middle" font-size="10" fill="${p.text}">${label}</text></svg>`
}
```

The `style` line is data the builder maps to a palette; adding a style is a table entry, not a new code path. These are the three SVGs `renderMapSvg` prints for `light`, `dark` and `blueprint` (`gallery.mjs` calls it once per style), shown inline:

<div style="display:flex;gap:1rem;flex-wrap:wrap;align-items:flex-start;margin:1rem 0">
<figure style="margin:0;width:240px">
<svg viewBox="0 0 240 140" width="240" role="img" aria-label="Map of 52.520, 13.405"><rect width="240" height="140" fill="#eef1f4"/><path d="M0 80 Q70 55 130 88 T240 70" fill="none" stroke="#cdd6df" stroke-width="9"/><path d="M60 0 L78 140" stroke="#cdd6df" stroke-width="6"/><circle cx="120" cy="70" r="7" fill="#e5484d" stroke="#fff" stroke-width="2"/><text x="120" y="100" text-anchor="middle" font-size="10" fill="#586069">52.520, 13.405</text></svg>
<figcaption style="font-size:.8rem;color:#8b949e"><code>style: light</code></figcaption>
</figure>
<figure style="margin:0;width:240px">
<svg viewBox="0 0 240 140" width="240" role="img" aria-label="Map of 52.520, 13.405"><rect width="240" height="140" fill="#0f1922"/><path d="M0 80 Q70 55 130 88 T240 70" fill="none" stroke="#2d4a5a" stroke-width="9"/><path d="M60 0 L78 140" stroke="#2d4a5a" stroke-width="6"/><circle cx="120" cy="70" r="7" fill="#f0a020" stroke="#0f1922" stroke-width="2"/><text x="120" y="100" text-anchor="middle" font-size="10" fill="#9fb0bd">52.520, 13.405</text></svg>
<figcaption style="font-size:.8rem;color:#8b949e"><code>style: dark</code></figcaption>
</figure>
<figure style="margin:0;width:240px">
<svg viewBox="0 0 240 140" width="240" role="img" aria-label="Map of 52.520, 13.405"><rect width="240" height="140" fill="#103a87"/><path d="M0 80 Q70 55 130 88 T240 70" fill="none" stroke="#dce8ff" stroke-width="9"/><path d="M60 0 L78 140" stroke="#dce8ff" stroke-width="6"/><circle cx="120" cy="70" r="7" fill="#fff" stroke="#103a87" stroke-width="2"/><text x="120" y="100" text-anchor="middle" font-size="10" fill="#dce8ff">52.520, 13.405</text></svg>
<figcaption style="font-size:.8rem;color:#8b949e"><code>style: blueprint</code></figcaption>
</figure>
</div>

### Mode B: build-time provider image (a real map, still one `<img>`)

The seam calls a static-map service at build time and emits the returned image. The page stays self-contained (no client script); the network fetch and the API key live in the build, not in the reader's browser. The builder makes the URL from the checked numbers, so the coordinate never reaches markup raw:

```js
// Mode B: a build-time image from a static-map service; the key stays in the build.
export function mapImageUrl(m, key) {
  return 'https://maps.geoapify.com/v1/staticmap?style=osm-bright&width=520&height=300' +
    `&center=lonlat:${m.lon},${m.lat}&zoom=${m.zoom}&marker=lonlat:${m.lon},${m.lat}&apiKey=${encodeURIComponent(key)}`
}
```

### Mode C: live embed (interactive, client)

When the reader needs to pan and zoom, emit a provider iframe instead. OpenStreetMap needs no key. This is the interactive `render` channel; register a Mode A or Mode B `buildTime` next to it so static output still shows a map.

```js
// Mode C: an interactive OpenStreetMap embed, drawn by the reader's browser.
export function mapEmbedUrl(m) {
  const box = [m.lon - 0.03, m.lat - 0.015, m.lon + 0.03, m.lat + 0.015].map((n) => n.toFixed(3))
  return `https://www.openstreetmap.org/export/embed.html?bbox=${box}&marker=${m.lat},${m.lon}`
}
```

### Wiring: the same claim as QR

```js
function figure(node, host) {
  const m = node.props
  const caption = m.caption ? `<figcaption>${host.escapeText(m.caption)}</figcaption>` : ''
  return `<figure${host.attributes(node, { block: true })}>${renderMapSvg(m)}${caption}</figure>`
}

export function map() {
  const name = 'org.example.map'
  return {
    extensions: [{
      name,
      version: '1',
      matcher: { form: 'fence', name: 'map' },
      props: { lat: 'number', lon: 'number', zoom: 'number', style: 'string', caption: 'string' },
      slots: {},
      children: 'none',
      transform(claim) {
        const m = parseMap(claim.value)
        if (claim.form !== 'fence' || m === null) return null // not a coordinate: stays a code block
        const { attrs, ...fallback } = claim.node
        return { type: 'block_extension', name, version: '1', children: [], props: m,
          fallback: [fallback], source: claim.source, ...(claim.attrs ? { attrs: claim.attrs } : {}) }
      },
    }],
    renderers: { [name]: { version: '1', render: figure, buildTime: figure } },
  }
}
```

Returning `null` from the transform leaves the claimed code block as it was, so a body that is no coordinate stays readable. Rendering `map.crv` and the two URL builders (`map-main.mjs`):

```js
import { readFileSync } from 'node:fs'
import { render } from '@markup-carve/carve'
import { map, mapEmbedUrl, mapImageUrl, parseMap } from './map-extension.mjs'

console.log(render(readFileSync('map.crv', 'utf8'), map()))

const m = parseMap('52.520,13.405,12\nBrandenburg Gate, Berlin')
console.log(mapImageUrl(m, 'YOUR_KEY'))
console.log(mapEmbedUrl(m))
```

`node map-main.mjs` prints:

```html
<figure><svg viewBox="0 0 240 140" width="240" role="img" aria-label="Map of 52.520, 13.405"><rect width="240" height="140" fill="#0f1922"/><path d="M0 80 Q70 55 130 88 T240 70" fill="none" stroke="#2d4a5a" stroke-width="9"/><path d="M60 0 L78 140" stroke="#2d4a5a" stroke-width="6"/><circle cx="120" cy="70" r="7" fill="#f0a020" stroke="#0f1922" stroke-width="2"/><text x="120" y="100" text-anchor="middle" font-size="10" fill="#9fb0bd">52.520, 13.405</text></svg><figcaption>Brandenburg Gate, Berlin</figcaption></figure>
<pre><code class="language-map">somewhere near the river
</code></pre>
https://maps.geoapify.com/v1/staticmap?style=osm-bright&width=520&height=300&center=lonlat:13.405,52.52&zoom=12&marker=lonlat:13.405,52.52&apiKey=YOUR_KEY
https://www.openstreetmap.org/export/embed.html?bbox=13.375,52.505,13.435,52.535&marker=52.52,13.405
```

The lesson: one source form, a pure model, and a seam you pick per medium (offline SVG, build-time image, or live embed) without the author changing a thing.

## Where this fits

The pattern generalizes: a pure builder (author input to a canonical string or model) in front of a render seam (model to HTML, swappable per library), wired through one claim, off by default. The standard extensions are built the same way: the diagram presets and `mathBlock` claim fences, `details`, `spoiler` and `tabs` claim divs, `wikilinks` and `citations` claim inline forms. For what already ships and how to turn it on, read [Optional features and extensions](./extensions); for the rules every host follows, the [extension contract](./extension-contract).

**Specification (external):** [registration and matching](https://github.com/markup-carve/carve/blob/main/spec/0.2/extensions.md#registration-and-matching) (C2-X-001 to C2-X-014), [transformation and carriage](https://github.com/markup-carve/carve/blob/main/spec/0.2/extensions.md#transformation-and-carriage) (C2-X-015 to C2-X-031), [resolution, rendering and equality](https://github.com/markup-carve/carve/blob/main/spec/0.2/extensions.md#resolution-rendering-and-equality) (C2-X-032 to C2-X-055, including the static channel C2-X-052), and [extension status](https://github.com/markup-carve/carve/blob/main/spec/0.2/STATUS.md).
