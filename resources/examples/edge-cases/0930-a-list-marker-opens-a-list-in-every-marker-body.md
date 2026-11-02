---
page: edge-lists
---

## A list marker opens a list in every marker body

PART 0 S3 and S4, PART 9 §10 I2 and §24 C3 (markup-carve/carve#4860). In a list item, description body or footnote body a list marker at or past the content column opens a list and ends the open paragraph, a deeper paragraph included. One that misses a body closes it with every frame it missed. Paragraphs of the document and of quotes keep the marker as text.

::: compare

```carve
:: t
: d
  - x
  - y
```

```html
<dl>
  <dt>t</dt>
  <dd>
    <p>d</p>
    <ul>
      <li>x</li>
      <li>y</li>
    </ul>
  </dd>
</dl>
```

:::

::: compare

```carve
[^a]: n
  - x

q[^a]
```

```html
<p>q<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>n</p>
      <ul>
        <li>x</li>
      </ul>
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

::: compare

```carve
- [^q]: note
  * child

r[^q]
```

```html
<ul>
  <li>
    <ul>
      <li>child</li>
    </ul>
  </li>
</ul>
<p>r<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
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

::: compare

```carve
[^a]: n
- x

q[^a]
```

```html
<ul>
  <li>x</li>
</ul>
<p>q<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>n<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

::: compare

```carve
:: t
: d
- x
```

```html
<dl>
  <dt>t</dt>
  <dd>d</dd>
</dl>
<ul>
  <li>x</li>
</ul>
```

:::

::: compare

```carve
> p
> - x
```

```html
<blockquote><p>p
- x</p></blockquote>
```

:::

::: compare

```carve
- > p
  - x
```

```html
<ul>
  <li>
    <blockquote><p>p</p></blockquote>
    <ul>
      <li>x</li>
    </ul>
  </li>
</ul>
```

:::

::: compare

```carve
> [^a]: n
- x

q[^a]
```

```html
<blockquote>

</blockquote>
<ul>
  <li>x</li>
</ul>
<p>q<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>n<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

::: compare

```carve
> > :: t
> > : d
- x
```

```html
<blockquote>
  <blockquote>
    <dl>
      <dt>t</dt>
      <dd>d</dd>
    </dl>
  </blockquote>
</blockquote>
<ul>
  <li>x</li>
</ul>
```

:::

::: compare

```carve
:: t
: d
  1. x
  2. y
```

```html
<dl>
  <dt>t</dt>
  <dd>
    <p>d</p>
    <ol>
      <li>x</li>
      <li>y</li>
    </ol>
  </dd>
</dl>
```

:::

::: compare

```carve
:: t
: > p
  - x
```

```html
<dl>
  <dt>t</dt>
  <dd>
    <blockquote><p>p</p></blockquote>
    <ul>
      <li>x</li>
    </ul>
  </dd>
</dl>
```

:::

::: compare

```carve
> p
- x
```

```html
<blockquote><p>p
- x</p></blockquote>
```

:::
