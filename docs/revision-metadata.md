# Revision metadata

Word track changes and Google Docs suggestions record who changed the text and when. Carve 0.2 keeps both on insert `{+…+}`, delete `{-…-}` and editorial comment `{#…#}`, in two attribute keys: `author`, a name or an address as written, and `datetime`, an ISO 8601 time.

````carve
The fee is {-10-}{author=Ann datetime=2026-11-20T10:00Z}{+12+}{author=Ann datetime=2026-11-20T10:00Z} euros.

Ship on Friday{# check with finance #}{author=bob@example.org datetime=2026-11-21T09:30Z}.
````

```html
<p>The fee is <del data-author="Ann" datetime="2026-11-20T10:00Z">10</del><ins data-author="Ann" datetime="2026-11-20T10:00Z">12</ins> euros.</p>
<p>Ship on Friday<span class="critic-comment" data-author="bob@example.org" data-datetime="2026-11-21T09:30Z"> check with finance </span>.</p>
```

These keys are a convention, not syntax. Each sits in an ordinary glued attribute block, so a tool that ignores them loses nothing else.

## Insertions and deletions

Glue the block to the closing `+}` or `-}`. HTML output keeps `datetime` as the native attribute of `<ins>` and `<del>` and writes `author` as `data-author`, because HTML defines no author attribute.

A replacement is two nodes, so each side carries its own block, as in the fee example. A single trailing block never spreads to both, which lets a writer annotate one side alone.

On these two elements `cite` keeps its HTML meaning: the URL of a page explaining the change, such as `{-8 percent-}{cite=/reviews/42}`. It never names a person.

## Editorial comments

A comment takes a glued block like any other inline element, and its span carries `data-author` and `data-datetime`. It marks a point in the text, never a range of words.

## Use `datetime`, not `time`

On a plain span, `[…]{time=…}` makes a `<time>` element. On an insertion it stays a raw attribute, and lint warns:

<!-- carve-sample {"lint":"shows the semantic-attribute-outside-span warning"} -->
````carve
Added {+a new clause+}{time=2026-11-20}.
````

```text
warning semantic-attribute-outside-span
```

## Import

[HTML import](/html-import) reverses the mapping: `data-author` becomes `author`, `data-datetime` on a comment span becomes `datetime`, and native `datetime` or `cite` attributes stay as written.

Pandoc writes a word processor comment as a pair of spans, `comment-start` holding the text and a matching `comment-end`, with `data-author` and `data-date`. The importer reads that pair as one point comment where `comment-start` stood. The covered words stay in place, and the lost range is reported as `import-structure-repaired`:

```html
<p>Fee <span class="comment-start" data-comment-id="0" data-author="Bob" data-date="2026-11-21T09:30:00Z">check</span>euros<span class="comment-end" data-comment-id="0"></span>.</p>
```

imports as

````carve
Fee {#check#}{author=Bob datetime=2026-11-21T09:30:00Z}euros.
````

## Word documents

[pandoc-carve](/format-bridges) converts DOCX revisions both ways. When reading, pass `--track-changes=all` through to Pandoc after the bridge's `--` separator. Pandoc's `insertion` and `deletion` spans arrive as Carve insertions and deletions, its `date` key renamed to `datetime`, and Word comments arrive as editorial comments. Writing DOCX turns annotated edits back into tracked changes, and a comment that has an `author` into a Word comment.

[Inline syntax](https://github.com/markup-carve/carve/blob/main/spec/0.2/syntax-inline.md) states the convention (C2-I-063), [HTML output](https://github.com/markup-carve/carve/blob/main/spec/0.2/html.md) the mapping (C2-H-210), and [HTML import](https://github.com/markup-carve/carve/blob/main/spec/0.2/import-html.md) its reverse (C2-M-044, C2-M-113).
