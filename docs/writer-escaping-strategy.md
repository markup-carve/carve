---
description: How the canonical writer decides where an escape is needed.
---

# Writer escaping strategy

The canonical writer turns a tree into Carve source. `carve fmt` uses it on
parsed source, the HTML importer uses it on imported trees, and a host can call
`write` on any tree it built. Wherever text holds a character that would read as
markup, the writer has to put a backslash before it, and only there. This page
explains how 0.2 decides that, with examples taken from the reference engine. An
engine may find the escapes another way, such as from tables, as long as it
writes the same bytes; the procedure described here defines those bytes.

## Why a character table cannot decide

The same character is text in one place and markup in another:

| Text in the tree | Written as | Why |
|---|---|---|
| `[a] (b)` | `[a] (b)` | A space between `]` and `(` stops a link from forming |
| `[a](b)` | `\[a](b)` | Bare, this is a link |
| `x ^ y and a-b and 3*4 and and/or` | unchanged | None of these characters opens anything here |
| `under _score_ here` | `under \_score_ here` | A bare `_x_` pair is text in 0.2, but lint reports it, so the writer escapes it |
| `# not a heading` | `\# not a heading` | At the start of a paragraph, `#` and a space open a heading |
| `1) one` | `1\) one` | At the start of a line, `1)` opens an ordered list |
| `> not a quote` | `\> not a quote` | At the start of a paragraph, `>` and a space open a quote |

Escaping every punctuation character everywhere would make the source hard to
read and would put backslashes where they change nothing. The canonical form has
exactly the escapes that the procedure below places, no more and no fewer.

## The repair rounds

The writer writes the text bare, then parses it in its real context: the lines
before it, and the link definitions of the whole document. It compares that
parse with the tree:

1. Every construct the parse holds that the tree does not hold is reported. Its
   kind is its opener: the character that takes the backslash, such as `[`, `*`
   or `<`, or for a block opener at the start of a line, the first character of
   the line.
2. For each kind reported in a block, the round escapes every potential opener
   of that kind in that block, not only the ones that formed something. The
   block is the leaf block that holds the text: a paragraph, a heading, a term or
   a table cell.
3. The text is parsed again, and the next round starts.

Because each round escapes a whole kind at once, the number of rounds depends on
how many kinds a block needs, not on how many escapes it needs. An escaped
opener does not open again, so the rounds always end.

Step 2 is why one escape can bring others with it. This source has a link
definition for `a` and the text `[a]` and `[b]`:

```crv
Text \[a] and \[b], then [link][a].

[a]: /u
```

```html
<p>Text [a] and [b], then <a href="/u">link</a>.</p>
```

Bare, `[a]` would resolve as a shortcut reference to the definition. That
reports the kind `[`, so every `[` of the paragraph that could open takes a
backslash, `[b]` included, even though `[b]` matches no definition. The
reference `[link][a]` is a node of the tree, so its bracket is not a text
opener and stays bare. Run through `carve fmt`, a source that escaped only
`\[a]` gains the escape before `[b]`.

The same rule applies to a link shape in text:

```crv
\[a](b) and \[a] (b)
```

```html
<p>[a](b) and [a] (b)</p>
```

On its own, `[a] (b)` needs no escape. Here the first `[a](b)` reports the kind
`[`, so the second bracket is escaped too.

### An escape is never taken back

A later round can make an earlier escape unnecessary. The writer does not go
back to remove it; the form with both escapes is the canonical one. The text
`x<a:b>=}` is written:

```crv
x\<a:b\>=}
```

```html
<p>x&lt;a:b&gt;=}</p>
```

Bare, `<a:b>` reads as an autolink, so the first round escapes `<`. In the next
round `>=` reads as a comparison sign, so `>` is escaped as well. The escape of
`>` alone would have stopped both, but the procedure does not search for the
smallest set.

The text `x(/u)(/u)/` is written:

```crv
x(\/u)(\/u)/
```

```html
<p>x(/u)(/u)/</p>
```

Bare, the second and third slash pair as emphasis, so the round escapes every
slash that can open. The last slash cannot open, because nothing follows it,
and stays bare.

