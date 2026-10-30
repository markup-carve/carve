---
page: edge-lists
---

## A lazy line continues a quoted term only as plain text

A line that misses the term's quote or footnote body continues the term only as plain text. A list marker or a `: ` separator ends that container and is read as it would be without it (PART 0 `[B-term-keep]`, carve#4300).

:::: compare

``````carve
> - :: t
 - x
``````

```html
<blockquote>
  <ul>
    <li>
      <dl>
        <dt>t</dt>
      </dl>
    </li>
  </ul>
</blockquote>
<ul>
  <li>x</li>
</ul>
```

::::

:::: compare

``````carve
> - :: t
 1. x
``````

```html
<blockquote>
  <ul>
    <li>
      <dl>
        <dt>t</dt>
      </dl>
    </li>
  </ul>
</blockquote>
<ol>
  <li>x</li>
</ol>
```

::::

:::: compare

``````carve
> - :: t
  - x
``````

```html
<blockquote>
  <ul>
    <li>
      <dl>
        <dt>t</dt>
      </dl>
    </li>
  </ul>
</blockquote>
<ul>
  <li>x</li>
</ul>
```

::::

:::: compare

``````carve
> 1. :: t
 - x
``````

```html
<blockquote>
  <ol>
    <li>
      <dl>
        <dt>t</dt>
      </dl>
    </li>
  </ol>
</blockquote>
<ul>
  <li>x</li>
</ul>
```

::::

:::: compare

``````carve
> - [ ] :: t
 - x
``````

```html
<blockquote>
  <ul class="task-list">
    <li><input type="checkbox" disabled> 
      <dl>
        <dt>t</dt>
      </dl>
    </li>
  </ul>
</blockquote>
<ul>
  <li>x</li>
</ul>
```

::::

:::: compare

``````carve
> > - :: t
 - x
``````

```html
<blockquote>
  <blockquote>
    <ul>
      <li>
        <dl>
          <dt>t</dt>
        </dl>
      </li>
    </ul>
  </blockquote>
</blockquote>
<ul>
  <li>x</li>
</ul>
```

::::

:::: compare

``````carve
> - - :: t
 - x
``````

```html
<blockquote>
  <ul>
    <li>
      <ul>
        <li>
          <dl>
            <dt>t</dt>
          </dl>
        </li>
      </ul>
    </li>
  </ul>
</blockquote>
<ul>
  <li>x</li>
</ul>
```

::::

:::: compare

``````carve
> :: t
 - x
``````

```html
<blockquote>
  <dl>
    <dt>t</dt>
  </dl>
</blockquote>
<ul>
  <li>x</li>
</ul>
```

::::

:::: compare

``````carve
r[^n]

- [^n]: :: t
  - x
``````

```html
<p>r<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<ul>
  <li>
    <ul>
      <li>x</li>
    </ul>
  </li>
</ul>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <dl>
        <dt>t</dt>
      </dl>
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

::::

:::: compare

``````carve
r[^n]

> [^n]: :: t
- x
``````

```html
<p>r<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<blockquote>

</blockquote>
<ul>
  <li>x</li>
</ul>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <dl>
        <dt>t</dt>
      </dl>
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

::::

:::: compare

``````carve
> :: t
 : d
``````

```html
<blockquote>
  <dl>
    <dt>t</dt>
  </dl>
</blockquote>
<p>: d</p>
```

::::

:::: compare

``````carve
> > :: t
 : d
``````

```html
<blockquote>
  <blockquote>
    <dl>
      <dt>t</dt>
    </dl>
  </blockquote>
</blockquote>
<p>: d</p>
```

::::

:::: compare

``````carve
> > :: t
  : d
``````

```html
<blockquote>
  <blockquote>
    <dl>
      <dt>t</dt>
    </dl>
  </blockquote>
</blockquote>
<p>: d</p>
```

::::

:::: compare

``````carve
> :: t
 plain
``````

```html
<blockquote>
  <dl>
    <dt>t
plain</dt>
  </dl>
</blockquote>
```

::::

:::: compare

``````carve
> > :: t
 plain
``````

```html
<blockquote>
  <blockquote>
    <dl>
      <dt>t
plain</dt>
    </dl>
  </blockquote>
</blockquote>
```

::::
