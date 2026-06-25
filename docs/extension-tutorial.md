# Writing an extension: a QR-code case study

This is the hands-on companion to the normative
[Extensions Contract](./extensions). It builds **one real Tier-3 extension** -
a `qr` fenced block - end to end, and in doing so touches every layer you would
use for any extension: choosing syntax, turning a node into HTML at render time,
keeping a pure transform testable, static vs. client rendering, and the
security boundary.

QR is a good teaching example because it is small but not trivial: the symbol
only ever encodes a **string**, yet the *kind* of QR (a URL, a vCard, a WiFi
join, an SMS) is just a **payload convention**. That split - a pure
*payload builder* in front of a *renderer* - is the shape most useful
extensions take.

The author writes any of these - the type rides on the hyphenated fence info
word (`qr-wifi`, `qr-sms`, …; bare `qr` is a URL):

::: code-group

````carve [URL]
```qr
https://example.com
```
````

````carve [WiFi]
```qr-wifi
ssid: HomeNet
password: hunter2
security: WPA
```
````

````carve [SMS]
```qr-sms
to: +15550100
body: Running late, be there soon
```
````

````carve [vCard]
```qr-vcard
name: Jane Doe
org: ACME, Inc
tel: +15550100
email: jane@example.com
url: https://example.com
```
````

:::

and gets a scannable QR for each - a link to open, a network to join, a text to
send, a contact to save. Same extension, different payload convention (Step 1).

