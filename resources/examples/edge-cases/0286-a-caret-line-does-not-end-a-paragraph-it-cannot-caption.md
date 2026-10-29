## A caret line does not end a paragraph it cannot caption

PART 9 §10 I1 enumerates the lines that interrupt an open paragraph: a heading, a
thematic break, a block quote, a valid table row, a guarded fence opener and a
`:::` opener. I5 adds the invisible ones - a reference definition, a comment, a
block-attribute line. A `^ ` caption line is in neither list, so it does not
interrupt. What ends a paragraph at a caret is §4, and §4 reaches exactly five
captionable hosts; for the two it spells in prose that means a paragraph whose
WHOLE content is one image or one display-math span. Everywhere else the `^ `
line is ordinary paragraph text and folds in, caret and all.

`158-indented-image-and-caption-stay-literal` pins the INDENTED spelling, where
both readings agree because an indented line opens no top-level block at all. The
flush-left spelling was pinned nowhere, and the two readers in this repository
answered it differently: every engine folded the line in, the executable spec
ended the paragraph and opened a second one. Nothing failed while the canonical
writer force-escaped a line-initial caret. When that escape came off, the writer
was right and `oracle(fmt(x))` parted from `oracle(x)` on a document all three
engines agreed about (carve#1046).

A caret line after ordinary prose.

::: compare

```carve
Text
^ Figure 1: moon
```

```html
<p>Text
^ Figure 1: moon</p>
```

:::

A caret line after a paragraph that merely CONTAINS an image. The image is not
the whole paragraph, so no §4 host is present and the caret folds in behind it.

::: compare

```carve
Text
![Apollo](a.jpg)
^ Figure 1: moon
```

```html
<p>Text
<img src="a.jpg" alt="Apollo">
^ Figure 1: moon</p>
```

:::

§10 I6 applies the relation to every open paragraph, including one inside a
container, so a quoted caret line folds the same way.

::: compare

```carve
> Text
> ^ Figure 1: moon
```

```html
<blockquote><p>Text
^ Figure 1: moon</p></blockquote>
```

:::

Control - when the paragraph IS the image, §4 attaches and the pair is a figure.
`158-indented-image-and-caption-stay-literal-3` already pins this shape; it is
repeated here because the rule above is only half a claim without it. The
mutation that folds every caret line in leaves this row untouched, and a reader
that stopped attaching captions altogether - the opposite defect - fails here
and passes everything else in the section.

::: compare

```carve
![Apollo](a.jpg)
^ Figure 1: moon
```

```html
<figure>
  <img src="a.jpg" alt="Apollo">
  <figcaption>Figure 1: moon</figcaption>
</figure>
```

:::
