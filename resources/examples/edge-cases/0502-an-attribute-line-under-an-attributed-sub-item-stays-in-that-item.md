## An attribute line under an attributed sub-item stays in that item

A marker-attached attribute block contributes zero to the content column (§24
C3), so a line below it reaches the sub-item at the column it would reach with
no such block. A sibling marker closes that item and §15 A4 drops the pending
attribute, which may no more open a second sublist than escape to a document
paragraph (CARVE-P0-008).

:::::: compare no-render

```carve
- a
  -{#p} b
    {#x}
  - c
```

```html
<ul>
  <li>a
    <ul>
      <li id="p">b</li>
      <li>c</li>
    </ul>
  </li>
</ul>
```

::::::

Dropping `{#p}` is the control: the reading is the same one, so the attribute
block is what an engine splitting the sublist has read as width.

:::::: compare

```carve
- a
  - b
    {#x}
  - c
```

```html
<ul>
  <li>a
    <ul>
      <li>b</li>
      <li>c</li>
    </ul>
  </li>
</ul>
```

::::::

An ordered sub-item puts the same line at column 5, since `1.` is three columns
of marker and the attribute block is still none.

:::::: compare no-render

```carve
- a
  1.{#p} b
     {#x}
  2. c
```

```html
<ul>
  <li>a
    <ol>
      <li id="p">b</li>
      <li>c</li>
    </ol>
  </li>
</ul>
```

::::::
