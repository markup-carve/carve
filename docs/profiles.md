---
description: The four render profiles, which node types each one allows, how a refused construct degrades, and the length and nesting bounds.
---

# Content profiles

A **render profile** restricts the kinds of content a render accepts. An application can use one to allow links in comments while turning headings, images and raw HTML into plain text. Carve 0.2 has four profiles: `full`, `article`, `comment` and `minimal`. `full` is the default.

A profile is a render option, not Carve syntax. The source and the parsed tree stay the same; the profile decides which nodes the HTML renderer writes in their normal form and which it writes in a degraded, plain-text form.

## Choosing a profile

On the command line:

```sh
carve render --profile comment document.crv
```

In the JavaScript engine:

```js
import { render } from '@markup-carve/carve'

const html = render(userInput, { profile: 'comment' })
```

Any other value is refused with an option error. Profiles are fixed: 0.2 has no custom allow or deny lists, no profile objects and no link policy with domain lists in the profile. Host-limited links are the job of the `linkPolicy()` navigation extension.

## The four profiles

| Profile | Intended for | Block types | Inline types | Links | Max nesting | Max input |
|---|---|---|---|---|---|---|
| `full` | trusted content | all | all | normal | none | none |
| `article` | blogs and articles | all but `raw_block` | all but `raw_inline` | normal | none | none |
| `comment` | user comments | allow list (below) | allow list (below) | `rel="nofollow ugc"` | 4 | 100,000 bytes |
| `minimal` | chat and short posts | allow list (below) | allow list (below) | not allowed | 2 | 10,000 bytes |

### `full`

Everything is allowed, with no limits. Use it for trusted content only. The [security baseline](./security) (escaped bare HTML, raw HTML off unless `rawHtml` is on, URL and attribute filtering) still applies.

### `article`

All formatting, without raw content: `raw_block` and `raw_inline` are outside the profile. A raw HTML block degrades to its text even when `rawHtml` is on.

### `comment`

Basic formatting and links for user comments.

- Block types: `paragraph`, `list`, `list_item`, `block_quote`, `code_block`.
- Inline types: `text`, `emphasis`, `strong`, `underline`, `strike`, `delete`, `insert`, `highlight`, `superscript`, `subscript`, `code`, `literal_inline`, `link`, `autolink`, `mention`, `inline_extension`, `soft_break`, `hard_break`.
- Every link and autolink gets `rel="nofollow ugc"`.
- At most 4 container levels; input of at most 100,000 UTF-8 bytes.

So headings, images, tables, footnotes, divs and admonitions, description lists, thematic breaks, line blocks, spans, tags, symbols, math, abbreviations and raw content all degrade.

::: compare
<!-- carve-example {"options":{"profile":"comment"}} -->
```crv
= Release notes

The new build is *faster*. See [the guide](/guide) and ![chart](chart.png).

| a | b |
```
```html
<p># Release notes</p>
<p>The new build is <strong>faster</strong>. See <a href="/guide" rel="nofollow ugc">the guide</a> and [img: chart].</p>
<p>a | b</p>
```
:::

### `minimal`

Inline formatting, paragraphs and lists for chat and micro-posts.

- Block types: `paragraph`, `list`, `list_item`.
- Inline types: `text`, `emphasis`, `strong`, `underline`, `strike`, `delete`, `insert`, `superscript`, `subscript`, `code`, `literal_inline`, `mention`, `inline_extension`, `soft_break`, `hard_break`. There is no `link`, `autolink`, `highlight` or `image`.
- At most 2 container levels; input of at most 10,000 UTF-8 bytes.

::: compare
<!-- carve-example {"options":{"profile":"minimal"}} -->
```crv
Ship it *today* with [the guide](/guide) and {=care=}.

- one
- two
```
```html
<p>Ship it <strong>today</strong> with the guide and care.</p>
<ul>
  <li>one</li>
  <li>two</li>
</ul>
```
:::

The exact lists and bounds are the `profiles` rows of the URL policy data file in the specification.

## How a node is tested

A profile decides for each node by its type and its axis, block or inline:

1. A type on the deny list of its axis is outside the profile.
2. Otherwise, when the axis has an allow list, a type is inside exactly when the list names it.
3. Otherwise it is inside.

