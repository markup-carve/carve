---
page: edge-lists
---

## A line that ends a span in an item's description leaves the item's paragraph open

A term on an item's marker line opens its entry at the item's content column, so a `: ` line there is its description and a fence in that description is owned at the description's body column. A text line at the item's column misses that column, so it ends the span or code block and the description, and opens a paragraph in the item. An unmarked line after it continues that paragraph lazily, at any quote depth and behind any number of markers (PART 0 S1, S3, S4, carve#5969). Without the item the paragraph is the quote's own, as carve#5886 decides.

::: compare

```carve
> > - :: t
> >   : [^n]: a
> >     %%%
> >   z
plain

x[^n]
```

```html
<blockquote>
  <blockquote>
    <ul>
      <li>
        <dl>
          <dt>t</dt>
          <dd></dd>
        </dl>
        z
plain
      </li>
    </ul>
  </blockquote>
</blockquote>
<p>x<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>a<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

::: compare

```carve
> - :: t
>   : [^n]: a
>     %%%
>   z
plain

x[^n]
```

```html
<blockquote>
  <ul>
    <li>
      <dl>
        <dt>t</dt>
        <dd></dd>
      </dl>
      z
plain
    </li>
  </ul>
</blockquote>
<p>x<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>a<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

::: compare

```carve
> > - :: t
> >   : d
> >     %%%
> >   z
plain
```

```html
<blockquote>
  <blockquote>
    <ul>
      <li>
        <dl>
          <dt>t</dt>
          <dd>d</dd>
        </dl>
        z
plain
      </li>
    </ul>
  </blockquote>
</blockquote>
```

:::

::: compare

```carve
> - - :: t
>     : d
>       %%%
>     z
plain
```

```html
<blockquote>
  <ul>
    <li>
      <ul>
        <li>
          <dl>
            <dt>t</dt>
            <dd>d</dd>
          </dl>
          z
plain
        </li>
      </ul>
    </li>
  </ul>
</blockquote>
```

:::

::: compare

````carve
> > - :: t
> >   : d
> >     ```
> >   z
plain
````

````html
<blockquote>
  <blockquote>
    <ul>
      <li>
        <dl>
          <dt>t</dt>
          <dd>
            <p>d</p>
            <pre><code></code></pre>
          </dd>
        </dl>
        z
plain
      </li>
    </ul>
  </blockquote>
</blockquote>
````

:::

::: compare

```carve
> > :: t
> > : [^n]: a
> >   %%%
> > z
plain

x[^n]
```

```html
<blockquote>
  <blockquote>
    <dl>
      <dt>t</dt>
      <dd></dd>
    </dl>
    <p>z
plain</p>
  </blockquote>
</blockquote>
<p>x<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>a<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::
