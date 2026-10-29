## A comment or a definition under a definition term folds at every depth

A term has no content column (CARVE-P2-028), and that holds for the invisible
lines too. Past the column of the container that holds the list, a comment
stays a comment and the term goes on after it; a `%%%` fence keeps its body.

:::::: compare

```carve
:: c
  %% note
  more
```

```html
<dl>
  <dt>c</dt>
</dl>
<p>more</p>
```

::::::

:::::: compare

```carve
> :: c
>   %% note
>   more
```

```html
<blockquote>
  <dl>
    <dt>c</dt>
  </dl>
  <p>more</p>
</blockquote>
```

::::::

:::::: compare

```carve
- item

  :: c
    %% note
    more
```

```html
<ul>
  <li>item
    <dl>
      <dt>c</dt>
    </dl>
    more
  </li>
</ul>
```

::::::

:::::: compare

```carve
:: a
: b
  :: c
    %% note
    more
```

```html
<dl>
  <dt>a</dt>
  <dd>
    <p>b</p>
    <dl>
      <dt>c</dt>
    </dl>
    <p>more</p>
  </dd>
</dl>
```

::::::

A comment fence keeps its body and closer, and the term goes on after it.

:::::: compare

```carve
:: c
  %%%
  hidden
  %%%
  more
```

```html
<dl>
  <dt>c</dt>
</dl>
<p>more</p>
```

::::::

:::::: compare

```carve
> :: c
>   %%%
>   hidden
>   %%%
>   more
```

```html
<blockquote>
  <dl>
    <dt>c</dt>
  </dl>
  <p>more</p>
</blockquote>
```

::::::

:::::: compare

```carve
- item

  :: c
    %%%
    hidden
    %%%
    more
```

```html
<ul>
  <li>item
    <dl>
      <dt>c</dt>
    </dl>
    more
  </li>
</ul>
```

::::::

:::::: compare

```carve
:: a
: b
  :: c
    %%%
    hidden
    %%%
    more
```

```html
<dl>
  <dt>a</dt>
  <dd>
    <p>b</p>
    <dl>
      <dt>c</dt>
    </dl>
    <p>more</p>
  </dd>
</dl>
```

::::::

A link definition past the column is term text, so the reference above it
stays unresolved.

:::::: compare

```carve
[t][r]

:: c
  [r]: /u
```

```html
<p><a href="/u">t</a></p>
<dl>
  <dt>c</dt>
</dl>
```

::::::

:::::: compare

```carve
[t][r]

> :: c
>   [r]: /u
```

```html
<p><a href="/u">t</a></p>
<blockquote>
  <dl>
    <dt>c</dt>
  </dl>
</blockquote>
```

::::::

:::::: compare

```carve
[t][r]

- item

  :: c
    [r]: /u
```

```html
<p><a href="/u">t</a></p>
<ul>
  <li>item
    <dl>
      <dt>c</dt>
    </dl>
  </li>
</ul>
```

::::::

:::::: compare

```carve
[t][r]

:: a
: b
  :: c
    [r]: /u
```

```html
<p><a href="/u">t</a></p>
<dl>
  <dt>a</dt>
  <dd>
    <p>b</p>
    <dl>
      <dt>c</dt>
    </dl>
  </dd>
</dl>
```

::::::

A footnote definition past the column is term text as well.

:::::: compare

```carve
x[^n]

:: c
  [^n]: y
```

```html
<p>x<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<dl>
  <dt>c</dt>
</dl>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>y<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

::::::

:::::: compare

```carve
x[^n]

> :: c
>   [^n]: y
```

```html
<p>x<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<blockquote>
  <dl>
    <dt>c</dt>
  </dl>
</blockquote>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>y<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

::::::

:::::: compare

```carve
x[^n]

- item

  :: c
    [^n]: y
```

```html
<p>x<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<ul>
  <li>item
    <dl>
      <dt>c</dt>
    </dl>
  </li>
</ul>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>y<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

::::::

:::::: compare

```carve
x[^n]

:: a
: b
  :: c
    [^n]: y
```

```html
<p>x<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<dl>
  <dt>a</dt>
  <dd>
    <p>b</p>
    <dl>
      <dt>c</dt>
    </dl>
  </dd>
</dl>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>y<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

::::::

At the container's column a comment ends the term.

:::::: compare

```carve
:: c
%% note
more
```

```html
<dl>
  <dt>c</dt>
</dl>
<p>more</p>
```

::::::

:::::: compare

```carve
:: a
: b
  :: c
  %% note
  more
```

```html
<dl>
  <dt>a</dt>
  <dd>
    <p>b</p>
    <dl>
      <dt>c</dt>
    </dl>
    <p>more</p>
  </dd>
</dl>
```

::::::

At the container's column a definition ends the term and registers.

:::::: compare

```carve
[t][r]

:: a
: b
  :: c
  [r]: /u
```

```html
<p><a href="/u">t</a></p>
<dl>
  <dt>a</dt>
  <dd>
    <p>b</p>
    <dl>
      <dt>c</dt>
    </dl>
  </dd>
</dl>
```

::::::

:::::: compare

```carve
x[^n]

- item

  :: c
  [^n]: y
```

```html
<p>x<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<ul>
  <li>item
    <dl>
      <dt>c</dt>
    </dl>
  </li>
</ul>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>y<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

::::::

A comment fence's body is opaque, so a `::` inside it opens no term, and
the definition after the fence registers past the description's column.

:::::: compare

```carve
[t][r]

:: a
: b
  %%%
  :: fake
    %%%
    [r]: /u
```

```html
<p><a href="/u">t</a></p>
<dl>
  <dt>a</dt>
  <dd>b</dd>
</dl>
```

::::::

A blank line inside a folded comment fence does not end the term.

:::::: compare

```carve
[t][r]

:: a
: b
  :: c
    %%%

    hidden
    %%%
    [r]: /u
```

```html
<p><a href="/u">t</a></p>
<dl>
  <dt>a</dt>
  <dd>
    <p>b</p>
    <dl>
      <dt>c</dt>
    </dl>
  </dd>
</dl>
```

::::::

A term on a list marker line is measured against the item's content column.

:::::: compare

```carve
- :: c
    # H
```

```html
<ul>
  <li>
    <dl>
      <dt>c</dt>
    </dl>
    <h1 id="H">H</h1>
  </li>
</ul>
```

::::::

:::::: compare

```carve
x[^n]

- :: c
    %% note
    [^n]: y
```

```html
<p>x<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<ul>
  <li>
    <dl>
      <dt>c</dt>
    </dl>
  </li>
</ul>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>y<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

::::::

A `>` past the column is term text, so the term stays open under it.

:::::: compare

```carve
[t][r]

:: a
: b
  :: c
    > text
    [r]: /u
```

```html
<p><a href="/u">t</a></p>
<dl>
  <dt>a</dt>
  <dd>
    <p>b</p>
    <dl>
      <dt>c</dt>
    </dl>
    <blockquote><p>text</p></blockquote>
  </dd>
</dl>
```

::::::
