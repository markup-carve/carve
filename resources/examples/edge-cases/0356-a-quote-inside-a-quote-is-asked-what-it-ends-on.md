## A quote inside a quote is asked what it ends on

PART 1 S4 puts the question to a quote RECURSIVELY, and "recursively" has no
depth in it: an outer quote whose last block is an inner quote is answered by
what the INNER quote ends on. A heading ends it, so the flush-left line ends
both quotes (markup-carve/carve#1355).

::: compare

```carve
> > # H
tail
```

```html
<blockquote>
  <blockquote>
    <h1 id="H">H</h1>
  </blockquote>
</blockquote>
<p>tail</p>
```

:::

The ONE-LEVEL SPELLING is the control that makes this a contradiction rather
than a gap. It has always answered this way, and it is the same derivation:

::: compare

```carve
> # H
tail
```

```html
<blockquote>
  <h1 id="H">H</h1>
</blockquote>
<p>tail</p>
```

:::

A table answers alike, which is what says the rule is about the last block and
not about headings:

::: compare

```carve
> > | a |
> > | b |
tail
```

```html
<blockquote>
  <blockquote>
    <table>
      <tbody>
        <tr><td>a</td></tr>
        <tr><td>b</td></tr>
      </tbody>
    </table>
  </blockquote>
</blockquote>
<p>tail</p>
```

:::

So does a thematic break:

::: compare

```carve
> > ---
tail
```

```html
<blockquote>
  <blockquote>
    <hr>
  </blockquote>
</blockquote>
<p>tail</p>
```

:::

And an INVISIBLE block, which leaves nothing on the page for a lazy line to
continue and still ends the run:

::: compare

```carve
> > [r]: /u
tail

[r][]
```

```html
<blockquote>
  <blockquote>

  </blockquote>
</blockquote>
<p>tail</p>
<p><a href="/u">r</a></p>
```

:::

THREE DEEP IS THE SAME RULE, since nothing in it counts levels:

::: compare

```carve
> > > # H
tail
```

```html
<blockquote>
  <blockquote>
    <blockquote>
      <h1 id="H">H</h1>
    </blockquote>
  </blockquote>
</blockquote>
<p>tail</p>
```

:::

An earlier paragraph in the OUTER quote does not change the answer either - the
question is about the LAST block, and the last block is the inner quote:

::: compare

```carve
> a
> > # H
tail
```

```html
<blockquote>
  <p>a</p>
  <blockquote>
    <h1 id="H">H</h1>
  </blockquote>
</blockquote>
<p>tail</p>
```

:::

A TABLE ENDING ON A CONTINUATION ROW answers alike, and it is the shape that
says the question is asked with the inner quote's OWN line history rather than
of its last line alone: `+ b |` read on its own is prose (markup-carve/carve#1345),
and read under the row above it is the row that finishes the table
(§5 T6).

::: compare

```carve
> > | a |
> > + b |
tail
```

```html
<blockquote>
  <blockquote>
    <table>
      <tbody>
        <tr><td>a b</td></tr>
      </tbody>
    </table>
  </blockquote>
</blockquote>
<p>tail</p>
```

:::

The same at three levels, which is what says the history is carried per depth
rather than for one:

::: compare

```carve
> > > | a |
> > > + b |
tail
```

```html
<blockquote>
  <blockquote>
    <blockquote>
      <table>
        <tbody>
          <tr><td>a b</td></tr>
        </tbody>
      </table>
    </blockquote>
  </blockquote>
</blockquote>
<p>tail</p>
```

:::

THE FOLD IS UNCHANGED WHERE A PARAGRAPH IS OPEN, which is the half depth was
never a parameter of. These two are controls: they answered the same before
this rule and after it.

::: compare

```carve
> > a
tail
```

```html
<blockquote>
  <blockquote><p>a
tail</p></blockquote>
</blockquote>
```

:::

::: compare

```carve
> > # H
> > a
tail
```

```html
<blockquote>
  <blockquote>
    <h1 id="H">H</h1>
    <p>a
tail</p>
  </blockquote>
</blockquote>
```

:::

AND A RUN A LINE DOES NOT REACH HAS ENDED. A later quote at the same depth is a
NEW quote and inherits nothing from the one before it, so its first line is read
as what it is - here prose, which opens a paragraph the flush-left line folds
into. This is unanimous, and it is the near miss a reading that carried the
history without ending it would take:

::: compare

```carve
> > | a |
> # H
> > + b |
tail
```

```html
<blockquote>
  <blockquote>
    <table>
      <tbody>
        <tr><td>a</td></tr>
      </tbody>
    </table>
  </blockquote>
  <h1 id="H">H</h1>
  <blockquote><p>+ b |
tail</p></blockquote>
</blockquote>
```

:::