No other rule excludes a type, including a type the profile lists do not know. So `full` is lossless for every document, and an allow list still keeps out anything it does not name.

A few cases need a word:

- **Captioned blocks.** An image paragraph, a code block, a quote or a math block that carries a caption is tested as its `<figure>`. No allow list names that, so under `comment` and `minimal` a captioned block degrades as a whole.
- **Inline literals** count as code: `literal_inline` stands in every list that holds `code`.
- **Autolinks** are links for the profiles: allowed where `link` is, with the same `rel`.
- **Mentions and tags.** A `mention` is in both allow lists. A `tag` is its own type and in neither, so a `#tag` degrades to its text under `comment` and `minimal`. A mention or tag that the `social` option turns into a link counts as a link: where `link` is outside the profile, it stays an inert span.
- **Admonitions and divs** are separate types. `::: note` is an `admonition`, while a fence with a name that is not a built-in callout, such as `::: sidebar`, is a `div`. Neither is in the `comment` or `minimal` lists.

## Degraded forms

A construct outside the profile is not removed. It is written as its plain text, and the render reports it once with the render loss `profile-construct-degraded`. No placeholder word stands in for it:

- An inline node is written as the plain text of its children: a refused link keeps its label, emphasis keeps its words.
- An image is written as `[img: ALT]`.
- A footnote reference is written as `[^key]`, and a symbol as `:name:`.
- A block becomes one paragraph of its plain text behind the mark of its kind: `#` per heading level and a space (even when the source used `=`), `> ` for a quote, `- ` for each list item, `---` for a thematic break, and one line per table row with ` | ` between cells.
- A code block or a raw block becomes a paragraph holding its text, without fences. Raw HTML is never passed through in a degraded form.
- A caption is written after its block as one more paragraph, with its number filled in.
- A node that leaves no text, such as a comment, is dropped.

The `strictLosses` option (`--strict-losses`) turns every render loss into an error, so a host that wants to refuse a document instead of degrading it gets no output when anything was degraded. `allowLosses` and `maxLosses` filter and cap the reported entries.

### Nesting and length bounds

For `max_nesting`, the document is level 0, and each block container (a list, a block quote, a div) adds one level. A list item belongs to its list and adds none. A container at the bound stays; one that would stand deeper degrades as a whole:

::: compare
<!-- carve-example {"options":{"profile":"minimal"}} -->
```crv
- one
  - two
    - three
```
```html
<ul>
  <li>one
    <ul>
      <li>two
        <p>- three</p>
      </li>
    </ul>
  </li>
</ul>
```
:::

`max_length` is checked before parsing. An input longer than the bound is refused: the render returns an error and no output, instead of a truncated document.

### Some degradations do not change the HTML

A comment renders nothing under every profile, so degrading it changes no output. The degradation is still reported:

::: compare
<!-- carve-example {"options":{"profile":"comment"}} -->
```crv
%% reviewer note

Body.
```
```html
<p>Body.</p>
```
:::

A host that diffs the HTML sees no change here. Read the render-loss report (`--report-losses <path>` on the command line, or the diagnostics of `renderWithDiagnostics`) to learn that the document carried something the profile does not accept, and use `strictLosses` to refuse it.

## Links under a profile

Profiles and URL filtering are separate. Every profile applies the URL policy, and the policy has no off switch.

`comment` adds `nofollow` and `ugc` to every link. A link carries at most one `rel` attribute: the authored words come first, then the profile's words that are not already present, so `{rel=me}` gives `rel="me nofollow ugc"`.

::: compare
<!-- carve-example {"options":{"profile":"comment"}} -->
```crv
A [link](/x){rel=me} and <https://example.com>.
```
```html
<p>A <a href="/x" rel="me nofollow ugc">link</a> and <a href="https://example.com" rel="nofollow ugc">https://example.com</a>.</p>
```
:::

Under `comment`, a link or autolink whose destination the URL policy refuses is written as its text with no `<a>` at all, rather than as an empty `href`:

::: compare
<!-- carve-example {"options":{"profile":"comment"}} -->
```crv
A [link](javascript:alert(1)) and [ok](/ok).
```
```html
<p>A link and <a href="/ok" rel="nofollow ugc">ok</a>.</p>
```
:::