::: tip Tier
Everything here is [Tier-3](./extensions#_1-feature-taxonomy): an app extension,
off by default, never part of the conformance corpus. It changes nothing about
core Carve - it only claims the `qr` info word on fenced code blocks, which core
would otherwise render as a `<pre><code class="language-qr">`.
:::

## The extension surface

An extension never hijacks core syntax; it adds to it. carve-js exposes the
lifecycle as a plain object, carve-php as a `register()` hook on the converter -
same contract, different binding:

::: code-group

```ts [carve-js]
interface CarveExtension {
  name: string
  matchInline?: InlineMatcher          // parse stage: add inline syntax
  matchBlock?: BlockMatcher            // parse stage: add block syntax
  afterParse?(doc): Document           // transform the AST
  beforeRender?(doc): Document         // transform before rendering
  blockRenderers?: Record<string, …>   // render a block node type -> HTML
  inlineRenderers?: Record<string, …>  // render an inline node type -> HTML
  staticBlockRenderers?: …             // build-time (mode: "static") variants
}
```

```php [carve-php]
interface ExtensionInterface {
    // Hook the converter's lifecycle events; e.g. a render-stage block hook
    // via StaticRenderExtensionInterface::renderStaticHtml().
    public function register(CarveConverter $converter): void;
}
```

:::

For QR we do **not** need a new parser - core already parses a fenced code block
and records its info word (`qr`). We only need a **render hook** for that node.
That is the same mechanism the shipped `mermaid` / `vega-lite` extensions use.

## Step 1 - the payload conventions

The QR symbol encodes a string; scanners recognize a *type* by the string's
shape. These are de-facto conventions (support varies by scanner, especially for
vCard versions and the WiFi hidden flag), not a single standard:

| type | payload | notes |
|---|---|---|
| `url` / `text` | the string as-is | a URL is just text the scanner offers to open |
| `tel` | `tel:+15550100` | |
| `sms` | `SMSTO:+15550100:message` | most compatible form |
| `email` | `mailto:a@b.com?subject=Hi&body=…` | |
| `geo` | `geo:37.42,-122.08` | optional `?q=Label` |
| `wifi` | `WIFI:T:WPA;S:ssid;P:pass;H:false;;` | escape `\ ; , : "` in values |
| `contact` (MeCard) | `MECARD:N:Doe,Jane;TEL:…;EMAIL:…;;` | compact, widely supported |
| `vcard` | `BEGIN:VCARD␍␊VERSION:3.0␍␊…END:VCARD` | richer, larger symbol |
| `event` | `BEGIN:VEVENT␍␊SUMMARY:…␍␊…END:VEVENT` | add-to-calendar |

The type rides on the **fence info word**: bare `` ```qr `` is a URL/text, and a
type is a *hyphenated* token `` ```qr-wifi ``, `` ```qr-vcard ``, etc. It must be
hyphenated, not a second word: `` ```qr wifi `` is, per the grammar's
[invalid-fence fallback](./extensions), *not* a code block at all (a bare second
info word disqualifies the fence), so the type has to be part of the single
`language_info` token — and `-` is a valid token character.

::: tip Authors never escape
WiFi / MeCard / vCard treat `\ ; , :` (and `"` for WiFi) as **structural**, but
that is the *builder's* problem, not the author's. The author always writes the
plain value — `password: pa;ss`, `org: ACME, Inc` — and `buildQrPayload`
escapes it. The fenced-code body is verbatim (no inline parsing), so what the
author types is exactly what the builder receives; keeping all escaping inside
the builder is what makes the input friendly. Forget the escaping and a value
with a `;` or `,` silently corrupts the symbol.
:::

## Step 2 - the payload builder (pure, testable)

Keep this separate from the renderer. It is pure string logic - the easiest part
of any extension to unit-test, and the part you extend when you add a new type
(`bitcoin:`, `paypal`, …) without touching rendering.

::: code-group

```ts [carve-js]
const esc = (s: string, chars: string) =>
  String(s ?? '').replace(new RegExp(`([${chars.replace(/[\\\]]/g, '\\$&')}])`, 'g'), '\\$1')

export function buildQrPayload(type: string, body: string): string {
  const f = Object.fromEntries(
    body.split('\n').map((l) => l.split(/:(.*)/s).map((s) => s.trim())).filter((p) => p[0]))
  const [first = '', last = ''] = (f.name ?? '').split(' ')

  switch ((type || 'url').toLowerCase()) {
    case 'url': case 'text': return body.trim()
    case 'tel':  return `tel:${body.trim()}`
    case 'geo':  return `geo:${body.trim()}`
    case 'sms':  return `SMSTO:${f.to}:${f.body ?? ''}`
    case 'email':
      return `mailto:${f.to}?subject=${encodeURIComponent(f.subject ?? '')}` +
             `&body=${encodeURIComponent(f.body ?? '')}`
    case 'wifi': {
      const e = (s: string) => esc(s, '\\;,:"')
      return `WIFI:T:${(f.security ?? 'WPA').toUpperCase()};S:${e(f.ssid)};` +
             `P:${e(f.password ?? '')};H:${f.hidden === 'true' ? 'true' : 'false'};;`
    }
    case 'contact': case 'mecard': {
      const e = (s: string) => esc(s, '\\;,:')
      return `MECARD:N:${e(last)},${e(first)};` +
             (f.tel ? `TEL:${e(f.tel)};` : '') + (f.email ? `EMAIL:${e(f.email)};` : '') +
             (f.url ? `URL:${e(f.url)};` : '') + ';'
    }
    case 'vcard': {
      // vCard 3.0 escapes `\ ; ,` and folds newlines in values.
      const v = (s: string) => String(s ?? '').replace(/([\\;,])/g, '\\$1').replace(/\r?\n/g, '\\n')
      return ['BEGIN:VCARD', 'VERSION:3.0', `N:${v(last)};${v(first)};;;`, `FN:${v(f.name ?? '')}`,
        f.org && `ORG:${v(f.org)}`, f.tel && `TEL:${v(f.tel)}`, f.email && `EMAIL:${v(f.email)}`,
        f.url && `URL:${v(f.url)}`, 'END:VCARD'].filter(Boolean).join('\r\n')
    }
    default: return body.trim()
  }
}
```

