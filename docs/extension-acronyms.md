---
description: Expand acronyms on first use with a fence claim, inline claims and a document transform.
---

# Writing an extension: acronyms

This example builds on the [badge tutorial](./extension-tutorial.md). It writes an acronym extension in the style of LaTeX's `acro` package: the first use of an acronym shows the long form with the short form in parentheses, later uses show the short form, and a use can ask for the plural or a fixed form. Text search and replace cannot do this, because the output of a use depends on the uses before it.

It shows three parts of the extension interface that the badge does not use:

- a fence claim that carries data as props,
- inline claims that read their attributes,
- a document transform that sees the whole document in order ([C2-X-053](https://github.com/markup-carve/carve/blob/main/spec/0.2/extensions.md#resolution-rendering-and-equality)).

It runs with Node.js 26 from a `carve-js` `main` checkout. The interface is provisional; pin a reference revision before using it in production. See [extension status](https://github.com/markup-carve/carve/blob/main/spec/0.2/STATUS.md).

## The source

An `acronyms` fence lists one acronym per line: the key, `=`, the long form, and optionally the short and long plural after `|`. Without them, the plural adds an `s` to each form, which only suits English. A use is the core inline form `:ac[KEY]`:

````carve
Every :ac[API] needs a version. Several :ac[API]{plural} share a gateway.
The :ac[API]{form=long} of the payment service is older.
The contract names the :ac[GmbH]; both :ac[GmbH]{plural form=long} are liable.

```acronyms
API = Application Programming Interface
GmbH = Gesellschaft mit beschränkter Haftung | GmbHs | Gesellschaften mit beschränkter Haftung
```
````

| Use | Output |
|---|---|
| `:ac[API]` | First use: `Application Programming Interface (API)`; later: `API` |
| `:ac[API]{form=short}` | `API` |
| `:ac[API]{form=long}` | `Application Programming Interface` |
| `:ac[API]{form=full}` | `Application Programming Interface (API)` |
| `:ac[API]{plural}` | The same forms with the plurals |

A long or full form counts as the introduction, so a later `:ac[API]` shows the short form.

## The extension

Save the following as `acronyms.mjs` in a project that installs `@markup-carve/carve` and run `node acronyms.mjs`:

```js
import { render } from '@markup-carve/carve'

const ACRONYM = 'org.example.acronym'
const ACRONYMS = 'org.example.acronyms'

// `KEY = long form [| short plural | long plural]`, one acronym per line.
function parseEntries(value) {
  const entries = []
  for (const line of value.split('\n')) {
    const match = /^\s*([A-Za-z0-9]+)\s*=\s*(.+?)\s*$/.exec(line)
    if (match === null) continue
    const [long, shortPlural, longPlural] = match[2].split('|').map((part) => part.trim())
    entries.push({
      key: match[1], long,
      shortPlural: shortPlural || `${match[1]}s`,
      longPlural: longPlural || `${long}s`,
    })
  }
  return entries
}

const acronymList = {
  name: ACRONYMS,
  version: '1',
  matcher: { form: 'fence', name: 'acronyms' },
  props: { entries: 'array' },
  slots: {},
  transform(claim) {
    if (claim.form !== 'fence') return null
    return {
      type: 'block_extension',
      name: ACRONYMS,
      version: '1',
      props: { entries: parseEntries(claim.value) },
      children: [],
      fallback: [structuredClone(claim.node)],
      source: claim.source,
    }
  },
}

const acronym = {
  name: ACRONYM,
  version: '1',
  matcher: { form: 'inline', name: 'ac' },
  props: { key: 'string', form: 'string', plural: 'boolean', text: 'string', title: 'string' },
  slots: {},
  transform(claim) {
    if (claim.form !== 'inline') return null
    const [only] = claim.children
    if (claim.children.length !== 1 || only.type !== 'text') return null
    const pairs = new Map(claim.attrs?.keyValues ?? [])
    return {
      type: 'inline_extension',
      name: ACRONYM,
      version: '1',
      props: { key: only.value, form: pairs.get('form') ?? 'auto', plural: pairs.has('plural') },
      children: claim.children,
      fallback: structuredClone(claim.children),
      source: claim.source,
    }
  },
  // Runs once on the whole resolved document, so it can see which use comes first.
  documentTransform(view) {
    const table = new Map()
    const uses = []
    const walk = (node) => {
      if (node.type === 'block_extension' && node.name === ACRONYMS) {
        for (const entry of node.props.entries) if (!table.has(entry.key)) table.set(entry.key, entry)
      }
      if (node.type === 'inline_extension' && node.name === ACRONYM) uses.push(node)
      for (const child of node.children ?? []) walk(child)
    }
    walk(view)
    const introduced = new Set()
    for (const use of uses) {
      const entry = table.get(use.props.key)
      if (entry === undefined) continue
      const short = use.props.plural ? entry.shortPlural : entry.key
      const long = use.props.plural ? entry.longPlural : entry.long
      let form = use.props.form
      if (form === 'auto') form = introduced.has(entry.key) ? 'short' : 'full'
      if (form === 'full' || form === 'long') introduced.add(entry.key)
      use.props.title = long
      use.props.text = form === 'long' ? long : form === 'full' ? `${long} (${short})` : short
    }
    return view
  },
}

function renderAcronym(node, host) {
  if (node.props.text === undefined) return host.inlines(node.children)
  return `<abbr title="${host.escapeAttribute(node.props.title)}">${host.escapeText(node.props.text)}</abbr>`
}

function renderList(node, host) {
  const rows = node.props.entries.map((entry) =>
    `<dt>${host.escapeText(entry.key)}</dt><dd>${host.escapeText(entry.long)}</dd>`)
  return `<dl class="acronyms">${rows.join('')}</dl>\n`
}

const options = {
  extensions: [acronymList, acronym],
  renderers: {
    [ACRONYM]: { version: '1', render: renderAcronym, buildTime: renderAcronym },
    [ACRONYMS]: { version: '1', render: renderList, buildTime: renderList },
  },
}

const fence = '`'.repeat(3)
const source = [
  'Every :ac[API] needs a version. Several :ac[API]{plural} share a gateway.',
  'The :ac[API]{form=long} of the payment service is older.',
  'The contract names the :ac[GmbH]; both :ac[GmbH]{plural form=long} are liable.',
  '',
  fence + 'acronyms',
  'API = Application Programming Interface',
  'GmbH = Gesellschaft mit beschränkter Haftung | GmbHs | Gesellschaften mit beschränkter Haftung',
  fence,
  '',
].join('\n')

console.log(render(source, options))
```

The program prints:

```html
<p>Every <abbr title="Application Programming Interface">Application Programming Interface (API)</abbr> needs a version. Several <abbr title="Application Programming Interfaces">APIs</abbr> share a gateway.
The <abbr title="Application Programming Interface">Application Programming Interface</abbr> of the payment service is older.
The contract names the <abbr title="Gesellschaft mit beschränkter Haftung">Gesellschaft mit beschränkter Haftung (GmbH)</abbr>; both <abbr title="Gesellschaften mit beschränkter Haftung">Gesellschaften mit beschränkter Haftung</abbr> are liable.</p>
<dl class="acronyms"><dt>API</dt><dd>Application Programming Interface</dd><dt>GmbH</dt><dd>Gesellschaft mit beschränkter Haftung</dd></dl>

```

## How it works

The fence transform turns the claimed code block into a block extension node. Its `entries` prop holds the parsed lines, and its fallback is the original code block, so a reader without the extension still shows the list as code.

The inline transform keeps the key and the `form` and `plural` attributes as props. It returns `null` for content other than one text node, which leaves the core node in place. Its fallback is the key, so a reader without the extension shows `API`.

A transform sees only the node it claimed, so it cannot know whether a use comes first. The document transform can: it runs once on a copy of the resolved document, after includes, and walks it in document order. It collects the entries of every `acronyms` fence, then sets the `text` and `title` props of each use. A use with an unknown key keeps no `text`, and its renderer writes the key as plain content. The transform changes only its own nodes, so the authored tree and the source that `carve fmt` writes stay as they were: the writer returns `:ac[GmbH]{plural form=long}` unchanged.

Both renderers escape what they write with `host.escapeText` and `host.escapeAttribute`. They are registered for both modes, since static mode never falls back to `render` (C2-X-052).

## Limits

- **Core abbreviations:** do not combine `:ac[API]` with a core abbreviation definition `*[API]: …` for the same key. The core wraps `API` inside the claim in an abbreviation node, and `carve-js` then rejects the claim with `extension-transform-failed`. Keep the keys in the fence.
- **Document order:** first use follows the order of the resolved document. Footnote definitions stand where they are written, usually at the end, so a use in a footnote comes after the body text.
- **One scope:** first use counts once per rendered document. A site that renders each page alone introduces each acronym once per page.
- **Fallback attributes:** without the extension, `:ac[API]{plural}` renders as `<span plural="">API</span>`, and each use reports `extension-fallback-rendered`.
