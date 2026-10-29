## A collapsed reference reaches a heading by the heading's rendered text

PART 9R R1's implicit heading fallback keys the index by each heading's RENDERED
PLAIN TEXT, so `# *bold* heading` is registered as `bold heading`. R1 said the
label and the heading text are "both" trimmed, collapsed and NFC-normalized
(case-folded too, at the time), but it never said which string the label side contributes - its
source run or its rendered plain text. Read as the source run, the asterisks
survive all four normalizations and no heading containing markup is reachable by
its collapsed spelling; read as rendered plain text, it is. Nothing pinned
either answer, and carve-js took the first reading while carve-rs, carve-php and
the executable spec took the second (markup-carve/carve#648).

It is settled as rendered plain text on this path: the heading side of the
comparison is already rendered plain text, and two strings of different kinds
can never meet.

::: compare

```carve
# *bold* heading

[*bold* heading][]
```

```html
<section id="bold-heading">
  <h1><strong>bold</strong> heading</h1>
  <p><a href="#bold-heading"><strong>bold</strong> heading</a></p>
</section>
```

:::

A code span in the heading is the same row, and worth pinning separately because
an implementation that strips a fixed list of emphasis characters can pass the
first one and fail this one:

::: compare

```carve
# `code()` heading

[`code()` heading][]
```

```html
<section id="code-heading">
  <h1><code>code()</code> heading</h1>
  <p><a href="#code-heading"><code>code()</code> heading</a></p>
</section>
```

:::

Those two were the whole sample for a long time, and both are on the list a
character-class strip would carry, so the list itself went unmeasured. These are
the shapes such a strip cannot reach (markup-carve/carve#1011). Carve's emphasis
delimiter is `/`, and no strip can remove it without eating every path and URL an
author might quote:

::: compare

```carve
# an /em/ heading

[an /em/ heading][]
```

```html
<section id="an-em-heading">
  <h1>an <em>em</em> heading</h1>
  <p><a href="#an-em-heading">an <em>em</em> heading</a></p>
</section>
```

:::

An ESCAPE is the shape where the two sides meet at neither spelling: the heading
renders `a_b`, the label as written is `a\_b`, and deleting the underscore from
the label leaves the backslash behind.

::: compare

```carve
# a\_b heading

[a\_b heading][]
```

```html
<section id="a-b-heading">
  <h1>a_b heading</h1>
  <p><a href="#a-b-heading">a_b heading</a></p>
</section>
```

:::

A NESTED LINK in the label contributes its text and not its destination, which
is the heading side's own rule; dropping the brackets alone leaves `(/y)`
standing. The resolved reference carries no nested anchor, because links never
nest (PART 12 §3a).

::: compare

```carve
# a [x](/y) b

[a [x](/y) b][]
```

```html
<section id="a-x-b">
  <h1>a <a href="/y">x</a> b</h1>
  <p><a href="#a-x-b">a x b</a></p>
</section>
```

:::

SMART TYPOGRAPHY is the shape with no markup characters in it at all: the
heading holds the curly apostrophe the substitution produced and the label holds
the one the author typed, so only a comparison made after rendering relates
them.

::: compare

```carve
# it's a heading

[it's a heading][]
```

```html
<section id="it-s-a-heading">
  <h1>it’s a heading</h1>
  <p><a href="#it-s-a-heading">it’s a heading</a></p>
</section>
```

:::

An INLINE LITERAL contributes its content, the same as the code span above (§27
renders it as visible prose):

::: compare

```carve
# a !`Cat` b

[a !`Cat` b][]
```

```html
<section id="a-Cat-b">
  <h1>a Cat b</h1>
  <p><a href="#a-Cat-b">a Cat b</a></p>
</section>
```

:::

A SYMBOL SHORTCODE is the one shape where the two sides meet by both
contributing NOTHING. The slug rule (syntax.md §4.1 step 1) takes the heading's
rendered plain text "inline markup removed; symbols `:name:` and footnote
references excluded", so `# a :smile: b` is `a-b` and is keyed `a b`. The
exclusion is by CONSTRUCT and not by what the symbol renders as, which is what
makes the id hold still: a symbol resolves through processor configuration - an
inline-renderer handler, else the renderer's `symbols` map, else the literal
`:name:` - while an id is assigned in a parse pass no renderer option reaches.
An id keyed on the shortcode NAME would name a spelling the document stops
rendering the moment a host configures a map, and one keyed on the RESOLVED
value would move every such id at that same moment. The corpus renders with no
map, so the heading below prints `:smile:` and is still `a-b`.

::: compare

```carve
# a :smile: b

[a :smile: b][]
```

```html
<section id="a-b">
  <h1>a :smile: b</h1>
  <p><a href="#a-b">a :smile: b</a></p>
</section>
```

:::

The exclusion reaches the INDEX KEY as well, and it has to: the index is keyed by
the same rendered plain text, so a heading that excludes the shortcode is keyed
`a b` and is reachable by that spelling too. Excluding it from the id alone
would leave the id and the key describing two different strings.

::: compare

```carve
# a :smile: b

[a b][]
```

```html
<section id="a-b">
  <h1>a :smile: b</h1>
  <p><a href="#a-b">a b</a></p>
</section>
```

:::

The two exclusions compose: a heading holding both a symbol and emphasis
contributes the emphasis text and not the shortcode.

::: compare

```carve
# a :smile: /b/ c

[a :smile: /b/ c][]
```

```html
<section id="a-b-c">
  <h1>a :smile: <em>b</em> c</h1>
  <p><a href="#a-b-c">a :smile: <em>b</em> c</a></p>
</section>
```

:::

The strip is SCOPED TO THE HEADING INDEX. An authored definition is still
matched by the label as written -
`193-a-collapsed-reference-is-matched-by-the-label-the-author-wrote` pins both
directions of that, and a change that reaches it is a deviation from R1 rather
than a generalization of it. The tie-break is unaffected too: linkDefs wins, so
a definition whose label carries the same markup beats the heading the fallback
would otherwise find.

::: compare

```carve
[*bold* heading]: /x

# *bold* heading

[*bold* heading][]
```

```html
<section id="bold-heading">
  <h1><strong>bold</strong> heading</h1>
  <p><a href="/x"><strong>bold</strong> heading</a></p>
</section>
```

:::