```php [carve-php]
function buildQrPayload(string $type, string $body): string {
    $esc = fn (?string $s, string $chars) =>
        preg_replace('/([' . preg_quote($chars, '/') . '])/', '\\\\$1', (string) $s);
    $f = [];
    foreach (explode("\n", $body) as $line) {
        if (str_contains($line, ':')) { [$k, $v] = explode(':', $line, 2); $f[trim($k)] = trim($v); }
    }
    [$first, $last] = array_pad(explode(' ', $f['name'] ?? '', 2), 2, '');
    // vCard 3.0 value escaping (`\ ; ,` and newline folding).
    $vc = fn (string $s) => str_replace(['\\', ';', ',', "\n"], ['\\\\', '\\;', '\\,', '\\n'], $s);

    return match (strtolower($type ?: 'url')) {
        'url', 'text' => trim($body),
        'tel'   => 'tel:' . trim($body),
        'geo'   => 'geo:' . trim($body),
        'sms'   => "SMSTO:{$f['to']}:" . ($f['body'] ?? ''),
        'email' => 'mailto:' . ($f['to'] ?? '') . '?subject=' . rawurlencode($f['subject'] ?? '')
                 . '&body=' . rawurlencode($f['body'] ?? ''),
        'wifi'  => sprintf('WIFI:T:%s;S:%s;P:%s;H:%s;;', strtoupper($f['security'] ?? 'WPA'),
                     $esc($f['ssid'] ?? '', '\\;,:"'), $esc($f['password'] ?? '', '\\;,:"'),
                     ($f['hidden'] ?? '') === 'true' ? 'true' : 'false'),
        'contact', 'mecard' => 'MECARD:N:' . $esc($last, '\\;,:') . ',' . $esc($first, '\\;,:') . ';'
                 . (!empty($f['tel'])   ? 'TEL:'   . $esc($f['tel'], '\\;,:')   . ';' : '')
                 . (!empty($f['email']) ? 'EMAIL:' . $esc($f['email'], '\\;,:') . ';' : '')
                 . (!empty($f['url'])   ? 'URL:'   . $esc($f['url'], '\\;,:')   . ';' : '') . ';',
        'vcard' => implode("\r\n", array_filter([
            'BEGIN:VCARD', 'VERSION:3.0',
            'N:' . $vc($last) . ';' . $vc($first) . ';;;', 'FN:' . $vc($f['name'] ?? ''),
            !empty($f['org'])   ? 'ORG:'   . $vc($f['org'])   : null,
            !empty($f['tel'])   ? 'TEL:'   . $vc($f['tel'])   : null,
            !empty($f['email']) ? 'EMAIL:' . $vc($f['email']) : null,
            !empty($f['url'])   ? 'URL:'   . $vc($f['url'])   : null,
            'END:VCARD',
        ])),
        default => trim($body),
    };
}
```

:::

## Step 3 - the encoder (string -> SVG)

Use a real QR library; both take the final payload string unchanged and pick an
error-correction level / version big enough for the data (vCard payloads are
large, so this matters):