### Where the backslash goes

The unit of an escape is the opener. The backslash stands before the first ASCII
punctuation character of the construct, so that the whole run reads as text,
with two exceptions:

- In a run of hyphens it stands before the second hyphen, and before every
  second hyphen after that. `--` would read as an en dash and `---` as an em
  dash, so the text `a-b -- c --- d` is written:

  ```crv
  a-b -\- c -\-- d
  ```

  ```html
  <p>a-b -- c --- d</p>
  ```

  A single hyphen opens no dash and stays bare.

- In a sigil glued to a bracket or a backtick (`![`, `^[`, or `!` and `$` before
  a backtick), the backslash stands before the bracket or the backtick, or
  before the sigil when the bracket or backtick opens a construct the tree
  holds.

## Line starts

A paragraph line is tested for reading as a block opener. At the start of a
paragraph, or on any line where the block would interrupt, the writer escapes
the first character of the line:

```crv
\# not a heading

\- not a list

1\. not ordered

\^ not a caption
```

```html
<p># not a heading</p>
<p>- not a list</p>
<p>1. not ordered</p>
<p>^ not a caption</p>
```

For an ordered marker the escape goes on the delimiter behind the digits or
letters. The full list of line shapes the writer tests covers headings,
captions, table rows, fences of backticks, colons or percent signs, list and
description markers, definitions, quotes, a run of three or more stars, an
attribute line, an include line, `---` on line 1 and typed metadata openers, and
`%%` comments.

A typed metadata opener is a case of its own. A paragraph whose first line is
the text `---yaml` would open a metadata block after a blank line, so the writer
escapes the second hyphen:

```crv
a

-\--yaml
k: v
```

```html
<p>a</p>
<p>---yaml
k: v</p>
```

When the first line holds an em dash node followed by a format name, an escape
would turn the dash into text, so the writer indents that line by one space
instead.

## Inline cases

The writer also tests:

- a `/` or `*` that would open or close emphasis or strong;
- a bracket that would form a link, a reference, an image, a footnote or a span
  with attributes;
- a sigil that would form a mention or a tag (`@` and `#` before a name), a
  symbol (`:name:`), an inline extension (`:name[`), an autolink (`<` before a
  URL or address), code, math, or smart punctuation;
- an opening brace that would form an attribute block, a comment or a braced
  opener.

For example, `see @alice and #tag` as plain text is written:

```crv
see \@alice and \#tag
```

```html
<p>see @alice and #tag</p>
```

### Bare mark pairs

In 0.2 a bare `~s~`, `_u_` or `=x=` is text: underline, strike and highlight
need braces. Lint still reports these pairs, because an author coming from
Markdown or Carve 0.1 probably meant markup. Canonical output passes those lint
rules, so the writer escapes the opening mark of each pair it writes as text,
and does the same for Markdown's `**strong**` and `~~strike~~`:

```crv
\~s~ \_u_ \=x= \*\*b**
```

```html
<p>~s~ _u_ =x= **b**</p>
```

The same test covers `unattached-caption`: a caret line that stays text takes a
backslash before the caret.

### Backslashes

A backslash in text is written as two when the next character is ASCII
punctuation or a space, or when it ends the line. Elsewhere a single backslash
is text:

```crv
C:\dir\file and a\\ and a\\*
```

```html
<p>C:\dir\file and a\ and a\*</p>
```

In the alt text of an image, a backslash is doubled before ASCII punctuation and
at the end of the alt text, and a bracket without a partner takes a backslash.

### Table cells

In a table cell every pipe takes a backslash, in text, a destination, a title, a
label and a quoted attribute value alike. A pipe inside a code span needs none.

```crv
| a\|b |
```

```html
<table>
  <tbody>
    <tr><td>a|b</td></tr>
  </tbody>
</table>
```

## When a node does not form

The rounds escape what forms by accident. The opposite also happens: a
character that opens nothing in the bare text can keep a node of the tree from
forming, or end it early. The writer then places a backslash for that node,
removes the backslashes the rounds had placed in the same stretch, and runs the
rounds again from there. The specification names every such case. Three of them:

