## A floating attribute does not widen a list item's content column

Marker-attached attributes are metadata with zero column width. The heading in
each of these first three cases is therefore exactly at the item's content
column and remains inside it; the marker-line floating attribute attaches to
that heading (PART 1 S4, PART 9 §15 A4, PART 9 §24 C3; carve-rs#1373).

::: compare

```carve
-{#k} {#h}
  # h
```

```html
<ul>
  <li id="k">
    <h1 id="h">h</h1>
  </li>
</ul>
```

:::

::: compare

```carve
1.{#k} {#h}
   # h
```

```html
<ol>
  <li id="k">
    <h1 id="h">h</h1>
  </li>
</ol>
```

:::

::: compare

```carve
-{#k} [x] {#h}
  # h
```

```html
<ul class="task-list">
  <li data-task-state="x" id="k"><input type="checkbox" checked disabled> 
    <h1 id="h">h</h1>
  </li>
</ul>
```

:::

Moving the continuation one column left puts it genuinely below the content
column. Because a floating attribute opens no paragraph, the item closes, the
attribute is dropped at its scope boundary, and the heading-shaped residue is
literal top-level paragraph text. Ordinary marker-line text is the control: it
does open a paragraph, so the same below-column line lazily continues it.

::: compare

```carve
-{#k} {#h}
 # h
```

```html
<ul>
  <li id="k"></li>
</ul>
<section id="h">
  <h1>h</h1>
</section>
```

:::

::: compare

```carve
-{#k} text
 # h
```

```html
<ul>
  <li id="k">text</li>
</ul>
<section id="h">
  <h1>h</h1>
</section>
```

:::

::: compare

```carve
1.{#k} {#h}
  # h
```

```html
<ol>
  <li id="k"></li>
</ol>
<section id="h">
  <h1>h</h1>
</section>
```

:::

::: compare

```carve
-{#k} [x] {#h}
 # h
```

```html
<ul class="task-list">
  <li data-task-state="x" id="k"><input type="checkbox" checked disabled> </li>
</ul>
<section id="h">
  <h1>h</h1>
</section>
```

:::
