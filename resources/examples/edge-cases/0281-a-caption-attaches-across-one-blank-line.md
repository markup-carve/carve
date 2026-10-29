## A caption attaches across one blank line

PART 9 §4 gives one rule for all five captionable hosts: adjacent OR exactly one
blank line attaches, two blank lines detach and leave the `^ ` line an ordinary
paragraph. WHERE that rule is written down differs, and that is the whole reason
this category exists. For the fenced code block, the block quote and the table it
is STRUCTURAL - each production ends in `[caption_slot]`, and that slot's single
optional `blank_line` IS the allowance. For the IMAGE PARAGRAPH and the
STANDALONE DISPLAY-MATH BLOCK it is PROSE, because neither has a production to
hang the slot on: both ARE a `paragraph`, and what distinguishes them is a
condition on that paragraph's inline content (carve#991, carve#992).

One rule, two spellings, and the corpus could tell them apart only for one host.
Of the twenty documents carrying a `^ ` caption line, exactly ONE separated the
host from its caption with a blank line - `55-blockquote-caption-after-a-blank-line`
- and blockquote is one of the three hosts that has the slot. The allowance was
unpinned for the other four, and for the two prose hosts it was unpinned
structurally as well. A reader could have dropped the blank-line form on four of
five hosts and stayed green.

Four rows below pin it, one per remaining host. Each is preceded by the SAME
document with the blank line taken out, which must render identically: that is
the actual claim - not that a caption attaches, which is already pinned all over
the corpus, but that these two spellings are ONE rule and produce one answer. The
adjacent members are controls. They are unaffected by any mutation of the
allowance, and they are here so a row cannot be satisfied by a reader that has
stopped attaching captions altogether.

### A table caption, adjacent

The control for the row below. `09-tables` already pins this shape; it is
repeated here so the pair reads as a pair and the two documents differ by exactly
one line.

::::: compare

```carve
|= Fruit |= Price |
| Apple  | $1     |
^ Fruit prices
```

```html
<table>
  <caption>Fruit prices</caption>
  <thead>
    <tr><th scope="col">Fruit</th><th scope="col">Price</th></tr>
  </thead>
  <tbody>
    <tr><td>Apple</td><td>$1</td></tr>
  </tbody>
</table>
```

:::::

### A table caption, after one blank line

`table` ends in `[caption_slot]`, so this is the structural spelling. Byte for
byte the same output as the row above.

::::: compare

```carve
|= Fruit |= Price |
| Apple  | $1     |

^ Fruit prices
```

```html
<table>
  <caption>Fruit prices</caption>
  <thead>
    <tr><th scope="col">Fruit</th><th scope="col">Price</th></tr>
  </thead>
  <tbody>
    <tr><td>Apple</td><td>$1</td></tr>
  </tbody>
</table>
```

:::::

### A code block caption, adjacent

The control. A captioned code block is a numbered LISTING (§4), and the
`<figure>` wrapper is what carries the caption.

::::: compare

````carve
```python
def greet():
    return 1
```
^ Listing: a greeting
````

```html
<figure>
  <pre><code class="language-python">def greet():
    return 1
</code></pre>
  <figcaption>Listing: a greeting</figcaption>
</figure>
```

:::::

### A code block caption, after one blank line

The second structural host. The blank line sits between the fence's CLOSER and
the caption, which is the position `caption_slot`'s optional `blank_line`
describes: `fenced_code_block` ends at a newline, so there is no competing
optional for the blank to be consumed by.

::::: compare

````carve
```python
def greet():
    return 1
```

^ Listing: a greeting
````

```html
<figure>
  <pre><code class="language-python">def greet():
    return 1
</code></pre>
  <figcaption>Listing: a greeting</figcaption>
</figure>
```

:::::

### An image caption, adjacent

The control. `08-image-with-caption` pins this shape too; the pair is repeated
here for the same reason the table pair is.

::::: compare

```carve
![Apollo 11](apollo.jpg)
^ Figure 1: First moon landing
```

```html
<figure>
  <img src="apollo.jpg" alt="Apollo 11">
  <figcaption>Figure 1: First moon landing</figcaption>
</figure>
```

:::::

### An image caption, after one blank line

The first of the two PROSE hosts, and the one an author reaches for most often.
There is no `image_paragraph` production and no slot: §4 is the rule, and PART 3
says beside `image` that "there is no separate grammar production for the pair".

So this row is the only thing that holds the allowance for this host. Nothing
structural does.

::::: compare

```carve
![Apollo 11](apollo.jpg)

^ Figure 1: First moon landing
```

```html
<figure>
  <img src="apollo.jpg" alt="Apollo 11">
  <figcaption>Figure 1: First moon landing</figcaption>
</figure>
```

:::::

### A display-math caption, adjacent

The control. A captioned standalone display-math block is a numbered EQUATION
(§4); the block must be solely the `$$`…`` span.

::::: compare

```carve
$$`E = mc^2`
^ Equation: mass-energy
```

```html
<figure>
  <p><span class="math display" role="math">\[E = mc^2\]</span></p>
  <figcaption>Equation: mass-energy</figcaption>
</figure>
```

:::::

### A display-math caption, after one blank line

The second PROSE host, and the same argument as the image paragraph: this block
IS a `paragraph`, distinguished by a condition on its inline content, so no slot
can be hung on it without making every paragraph captionable. §4 is the rule and
this row is the pin.

::::: compare

```carve
$$`E = mc^2`

^ Equation: mass-energy
```

```html
<figure>
  <p><span class="math display" role="math">\[E = mc^2\]</span></p>
  <figcaption>Equation: mass-energy</figcaption>
</figure>
```

:::::

Nothing here is new behavior. Every one of these eight documents is what
carve-js already produced when the drift audit measured the five hosts across
three separations, which is what makes them committable as a pin rather than a
proposal.