- A bare opening brace that would read on into a later construct takes the
  backslash. A strong node holding `{` is written:

  ```crv
  x *\{*
  ```

  ```html
  <p>x <strong>{</strong></p>
  ```

- A text character directly after a node that would lengthen it takes the
  backslash. A mention `@a` followed by the text `_` is written:

  ```crv
  @a\_
  ```

  and a code span followed by a text backtick gets a backslash before that
  backtick.

- A hyphen run that starts with a dash of the tree and ends in text escapes the
  first hyphen after the dash: an en dash followed by a hyphen is written
  `x--\-`.

## Supplied trees and the two gates

The writer checks two gates. For a document it parsed, its output parses back
to an equal tree. And formatting that output again gives the same bytes. For a
tree from a parse, the rounds always find a form that keeps the tree. For a tree
a host built, they may not: the writer then compares the parse of its finished
output with the tree and reports every node that did not read back.

A supplied tree may also hold shapes that Carve source cannot spell at all, such
as `small_caps` or blocks inside a table cell. The writer writes its nearest
spelling and reports `structure-unspellable` or `field-unspellable` with the
path of what was lost, instead of claiming a lossless round trip.
`writeWithDiagnostics` and `formatWithDiagnostics` return the source and those
entries; `write` and `format`, which return only source, throw
`CarveWriteError` instead. The [format conversion page](./format-bridges) has a
worked example.

The repairs draw on one budget for the whole document. A block group that runs
out of it, or comes back to a repair state it was already in, is not written
canonically: the writer reports `writer-refused` at its first node, and the two
gates do not apply to that result.

## Canonical forms around the escapes

Escapes are one part of the canonical form. The writer also picks one spelling
for each construct. A table, for example, uses header cell marks rather than a
GFM separator row, so an imported Markdown table comes out as:

```crv
|= Name |= Qty |
| Apple | 2 |
```

A reference keeps the text the author wrote, backslashes included, when the
layout sidecar recorded it and it still reads as the same node. Otherwise the
writer spells it from the tree.

For a formatter integration, use `format` or `carve fmt` and read the
diagnostics. By default `fmt` keeps a few spellings the layout sidecar
records, such as written numbers on an ordered list (`1.`, `2.`) and a quote
written as a `::: >` fence. With `--normalize` (the option `normalize`), it
drops them: the list becomes `. a`, `. b` and the quote becomes `>` lines. The
heading marker, the thematic break and the fence character are always written in
their canonical form. `carve fmt --check` exits with 1 when a file would change,
and `--diff` shows how.

## Implementing the procedure

An engine can implement the rounds directly: write bare, parse, collect the
reported kinds per block, escape, repeat. Each round decides all its escapes
from one parse before it places any of them. Where two reported constructs start
at the same offset, the outer one supplies the kind.

The work on one text must grow at most linearly with its length. Reparsing the
whole text once per escape does not meet that bound on a text that needs many
escapes, such as `\[x]` written many times under a definition of `x`; escaping
by kind does. An engine that decides most escapes from tables and parses only
for the rest still has to reach the same bytes.

The 0.1 strategy on this page, which built a minimal and a conservative trial
and then tried each escape bare again, does not give 0.2 bytes: 0.2 escapes a
whole kind per block and never takes an escape back.

**Specification (external):** [writer escaping](https://github.com/markup-carve/carve/blob/main/spec/0.2/writer.md#escaping), [the writer and its two gates](https://github.com/markup-carve/carve/blob/main/spec/0.2/writer.md#the-writer-and-its-two-gates), [what the writer cannot spell](https://github.com/markup-carve/carve/blob/main/spec/0.2/writer.md#what-the-writer-cannot-spell), [the sidecar](https://github.com/markup-carve/carve/blob/main/spec/0.2/writer.md#the-sidecar), [`carve fmt`](https://github.com/markup-carve/carve/blob/main/spec/0.2/writer.md#carve-fmt), [shapes that Carve source cannot spell](https://github.com/markup-carve/carve/blob/main/spec/0.2/ast.md#shapes-that-carve-source-cannot-spell).
