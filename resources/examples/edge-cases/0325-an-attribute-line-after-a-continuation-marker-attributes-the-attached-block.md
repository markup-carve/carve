## An attribute line after a continuation marker attributes the attached block

An attribute block attaches to the block that FOLLOWS it, and the target is that
block (carve#1238). Nothing in that rule exempts a `+` continuation marker, and
a continuation is exactly the case where the following block is inside the item:
PART 2 has `block = … | block_attributes | …` and PART 11's grammar has
`continuation_marker_block = continuation_marker, block`, so an attribute line is
itself a block the marker can attach, and PART 9 §15 gives it its float to the
next one.

An implementation that reads the line as ordinary text loses both halves at
once - the attributes AND the containment - because the run the marker opened
then ends at the text and the quote below it starts a new top-level block
(carve-rs#1020):

::: compare

```carve
- a
+
{.x}
> q
```

```html
<ul>
  <li>a
    <blockquote class="x"><p>q</p></blockquote>
  </li>
</ul>
```

:::

The control is the same document with the attribute line removed. The marker's
own job is unchanged by this rule, so the quote lands in the item either way and
only the class moves:

::: compare

```carve
- a
+
> q
```

```html
<ul>
  <li>a
    <blockquote><p>q</p></blockquote>
  </li>
</ul>
```

:::

A PARAGRAPH after the attribute line is the second half, and it fails
differently: an implementation that keeps the line as text has nowhere to put it
but the item's open lead paragraph, so the whole run folds into `a` and the
attributes vanish with the block boundary.

::: compare

```carve
- a
+
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

A second item pins the boundary the mis-parse moves. The attached quote belongs
to the first item, so `- c` is still a sibling of `- a` and not of anything the
attribute line produced:

::: compare

```carve
- a
+
{.x}
> q
- c
```

```html
<ul>
  <li>a
    <blockquote class="x"><p>q</p></blockquote>
  </li>
  <li>c</li>
</ul>
```

:::

A fenced block after the attribute line is the third target, and the one where
the fence body is at risk. The attribute line does not end the run the marker
opened, so the fence is still the attached block, and its body is code: a body
line that looks like a list item is not a sibling of `- a` (carve#1238):

::: compare

````carve
- a
+
{.x}
```
- x
code
```
````

```html
<ul>
  <li>a
    <pre class="x"><code>- x
code
</code></pre>
  </li>
</ul>
```

:::

The same holds under a definition. A `: x` body line is code, not a second
description:

::: compare

````carve
:: t
: d
+
{.x}
```
: x
```
````

```html
<dl>
  <dt>t</dt>
  <dd>
    <p>d</p>
    <pre class="x"><code>: x
</code></pre>
  </dd>
</dl>
```

:::

A marker written at a nested item's marker column continues that item
(carve#3421), and the attribute line does not move the owner. The fence lands
in the inner `li` with the class on it:

::: compare

````carve
- a
  - b
  +
  {.x}
  ```
  code
  ```
````

```html
<ul>
  <li>a
    <ul>
      <li>b
        <pre class="x"><code>code
</code></pre>
      </li>
    </ul>
  </li>
</ul>
```

:::

A `{table}` attribute line turns the `csv` fence after it into a table, and the
other attributes in the line go on that table:

::: compare

````carve
- a
+
{table .x}
```csv
a,b
1,2
```
````

```html
<ul>
  <li>a
    <table class="x">
      <thead>
        <tr><th scope="col">a</th><th scope="col">b</th></tr>
      </thead>
      <tbody>
        <tr><td>1</td><td>2</td></tr>
      </tbody>
    </table>
  </li>
</ul>
```

:::
