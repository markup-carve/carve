## An attribute block reaches the nested list it precedes

An attribute block attaches to the block that FOLLOWS it, and a nested list is a
block. Inside a list item that is easy to get wrong, because the item's
continuation collector stops at a marker sitting at the item's content column so
the list parser can own the sub-list: an implementation that splits there leaves
the attribute line at the end of one run and the nested list at the start of the
next, and the attributes are silently discarded. Three engines disagreed about
this for a long time with nothing in the corpus to say who was right
(carve#1238).

The target is the nested `<ul>`/`<ol>` - not the item, and not the outer list.
With a blank line before the attribute block:

::: compare

```carve
- a

  {.x}
  - b
```

```html
<ul>
  <li>a
    <ul class="x">
      <li>b</li>
    </ul>
  </li>
</ul>
```

:::

The blank line decides nothing. The same three lines with no blank between them
mean the same document, and the item stays tight either way (PART 9 §17 L2: a
sub-block attached after a blank leaves the item tight):

::: compare

```carve
- a
  {.x}
  - b
```

```html
<ul>
  <li>a
    <ul class="x">
      <li>b</li>
    </ul>
  </li>
</ul>
```

:::

That the blank is irrelevant is not a claim about lists in particular. The same
unseparated attribute line in front of a PARAGRAPH has always attached, in the
same position with the same spacing:

::: compare

```carve
- a
  {.x}
  para
```

```html
<ul>
  <li>a
    <p class="x">para</p>
  </li>
</ul>
```

:::

One nesting level up the three lines read identically. This is the control that
makes the rule above uniform rather than a special case for nested lists - the
top-level pair `{.x}` before a list is already pinned by `13-attributes-5`:

::: compare

```carve
para
{.x}
- b
```

```html
<p>para</p>
<ul class="x">
  <li>b</li>
</ul>
```

:::

An ordered nested list is the same block in the same position:

::: compare

```carve
- a

  {.x}
  1. b
```

```html
<ul>
  <li>a
    <ol class="x">
      <li>b</li>
    </ol>
  </li>
</ul>
```

:::

Stacked attribute blocks MERGE into one set, the way they do at top level and in
front of a paragraph. An implementation that keeps a single pending slot and
overwrites it drops everything but the last block, and only a two-block document
says so:

::: compare

```carve
- a

  {.x}
  {#i}
  - b
```

```html
<ul>
  <li>a
    <ul class="x" id="i">
      <li>b</li>
    </ul>
  </li>
</ul>
```

:::

The attribute line does not have to be alone in the run it ends. A fix keyed on
"the whole continuation run is an attribute block" passes the cases above and
fails this one:

::: compare

```carve
- a

  para
  {.x}
  - b
```

```html
<ul>
  <li><p>a</p>
    <p>para</p>
    <ul class="x">
      <li>b</li>
    </ul>
  </li>
</ul>
```

:::

A line that merely ENDS in a brace is a paragraph, not a second attribute block:
the first block attaches to that paragraph, the text survives, and the nested
list below it is left plain:

::: compare

```carve
- a

  {.x}
  more text}
  - b
```

```html
<ul>
  <li><p>a</p>
    <p class="x">more text}</p>
    <ul>
      <li>b</li>
    </ul>
  </li>
</ul>
```

:::

The braces may establish an authored block base past the canonical column. The
attribute remains structural and attaches to the nested list that follows at
the same authored base:

::: compare

```carve
- a

   {.c}
   - b
```

```html
<ul>
  <li>a
    <ul class="c">
      <li>b</li>
    </ul>
  </li>
</ul>
```

:::

None of this touches the abutting form, which is a different mechanism reaching
a different element: a block glued to the marker attributes the `<li>` (PART 9
§15), at any depth. `90-list-item-attributes` pins it at top level; nested, the
class lands on the item and the nested `<ul>` stays plain:

::: compare

```carve
- a

  -{.x} b
```

```html
<ul>
  <li>a
    <ul>
      <li class="x">b</li>
    </ul>
  </li>
</ul>
```

:::
