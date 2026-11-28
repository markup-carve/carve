---
description: "Recording who changed the text and when on Carve 0.2 insertions, deletions and editorial comments: the author and datetime keys, their HTML mapping, import, fmt and lint behavior, and common mistakes."
---

# Revision metadata

Word track changes and Google Docs suggestions record who changed the text and when. Carve 0.2 keeps both on insert `{+…+}`, delete `{-…-}` and editorial comment `{#…#}`, in two attribute keys: `author`, a name or an address as written, and `datetime`, an ISO 8601 time.

Use these keys when a document goes through review: a contract with proposed edits, a translation checked by a second person, or a file imported from a word processor where the change history should survive. A reader of the HTML sees the edit; a tool sees who made it and when.

::: compare
```crv
The fee is {-10-}{author=Ann datetime=2026-11-20T10:00Z}{+12+}{author=Ann datetime=2026-11-20T10:00Z} euros.

Ship on Friday{# check with finance #}{author=bob@example.org datetime=2026-11-21T09:30Z}.
```

```html
<p>The fee is <del data-author="Ann" datetime="2026-11-20T10:00Z">10</del><ins data-author="Ann" datetime="2026-11-20T10:00Z">12</ins> euros.</p>
<p>Ship on Friday<span class="critic-comment" data-author="bob@example.org" data-datetime="2026-11-21T09:30Z"> check with finance </span>.</p>
```
:::

These keys are a convention, not syntax. Each sits in an ordinary glued attribute block, so a tool that ignores them loses nothing else.

## Writing a revision step by step

1. Mark the change: `{+new text+}` for an insertion, `{-old text-}` for a deletion, `{# note #}` for a comment.
2. Glue an attribute block to the closing `+}`, `-}` or `#}`, with no space in between.
3. Inside the block, write `author=` and the name, and `datetime=` and the time. Quote a value that holds a space: `author="Ann Lee"`.
4. Use the keys in lower case. `Author` or `DateTime` is an ordinary attribute and gets no mapping.

`datetime` takes any ISO 8601 time, a date alone included:

::: compare
```crv
Reviewed by {+the board+}{author="Ann Lee" datetime=2026-11-20}.
```

```html
<p>Reviewed by <ins data-author="Ann Lee" datetime="2026-11-20">the board</ins>.</p>
```
:::

The keys keep their place among the other attributes of the block.

## Insertions and deletions

Glue the block to the closing `+}` or `-}`. HTML output keeps `datetime` as the native attribute of `<ins>` and `<del>` and writes `author` as `data-author`, because HTML defines no author attribute.

A replacement is two nodes, so each side carries its own block, as in the fee example. A single trailing block never spreads to both, which lets a writer annotate one side alone:

::: compare
```crv
The {-old-}{author=Ann datetime=2026-11-20}{+new+} wording.
```

```html
<p>The <del data-author="Ann" datetime="2026-11-20">old</del><ins>new</ins> wording.</p>
```
:::

On these two elements `cite` keeps its HTML meaning: the URL of a page explaining the change. It never names a person.

::: compare
```crv
The rate is {-8 percent-}{cite=/reviews/42 author=Ann}{+9 percent+}{cite=/reviews/42}.
```

```html
<p>The rate is <del cite="/reviews/42" data-author="Ann">8 percent</del><ins cite="/reviews/42">9 percent</ins>.</p>
```
:::

## Editorial comments

A comment takes a glued block like any other inline element, and its span carries `data-author` and `data-datetime`. It marks a point in the text, never a range of words. Classes in the same block land on the span next to `critic-comment`:

::: compare
```crv
Note{# needs a source #}{.todo author=Ann}.
```

```html
<p>Note<span class="critic-comment todo" data-author="Ann"> needs a source </span>.</p>
```
:::

## An authored `data-author` wins

If the block also sets `data-author` (or `data-datetime` on a comment) directly, that value is written and the derived one is dropped, so the element never carries the attribute twice:

::: compare
```crv
Added {+text+}{author=Ann data-author=A.L.}.
```

```html
<p>Added <ins data-author="A.L.">text</ins>.</p>
```
:::

On any node other than an insertion, a deletion or an editorial comment, `author` and `datetime` are ordinary attributes and are written as they are:

::: compare
```crv
Plain [span]{author=Ann datetime=2026-11-20}.
```

```html
<p>Plain <span author="Ann" datetime="2026-11-20">span</span>.</p>
```
:::

## In the AST

The keys are plain key-value attributes on the `insert`, `delete` or `critic_comment` node. `npx carve ast` on `Added {+text+}{author=Ann datetime=2026-11-20}.` gives this node for the insertion (positions removed):

