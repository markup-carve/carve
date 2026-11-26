## A leading escaped caret keeps its escape

PART 11 §5's unconditional caret reaches the LEADING position and stops there
(§10g). Here the escape is load-bearing under §2's own test: drop it and the
image is promoted to a `figure` with the line as its caption, so the writer
emits it back unchanged. This is the shape the empty caret pair (category 388)
must not be read as reaching - there the caret leads nothing, dropping the
escape re-derives the same document, and the bare form is canonical.

::: compare

```carve
![a](b.png)
\^ not a caption
```

```html
<p><img src="b.png" alt="a">
^ not a caption</p>
```

:::
