## Two blank lines detach a caption

PART 9 §4 states the caption allowance in two halves: adjacent or exactly ONE
blank line attaches, and anything wider does not. `caption_slot`'s single
optional `blank_line` IS that allowance, and the word that carries the second
half is `[...]` rather than `{...}` - one blank line at most, not a run.

The first half is pinned. `281-a-caption-attaches-across-one-blank-line` put a
one-blank-line document on every host, and removing the optional `blank_line`
from `caption_slot` now breaks five documents where it broke one before.

The second half was pinned nowhere, for any host. Widening `caption_slot` to

```
caption_slot = {blank_line}, caption ;
```

so that ANY number of blank lines attaches broke NOTHING in 856 documents. Every
captioned document in the corpus had zero or one blank line between the host and
the `^ ` line, so not one of them could tell "at most one" apart from "any
number". A reader that attached a caption across three blank lines, or ten,
satisfied every document and every gate in this repository (carve#997).

That is the same shape as the control recorded at
`279-a-boundary-line-inside-an-open-fence-does-not-end-the-container-6`: a
document that passes for a reason unrelated to the rule it looks like it covers.

Five rows below pin the second half, one per captionable host. Each is preceded
by the SAME document with one blank line instead of two, which must attach. That
pairing is the point rather than decoration: a row that only proves detachment at
two blank lines is equally satisfied by a reader that stopped attaching captions
across a blank line at all, which is the opposite defect. The one-blank-line
members are CONTROLS - the widening mutation does not touch them, and the
complementary mutation touches only them.

What detachment looks like is worth stating once, because it is the same on all
five hosts: the host renders UNCAPTIONED - a bare `<table>`, `<pre>`,
`<blockquote>`, `<img>` or math paragraph with no `<figure>` around it - and the
`^ ` line becomes an ordinary paragraph whose text begins with a literal caret.
Nothing is dropped and nothing is an error; the two blocks simply stop being one.

### A table caption, after one blank line

The control for the row below. `table` ends in `[caption_slot]`, so the
attachment here is structural.

::::: compare

```carve
|= City |= People |
| Oslo  | 700k   |

^ Table: city sizes
```

```html
<table>
  <caption>Table: city sizes</caption>
  <thead>
    <tr><th scope="col">City</th><th scope="col">People</th></tr>
  </thead>
  <tbody>
    <tr><td>Oslo</td><td>700k</td></tr>
  </tbody>
</table>
```

:::::

### A table caption, after two blank lines

One line more than the control. The table keeps its rows and loses its
`<caption>`; the `^ ` line is a paragraph.

::::: compare

```carve
|= City |= People |
| Oslo  | 700k   |


^ Table: city sizes
```

```html
<table>
  <thead>
    <tr><th scope="col">City</th><th scope="col">People</th></tr>
  </thead>
  <tbody>
    <tr><td>Oslo</td><td>700k</td></tr>
  </tbody>
</table>
<p>^ Table: city sizes</p>
```

:::::

### A code block caption, after one blank line

The control. A captioned code block is a numbered LISTING (§4) and the `<figure>`
wrapper is what carries the caption.

::::: compare

````carve
```lua
local n = 1
```

^ Listing: a local
````

```html
<figure>
  <pre><code class="language-lua">local n = 1
</code></pre>
  <figcaption>Listing: a local</figcaption>
</figure>
```

:::::

### A code block caption, after two blank lines

The `<figure>` goes with the attachment. What is left is the plain `<pre>` a
fenced block renders on its own, and a paragraph.

::::: compare

````carve
```lua
local n = 1
```


^ Listing: a local
````

```html
<pre><code class="language-lua">local n = 1
</code></pre>
<p>^ Listing: a local</p>
```

:::::

### A blockquote caption, after one blank line

The control. This is the host the corpus could already see: `blockquote` ends in
`[caption_slot]` and `55-blockquote-caption-after-a-blank-line` has pinned the
one-blank-line form since long before this category existed.

::::: compare

```carve
> the cited line

^ Source: the cited work
```

```html
<figure>
  <blockquote><p>the cited line</p></blockquote>
  <figcaption>Source: the cited work</figcaption>
</figure>
```

:::::

### A blockquote caption, after two blank lines

Detached, the quote is an ordinary `<blockquote>` with no `<figure>` and no
`<figcaption>`.

::::: compare

```carve
> the cited line


^ Source: the cited work
```

```html
<blockquote><p>the cited line</p></blockquote>
<p>^ Source: the cited work</p>
```

:::::

### An image caption, after one blank line

The control, and the first of the two PROSE hosts. There is no `image_paragraph`
production and no slot to widen or narrow: the block IS a `paragraph`, and what
makes it captionable is a condition on its inline content (carve#992). §4 is the
whole rule, so a corpus row is the only thing that can hold either half of it.

::::: compare

```carve
![Ganymede](ganymede.jpg)

^ Figure: the largest moon
```

```html
<figure>
  <img src="ganymede.jpg" alt="Ganymede">
  <figcaption>Figure: the largest moon</figcaption>
</figure>
```

:::::

### An image caption, after two blank lines

Without the caption there is no `<figure>`, and an image-only paragraph renders
as the bare `<img>` at block level.

::::: compare

```carve
![Ganymede](ganymede.jpg)


^ Figure: the largest moon
```

```html
<img src="ganymede.jpg" alt="Ganymede">
<p>^ Figure: the largest moon</p>
```

:::::

### A display-math caption, after one blank line

The control, and the second PROSE host. A captioned standalone display-math block
is a numbered EQUATION (§4); the block must be solely the `$$`-prefixed span.

::::: compare

```carve
$$`a + b = c`

^ Equation: the sum
```

```html
<figure>
  <p><span class="math display" role="math">\[a + b = c\]</span></p>
  <figcaption>Equation: the sum</figcaption>
</figure>
```

:::::

### A display-math caption, after two blank lines

Detached, the math block is the ordinary paragraph it always was, and the caption
is a second one.

::::: compare

```carve
$$`a + b = c`


^ Equation: the sum
```

```html
<p><span class="math display" role="math">\[a + b = c\]</span></p>
<p>^ Equation: the sum</p>
```

:::::

None of this is new behavior. All ten documents were measured against carve-js,
carve-php and carve-rs before they were written down, and all three produce these
bytes on all ten, so the category pins existing behavior rather than proposing
any.

One thing the rows do not prove, and should not be read as proving: the five
hosts are five SPELLINGS of the rule, not five independent implementations of it.
The image paragraph and the display-math block share one decision site in the
executable spec, because both are the same `paragraph` with a different condition
on their content. Both rows still belong - a change to either condition would
move one and not the other - but a mutation of the shared site kills them
together, and the five-host count is a count of hosts, not of code paths.