```json
{
  "type": "insert",
  "attrs": {"keyValues": [["author", "Ann"], ["datetime", "2026-11-20"]]},
  "children": [{"type": "text", "value": "text"}]
}
```

There is no separate revision field. A program that wants the history reads `attrs.keyValues`.

## How fmt and lint treat it

`carve fmt` treats the block like every glued attribute block: it keeps the order of the key-value pairs as written and moves classes in front of them, so `{author=Ann .todo}` becomes `{.todo author=Ann}`.

No lint rule checks the value of `author` or `datetime`. The findings that matter here are the general ones: `unattached-inline-attribute` when a space separates the block from the closer, and `semantic-attribute-outside-span` when `time` is used in place of `datetime`.

## Use `datetime`, not `time`

On a plain span, `[…]{time=…}` makes a `<time>` element. On an insertion it stays a raw attribute, and lint warns:

<!-- carve-sample {"lint":"shows the semantic-attribute-outside-span warning"} -->
::: compare
```crv
Added {+a new clause+}{time=2026-11-20}.
```

```html
<p>Added <ins time="2026-11-20">a new clause</ins>.</p>
```
:::

```text
warning semantic-attribute-outside-span
```

## Import

[HTML import](./html-import) reverses the mapping: `data-author` becomes `author`, `data-datetime` on a comment span becomes `datetime`, and native `datetime` or `cite` attributes stay as written. Importing the HTML of the fee example with `npx carve import --from html` gives back the source:

```crv
The fee is {-10-}{author=Ann datetime=2026-11-20T10:00Z}{+12+}{author=Ann datetime=2026-11-20T10:00Z} euros.
```

Pandoc writes a word processor comment as a pair of spans, `comment-start` holding the text and a matching `comment-end`, with `data-author` and `data-date`. The importer reads that pair as one point comment where `comment-start` stood. The covered words stay in place, and the lost range is reported as `import-structure-repaired`:

```html
<p>Fee <span class="comment-start" data-comment-id="0" data-author="Bob" data-date="2026-11-21T09:30:00Z">check</span>euros<span class="comment-end" data-comment-id="0"></span>.</p>
```

imports as

```crv
Fee {#check#}{author=Bob datetime=2026-11-21T09:30:00Z}euros.
```

with the warning

```text
warning import-structure-repaired Ranged comment read as a point: its range is lost
```

## Word documents

[pandoc-carve](./format-bridges) converts DOCX revisions both ways. When reading, pass `--track-changes=all` through to Pandoc after the bridge's `--` separator. Pandoc's `insertion` and `deletion` spans arrive as Carve insertions and deletions, its `date` key renamed to `datetime`, and Word comments arrive as editorial comments. Writing DOCX turns annotated edits back into tracked changes, and a comment that has an `author` into a Word comment.

## Common mistakes

### A space before the block

The block must touch the closer. With a space it attaches to nothing and shows up as text:

<!-- carve-sample {"lint":"unattached-inline-attribute: a space separates the block from the insertion"} -->
::: compare
```crv
Added {+text+} {author=Ann}.
```

```html
<p>Added <ins>text</ins> {author=Ann}.</p>
```
:::

Fix: `{+text+}{author=Ann}`.

### A capitalized key

The keys match in lower case only. `Author` is an ordinary attribute, so the HTML gets a nonstandard `Author` attribute instead of `data-author`, and there is no lint finding:

::: compare
```crv
Added {+text+}{Author=Ann}.
```

```html
<p>Added <ins Author="Ann">text</ins>.</p>
```
:::

### One block for a whole replacement

A block after the insertion annotates only the insertion. The deletion before it stays anonymous:

::: compare
```crv
The fee is {-10-}{+12+}{author=Ann} euros.
```

```html
<p>The fee is <del>10</del><ins data-author="Ann">12</ins> euros.</p>
```
:::

Fix: give each side its own block, as in the first example on this page.

### A name in `cite`

`cite` is a URL on `<ins>` and `<del>`. A name there renders as `cite="Ann"`, which reads as a URL relative to the page, and lint says nothing:

::: compare
```crv
Changed by {+Ann+}{cite=Ann}.
```

```html
<p>Changed by <ins cite="Ann">Ann</ins>.</p>
```
:::

Fix: use `author=Ann`.

**Specification (external):** [Inline syntax](https://github.com/markup-carve/carve/blob/main/spec/0.2/syntax-inline.md) states the convention (C2-I-063), [HTML output](https://github.com/markup-carve/carve/blob/main/spec/0.2/html.md) the mapping (C2-H-210), and [HTML import](https://github.com/markup-carve/carve/blob/main/spec/0.2/import-html.md) its reverse (C2-M-044, C2-M-113).
