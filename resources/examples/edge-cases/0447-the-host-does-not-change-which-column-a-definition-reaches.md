## The host does not change which column a definition reaches

PART 0's AT OR PAST MEANS THE DEEPEST COLUMN THE LINE REACHES is written about
CONTAINERS, and the three indented-block collectors are containers alike - a
description body and a footnote body select an owner by content column exactly
as a list item does (§10 I5, DEFINITION BODIES FOLLOW THE SAME CONTAINER REACH
RULE). So a definition written strictly between two open content columns
registers in the outer one whatever pair of hosts opened them
(markup-carve/carve#1918).

The band is pinned at both edges and in the middle, because the middle column
is the only one the other reading answers differently: read as the deepest
container still OPEN, one added space would remove a definition and a second
would restore it. Section 441 pins that band for two list items; this section
pins the same band for every other pair.

A two-space separator opens the description body at column 3 and the item
inside it at column 5. Column 3 first - the body's own content column.

::: compare

```carve
:: t
:  - a
   [r]: /url

See [r][].
```

```html
<dl>
  <dt>t</dt>
  <dd>
    <ul>
      <li>a</li>
    </ul>
  </dd>
</dl>
<p>See <a href="/url">r</a>.</p>
```

:::

Column 4, strictly between the two. This is the column that read as lazy text
under a body while the identical shape under an item registered.

::: compare

```carve
:: t
:  - a
    [r]: /url

See [r][].
```

```html
<dl>
  <dt>t</dt>
  <dd>
    <ul>
      <li>a</li>
    </ul>
  </dd>
</dl>
<p>See <a href="/url">r</a>.</p>
```

:::

Column 5, the item's own content column.

::: compare

```carve
:: t
:  - a
     [r]: /url

See [r][].
```

```html
<dl>
  <dt>t</dt>
  <dd>
    <ul>
      <li>a</li>
    </ul>
  </dd>
</dl>
<p>See <a href="/url">r</a>.</p>
```

:::

The separator width moves the band and nothing else. A one-space separator
puts the same middle column at 3, and a three-space separator at 5.

::: compare

```carve
:: t
: - a
   [r]: /url

See [r][].
```

```html
<dl>
  <dt>t</dt>
  <dd>
    <ul>
      <li>a</li>
    </ul>
  </dd>
</dl>
<p>See <a href="/url">r</a>.</p>
```

:::

::: compare

```carve
:: t
:   - a
     [r]: /url

See [r][].
```

```html
<dl>
  <dt>t</dt>
  <dd>
    <ul>
      <li>a</li>
    </ul>
  </dd>
</dl>
<p>See <a href="/url">r</a>.</p>
```

:::

The inner container is not a parameter either. A description body inside a
description body answers the middle column the same way.

::: compare

```carve
:: t
:  :: u
   : d
    [r]: /url

See [r][].
```

```html
<dl>
  <dt>t</dt>
  <dd>
    <dl>
      <dt>u</dt>
      <dd>d</dd>
    </dl>
  </dd>
</dl>
<p>See <a href="/url">r</a>.</p>
```

:::

Nor is the outer one. A footnote body opens at column 2, the list inside it at
column 4, and the definition at column 3 is the note's.

::: compare

```carve
[^f]: b

  - a
   [r]: /url

See [r][] and [^f].
```

```html
<p>See <a href="/url">r</a> and <a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a>.</p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>b</p>
      <ul>
        <li>a</li>
      </ul>
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

The same note holding a description body.

::: compare

```carve
[^f]: b

  :: t
  : d
   [r]: /url

See [r][] and [^f].
```

```html
<p>See <a href="/url">r</a> and <a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a>.</p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>b</p>
      <dl>
        <dt>t</dt>
        <dd>d</dd>
      </dl>
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

A list item outside and a description body inside: the definition at column 3
reaches the ITEM, so the body ends above it and the item's paragraph closes
(§10 I5).

::: compare

```carve
- x
  :: t
  : d
   [r]: /url

See [r][].
```

```html
<ul>
  <li>x
    <dl>
      <dt>t</dt>
      <dd>d</dd>
    </dl>
  </li>
</ul>
<p>See <a href="/url">r</a>.</p>
```

:::

A list item outside and a footnote body inside. The note's body column is two
past the definition line's own, so column 3 is between them and the item owns
it. A definition renders nothing where it is written, so the item holds only
`x`.

::: compare

```carve
- x
  [^g]: b
   [r]: /url

See [r][] and [^g].
```

```html
<ul>
  <li>x</li>
</ul>
<p>See <a href="/url">r</a> and <a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a>.</p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>b<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

The payload kind is not a parameter. A footnote definition in the same slot
answers the same way.

::: compare

```carve
- x
  [^g]: b
   [^n]: note text

See [^n] and [^g].
```

```html
<ul>
  <li>x</li>
</ul>
<p>See <a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a> and <a id="fnref2" href="#fn2" role="doc-noteref"><sup>2</sup></a>.</p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>note text<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
    <li id="fn2">
      <p>b<a href="#fnref2" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

::: compare

```carve
:: t
:  - a
    [^n]: note text

See [^n].
```

```html
<dl>
  <dt>t</dt>
  <dd>
    <ul>
      <li>a</li>
    </ul>
  </dd>
</dl>
<p>See <a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a>.</p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>note text<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

A description body holding a footnote definition, and a footnote body holding
another one, complete the pairs.

::: compare

```carve
:: t
: [^g]: b
   [r]: /url

See [r][] and [^g].
```

```html
<dl>
  <dt>t</dt>
  <dd></dd>
</dl>
<p>See <a href="/url">r</a> and <a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a>.</p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>b<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

::: compare

```carve
[^f]: b

  [^g]: c
   [^n]: note text

See [^n] and [^f] and [^g].
```

```html
<p>See <a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a> and <a id="fnref2" href="#fn2" role="doc-noteref"><sup>2</sup></a> and <a id="fnref3" href="#fn3" role="doc-noteref"><sup>3</sup></a>.</p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>note text<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
    <li id="fn2">
      <p>b<a href="#fnref2" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
    <li id="fn3">
      <p>c<a href="#fnref3" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

A REPEATED label is the same question with the table as no evidence: the
second spelling is a definition wherever it lands, so it registers rather than
publishing its own characters.

::: compare

```carve
- - x
  [r]: /first
   [r]: /second

See [r][].
```

```html
<ul>
  <li>
    <ul>
      <li>x</li>
    </ul>
  </li>
</ul>
<p>See <a href="/second">r</a>.</p>
```

:::

And the controls. An ABBREVIATION definition is recognized only as a direct
child of the document (PART 12 §7), so the same slot leaves it as text - a fix
that registered every definition-shaped line would move this row.

::: compare

```carve
:: t
:  - a
    *[HTML]: HyperText

HTML here.
```

```html
<dl>
  <dt>t</dt>
  <dd>
    <ul>
      <li>a
*[HTML]: HyperText</li>
    </ul>
  </dd>
</dl>
<p>HTML here.</p>
```

:::

BELOW EVERY OPEN COLUMN IS UNCHANGED. A definition at a nonzero column below
the OUTERMOST open content column reaches no opener column at all and stays
lazy paragraph text of the body it fell below (§24 C3).

::: compare

```carve
:: t
: d
 [r]: /url

See [r][].
```

```html
<dl>
  <dt>t</dt>
  <dd>d</dd>
</dl>
<p>See <a href="/url">r</a>.</p>
```

:::

A NON-OPENER at the middle column still folds. The band is about lines the
surviving context can open a block with; ordinary prose is not one.

::: compare

```carve
:: t
:  - a
    more
```

```html
<dl>
  <dt>t</dt>
  <dd>
    <ul>
      <li>a
more</li>
    </ul>
  </dd>
</dl>
```

:::

AN OPENER THAT LEAVES A PARAGRAPH OPEN IS NOT COVERED (carve#1917). A block
quote past the body's column opens inside the `dd`, its own paragraph is still
open, and the flush-left line lazily continues THE QUOTE.

::: compare

```carve
:: t
:  d
    > q
tail
```

```html
<dl>
  <dt>t</dt>
  <dd>
    <p>d</p>
    <blockquote><p>q
tail</p></blockquote>
  </dd>
</dl>
```

:::

A definition at the INNER container's own content column is that container's
block content, so the extent does not end there and the line below it is still
the item's text. The rule is what a container REACHES, not that a definition
appeared.

::: compare

```carve
:: t
:  - a
     [r]: /url
     more

See [r][].
```

```html
<dl>
  <dt>t</dt>
  <dd>
    <ul>
      <li>a
        more
      </li>
    </ul>
  </dd>
</dl>
<p>See <a href="/url">r</a>.</p>
```

:::

AN OPAQUE PAYLOAD IS NOT SCANNED. A definition written inside a code, raw or
comment fence is verbatim content and registers nothing, at any column, so the
band's question is never asked of it - the fence runs to its own closer and
`[r][]` stays literal.

::: compare

````carve
:: t
:  - a
     ```
     [r]: /url
     ```

See [r][].
````

````html
<dl>
  <dt>t</dt>
  <dd>
    <ul>
      <li>a
        <pre><code>[r]: /url
</code></pre>
      </li>
    </ul>
  </dd>
</dl>
<p>See [r][].</p>
````

:::

The same control for a fence attached by a continuation marker, where the block
being measured is the fence itself.

::: compare

````carve
- a
+
```
 [r]: /url
```

See [r][].
````

````html
<ul>
  <li>a
    <pre><code> [r]: /url
</code></pre>
  </li>
</ul>
<p>See [r][].</p>
````

:::

A COMMENT fence's payload is opaque the same way, and its closer is matched on
EXACT length (§28), so the definition inside it registers nothing and the
reference below stays literal.

::: compare

```carve
:: t
:  - a
     %%%
     [r]: /url
     %%%

See [r][].
```

```html
<dl>
  <dt>t</dt>
  <dd>
    <ul>
      <li>a</li>
    </ul>
  </dd>
</dl>
<p>See [r][].</p>
```

:::

And a definition at the measured block's OWN column 0 is the block's by
construction, however many of them there are: the second spelling of one label
does not end the block it is written in, so the line under it is still the
block's.

::: compare

```carve
- a
+
[r]: /a
[r]: /b
more

See [r][].
```

```html
<ul>
  <li>a
    more
  </li>
</ul>
<p>See <a href="/b">r</a>.</p>
```

:::