- carve-js: [`qrcode`](https://www.npmjs.com/package/qrcode) (`QRCode.toString(text, { type: 'svg' })`)
- carve-php: [`endroid/qr-code`](https://github.com/endroid/qr-code) or [`chillerlan/php-qrcode`](https://github.com/chillerlan/php-qrcode)

We keep this a one-function seam (`toQrSvg(payload) -> string`) so the extension
never depends on a specific library.

## Step 4 - wiring it into Carve

Hook the render of a `code-block` node whose info word is `qr`. Return
`undefined` to defer to the next extension / the core renderer - so a normal
`code-block` is untouched.

::: code-group

```ts [carve-js]
import { carveToHtml } from '@markup-carve/carve'
import { buildQrPayload } from './qr-payload.js'
import { toQrSvg } from './qr-encode.js' // wraps `qrcode`

// `qr` -> "url"; `qr-<type>` -> "<type>"; anything else is not ours.
const qrType = (lang) =>
  lang === 'qr' ? 'url' : lang?.startsWith('qr-') ? lang.slice(3) : undefined

const qr = {
  name: 'qr',
  blockRenderers: {
    'code-block': (node, ctx) => {
      const type = qrType(node.lang)
      if (type === undefined) return undefined          // defer: not ours
      const svg = toQrSvg(buildQrPayload(type, node.value ?? ''))
      return `${ctx.indent(ctx.level)}<figure class="qr">${svg}</figure>`
    },
  },
}

const html = carveToHtml(source, { extensions: [qr] })
```

```php [carve-php]
use Carve\CarveConverter;
use Carve\Event\RenderEvent;
use Carve\Extension\ExtensionInterface;
use Carve\Node\Block\CodeBlock;

final class QrExtension implements ExtensionInterface
{
    /** @param \Closure(string): string $encoder payload -> <svg>/<img> */
    public function __construct(private \Closure $encoder) {}

    public function register(CarveConverter $converter): void
    {
        $converter->on('render.code_block', function (RenderEvent $event): void {
            $node = $event->getNode();
            if (!$node instanceof CodeBlock) {
                return;
            }
            $lang = $node->getLanguage();                 // 'qr' or 'qr-<type>'
            $type = $lang === 'qr' ? 'url'
                : (str_starts_with((string) $lang, 'qr-') ? substr($lang, 3) : null);
            if ($type === null) {
                return;                                    // defer: not ours
            }
            $svg = ($this->encoder)(buildQrPayload($type, $node->getContent()));
            $event->setHtml('<figure class="qr">' . $svg . "</figure>\n");
        });
    }
}

$converter = new CarveConverter();
// inject any encoder (wraps endroid/qr-code, chillerlan/php-qrcode, …)
$converter->addExtension(new QrExtension(fn (string $p) => toQrSvg($p)));
$html = $converter->convert($source);
```

:::

That is the whole extension. Authors now write `` ```qr `` blocks; every other
fenced block behaves exactly as before.

## Step 5 - static vs. client rendering

The Step-4 hook renders the SVG **at build time** - the HTML is self-contained
(works in email, PDF, no-JS pages). If you would rather ship the payload and let
the browser draw it (smaller HTML, like Mermaid's default), emit a placeholder
instead and let a client script render it:

````
```qr
https://example.com
```
````

renders to `<pre class="qr">https://example.com</pre>` (use the shipped
`fencedRender({ language: 'qr', cssClass: 'qr' })` factory), and a few lines of
client JS turn every `pre.qr` into a canvas. See
[Static Rendering Recipes](./static-rendering-recipes) for the static-mode story
and when each fits.

## Step 6 - testing

Because the two halves are separate, the interesting logic tests **without a
renderer**: feed `buildQrPayload` a type + body, assert the exact payload string
(escaping included). Render-hook tests then just assert the HTML wrapper. This is
the same shape the core uses - a pure transform pinned by examples, the rendering
asserted once.

## The security boundary

An extension emits HTML into the document, so it owns that output's safety:

- The QR extension only ever emits `<figure>`, `<svg>`, `<img>`, or `<pre>` - all
  sanitizer-friendly. It never interpolates author text into an attribute or a
  `<script>`.
- If you sanitize the converted HTML downstream (recommended for untrusted
  input), whitelist the tags your extensions produce. The `json` content mode of
  `fencedRender` emits a `<script type="application/json">`; QR needs none of
  that.
- Author values flow into payload *data*, not into markup, so the
  escaping in Step 2 is about QR correctness, not HTML safety - keep both.

See [Security](./security) for the document-level model.

## Second example: a static map

QR showed the build-time-image shape. A `map` block shows the *same*
pure-builder + render-seam split, but with **three interchangeable render modes**
behind one syntax — the choice most "embed" extensions face.

The author writes a coordinate (and optional caption):

````
```map
52.520,13.405,12
Brandenburg Gate, Berlin
```
````

### Builder (pure) — parse + validate the coordinate

```ts
// "lat,lon[,zoom]\n[caption]" -> a validated, render-agnostic model.
export function parseMap(body: string): { lat: number; lon: number; zoom: number; caption: string } | null {
  const [coords = '', ...rest] = body.trim().split('\n')
  const [lat, lon, zoom = 12] = coords.split(',').map((s) => Number(s.trim()))
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return null // not a coordinate -> defer to the readable code-block fallback
  }
  return { lat, lon, zoom: Number.isFinite(zoom) ? zoom : 12, caption: rest.join(' ').trim() }
}
```

Everything after this is just *which seam* turns the model into HTML — all three
take the same `parseMap` output.

### Mode A — build-time SVG (self-contained, offline, no key)

No network, no API key, no client JS — the coordinate becomes a small inline SVG
with a pin. Best for email, PDF, archival HTML. The numbers flow only into
**numeric SVG attributes**, so there is nothing to escape and nothing to inject.

```html
<figure class="qmap">
  <svg viewBox="0 0 520 300" width="100%" role="img" aria-label="Map of 52.520, 13.405">…
    <circle cx="260" cy="150" r="9" fill="#f85149" stroke="#fff" stroke-width="2"/>
    <text x="260" y="186" text-anchor="middle">52.520, 13.405</text>
  </svg>
  <figcaption>Brandenburg Gate, Berlin</figcaption>
</figure>
```

### Mode B — build-time provider image (a real map, still one `<img>`)

The seam calls a static-tile service at *build* time and emits the returned
image. Still self-contained in the page (no client JS); the network fetch and
the API key live in the build, not the reader's browser. The builder constructs
the URL from the validated numbers, so the coordinate never reaches markup raw:

```ts
const src =
  `https://maps.geoapify.com/v1/staticmap?style=osm-bright&width=520&height=300` +
  `&center=lonlat:${m.lon},${m.lat}&zoom=${m.zoom}` +
  `&marker=lonlat:${m.lon},${m.lat};color:%23f85149&apiKey=${KEY}`
// -> <figure class="qmap"><img alt={caption} src={src}><figcaption>…</figcaption></figure>
```

### Mode C — live embed (interactive, client)

When the reader needs to pan/zoom, emit a provider iframe instead (OpenStreetMap
needs no key). This is the Mermaid-style "ship a marker, the browser hydrates"
path — use `fencedRender`'s text mode, or emit the iframe directly:

```html
<iframe loading="lazy" title="Map — 52.520, 13.405"
  src="https://www.openstreetmap.org/export/embed.html?bbox=13.375,52.505,13.435,52.535&marker=52.520,13.405"></iframe>
```

### Wiring — same hook as QR

```ts
const map = {
  name: 'map',
  blockRenderers: {
    'code-block': (node, ctx) => {
      if (node.lang !== 'map') return undefined
      const m = parseMap(node.value ?? '')
      if (m === null) return undefined          // not a coordinate -> readable code block
      return `${ctx.indent(ctx.level)}<figure class="qmap">${renderMapSvg(m)}</figure>`
    },
  },
}
```

carve-php is the exact shape from QR's Step 4 (`register()` + `on('render.code_block')`,
`getLanguage() === 'map'`). The lesson: **one syntax, a pure model, and a seam you
pick per medium** — offline SVG, build-time image, or live embed — without the
author changing a thing.

## Where this fits

The pattern generalizes: a **pure builder** (author input -> a canonical string
or AST) in front of a **render seam** (string -> HTML, swappable per library),
wired through one lifecycle hook, off by default. That is how `mermaid`,
`vega-lite`, `wikilinks`, and the rest are built. For the rules every extension
must obey - tiers, what may claim syntax, graceful degradation - read the
normative [Extensions Contract](./extensions); to see what already exists, the
[Ecosystem](./ecosystem) page.