To restrict schemes beyond the default deny list, set an allow list with the `urlPolicy` option. See [Security](./security#url-scheme-filtering-always-on).

## Profiles and raw HTML

A profile is not a replacement for keeping raw HTML off, and in 0.2 it does not need to be: `rawHtml` is already off by default. `article`, `comment` and `minimal` all keep raw content out, so even with `rawHtml` on, they degrade a raw HTML block to text:

::: compare no-render
<!-- carve-example {"options":{"profile":"article","rawHtml":true}} -->
````crv
```=html
<b>x</b>
```
````
```html
<p>&lt;b&gt;x&lt;/b&gt;</p>
```
:::

Under `full`, raw HTML follows the `rawHtml` option alone.

## Formatting source does not apply a profile

A profile describes what may be rendered. `carve fmt` and the Carve writer do not read the `profile` option: they write the author's document back unchanged, without filtering it or adding `rel` attributes. If you need a restricted document, render it through a profile; do not expect formatted source to be filtered.

Included files are rendered under the same profile as the including document. See [File inclusion](./includes).

## Changed in 0.2

- The 0.1 profile objects, the custom allow and deny lists, `disallowedAction` (`to_text`, `strip`, `error`), the `LinkPolicy` with scheme and domain lists, and `profileBaseHost` are gone from the profile. Pass one of the four profile names. A 0.1 `LinkPolicy` or `profileBaseHost` maps to the `linkPolicy()` navigation extension that carve-js ships in `@markup-carve/carve/extensions` (`baseHost`, `allowExternal: false`); the provisional extension catalog does not list it yet.
- Every refused construct degrades to its plain text. For the 0.1 `error` action, use `strictLosses`. There is no `strip` action.
- `max_length` refuses an over-long input before parsing instead of truncating.
- `tag` is no longer counted as a `mention`, so tags degrade under `comment` and `minimal`.
- `autolink` and `literal_inline` are named in the 0.2 lists.

The [upgrade guide](./upgrade-0-2) maps the old options.

::: details 0.1 content-type names

The 0.1 documentation used the following vocabulary with configurable allow and deny lists. It is kept here as a migration index for readers of older integrations. It is not a list of 0.2 profile options; use the four 0.2 profile names and the node lists above.

**Block:** `paragraph`, `heading`, `code_block`, `block_quote`, `list`,
`list_item`, `table`, `table_row`, `table_cell`, `thematic_break`, `div`,
`admonition`, `raw_block`, `footnote`, `frontmatter`, `definition_list`,
`definition_term`, `definition_description`, `section`, `line_block`,
`comment`, `figure`, `figure_group`, `directive`, `block_extension`, `abbreviation_def`,
`link_reference_definition`, `citation_definition`.

**Inline:** `text`, `emphasis`, `strong`, `underline`, `strike`,
`inline_extension`, `mention`, `code`, `link`, `autolink`, `image`,
`non_breaking_space`, `soft_break`, `hard_break`, `raw_inline`, `escaped_text`, `footnote_ref`,
`inline_footnote`, `heading_ref`, `citation_group`, `citation`, `caption_number`,
`span`, `superscript`, `subscript`, `highlight`, `insert`, `delete`,
`substitution`, `critic_comment`, `symbol`, `math`, `abbreviation`, `small_caps`,
`ruby`.

The older schema also named `document`, `smart_punctuation`, `literal_inline`, `tag`, `abbreviation_def`, `link_reference_definition`, and `cell_wrap` outside those allow and deny lists. These are historical names in the 0.1 contract.

:::

**Specification (external):** [HTML rendering, options](https://github.com/markup-carve/carve/blob/main/spec/0.2/html.md#options), clauses C2-H-129, C2-H-130 and C2-H-163 to C2-H-167 (profiles, degraded forms, nesting, `rel`), C2-H-204 and C2-H-205 (loss filters); [`url-policy.json`](https://github.com/markup-carve/carve/blob/main/spec/0.2/data/url-policy.json) (the `profiles` rows) and [`options.json`](https://github.com/markup-carve/carve/blob/main/spec/0.2/data/options.json); [Includes](https://github.com/markup-carve/carve/blob/main/spec/0.2/includes.md), clause C2-N-069; [Upgrading: JavaScript API](https://github.com/markup-carve/carve/blob/main/spec/0.2/UPGRADING.md#javascript-api).
