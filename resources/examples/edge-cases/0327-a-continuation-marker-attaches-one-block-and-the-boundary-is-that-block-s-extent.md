## A continuation marker attaches one block, and the boundary is that block's extent

§17 L3 says it in capitals: a `+` attaches "the FOLLOWING flush-left block to
that container — ONE block of ANY kind". The trailing "up to the next blank line,
sibling marker, or a further `+`" is the **extent** of that one block, not a
count — an attached list, quote or fenced block is many lines long and still one
block (markup-carve/carve#1290).

So a marker takes the paragraph and leaves the quote below it outside the item:

::: compare

```carve
- a
+
para
> q
```

```html
<ul>
  <li>a
    para
  </li>
</ul>
<blockquote><p>q</p></blockquote>
```

:::

A second attached block takes a second marker. This spelling already produces
identical output in all three engines, so one block costs a marker line and no
expressiveness:

::: compare

```carve
- a
+
para
+
> q
```

```html
<ul>
  <li>a
    para
    <blockquote><p>q</p></blockquote>
  </li>
</ul>
```

:::

The one block may be many lines. A wrapped paragraph is not cut at its first
line, and the quote below it is still outside:

::: compare

```carve
- a
+
p1
p2
> q
```

```html
<ul>
  <li>a
    p1
p2
  </li>
</ul>
<blockquote><p>q</p></blockquote>
```

:::

An attached LIST is one block too, however many items it holds — the extent
clause is what carries them in:

::: compare

```carve
- a
+
> x
> y
- next
```

```html
<ul>
  <li>a
    <blockquote><p>x
y</p></blockquote>
  </li>
  <li>next</li>
</ul>
```

:::

A same-column list marker leaves the `+` as text in the preceding item's
paragraph. The following item is a sibling:

::: compare

```carve
- a
+
- x
- y
```

```html
<ul>
  <li>a
+</li>
  <li>x</li>
  <li>y</li>
</ul>
```

:::

The first-block form counts the same way. `- +` opens an item whose body is the
one block that follows, and a second block needs its own marker:

::: compare

```carve
- +
para
> q
```

```html
<ul>
  <li>para</li>
</ul>
<blockquote><p>q</p></blockquote>
```

:::

::: compare

```carve
- +
para
+
> q
```

```html
<ul>
  <li>para
    <blockquote><p>q</p></blockquote>
  </li>
</ul>
```

:::

The block-quote form counts the same way. `> quoted` / `+` / `para` / `# H`
attaches the paragraph and leaves the heading outside the quote:

::: compare

```carve
> quoted
+
para
# H
```

```html
<blockquote>
  <p>quoted</p>
  <p>para</p>
</blockquote>
<section id="H">
  <h1>H</h1>
</section>
```

:::

And a second marker brings it in, exactly as in the list form:

::: compare

```carve
> quoted
+
para
+
# H
```

```html
<blockquote>
  <p>quoted</p>
  <p>para</p>
  <h1 id="H">H</h1>
</blockquote>
```

:::
