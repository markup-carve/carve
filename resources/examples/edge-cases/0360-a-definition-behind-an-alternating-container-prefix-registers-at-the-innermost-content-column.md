## A definition behind an alternating container prefix registers at the innermost content column

Which container's `content_column` a line reaches is decided by PART 9 §24 C5's
dedent chain: every container strips its own prefix and hands the residue down,
so the question is asked of the innermost container in the coordinates it was
handed. The shape of the prefix above it - how many quotes and list items it
alternates, in what order, and how deep - is not a parameter, and a definition
at that column registers exactly as §10 I5 says (markup-carve/carve#1368).

::: compare

```carve
- > - - x
  >     [r]: /url

See [r][].
```

```html
<ul>
  <li>
    <blockquote>
      <ul>
        <li>
          <ul>
            <li>x</li>
          </ul>
        </li>
      </ul>
    </blockquote>
  </li>
</ul>
<p>See <a href="/url">r</a>.</p>
```

:::

The FOOTNOTE kind of the same shape, kept beside the link because a reader that
sorts definitions by kind can pass on the half it gets right.

::: compare

```carve
- > - - x
  >     [^f]: note

See [^f].
```

```html
<ul>
  <li>
    <blockquote>
      <ul>
        <li>
          <ul>
            <li>x</li>
          </ul>
        </li>
      </ul>
    </blockquote>
  </li>
</ul>
<p>See <a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a>.</p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>note<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

The COLUMN control: a heading written at that same column is a block inside the
innermost item. It says the line reaches the column, so a reader that declines
the definition there is answering about the line's spelling rather than about
its column - which §24 C3 refuses.

::: compare

```carve
- > - - x
  >     # h
```

```html
<ul>
  <li>
    <blockquote>
      <ul>
        <li>
          <ul>
            <li>x
              <h1 id="h">h</h1>
            </li>
          </ul>
        </li>
      </ul>
    </blockquote>
  </li>
</ul>
```

:::

The PEEL control: the same body with the outer list item removed, which is
precisely what C5 says that item hands down. Every implementation registers
here, so a reader that declines the first case answers one document two ways.

::: compare

```carve
> - - x
>     [r]: /url

See [r][].
```

```html
<blockquote>
  <ul>
    <li>
      <ul>
        <li>x</li>
      </ul>
    </li>
  </ul>
</blockquote>
<p>See <a href="/url">r</a>.</p>
```

:::
