## A line past a body's column is read in the body, and a quote does not rebase

A list-shaped line under a description body's open paragraph folds into it
(PART 9 §10 I2) and opens no item, so a definition past the body's content
column is read in the body: it registers and ends the paragraph
(CARVE-P0-020, ruled on carve#3279). With no paragraph left open, `x` is a
document paragraph (CARVE-P0-011):
:::::: compare

````carve
:: t
: d
  - para
    [r]: /u
x

[r][]
````

```html
<dl>
  <dt>t</dt>
  <dd>d
- para</dd>
</dl>
<p>x</p>
<p><a href="/u">r</a></p>
```

::::::

An ordered marker folds the same way:
:::::: compare

````carve
:: t
: d
  1. para
     [r]: /u
x

[r][]
````

```html
<dl>
  <dt>t</dt>
  <dd>d
1. para</dd>
</dl>
<p>x</p>
<p><a href="/u">r</a></p>
```

::::::

A footnote body is the same host:
:::::: compare

````carve
[^n]: d
  - para
    [r]: /u
x

[r][] [^n]
````

```html
<p>x</p>
<p><a href="/u">r</a> <a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>d
- para<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

::::::

A line at the body's column after the definition opens the body's second
paragraph:
:::::: compare

````carve
:: t
: d
  - para
    [r]: /u
  more

[r][]
````

```html
<dl>
  <dt>t</dt>
  <dd>
    <p>d
- para</p>
    <p>more</p>
  </dd>
</dl>
<p><a href="/u">r</a></p>
```

::::::

A heading past the body's column opens on its authored base
(CARVE-P0-004), and `x` leaves the body (CARVE-P0-012):
:::::: compare

````carve
:: t
: d
  - para
    # H
x
````

```html
<dl>
  <dt>t</dt>
  <dd>
    <p>d
- para</p>
    <h1 id="H">H</h1>
  </dd>
</dl>
<p>x</p>
```

::::::

An attribute line past the column closes the paragraph and attaches
nothing:
:::::: compare

````carve
:: t
: d
  - para
    {#k}
x
````

```html
<dl>
  <dt>t</dt>
  <dd>d
- para</dd>
</dl>
<p>x</p>
```

::::::

An abbreviation definition is recognized only at document level
(CARVE-P12-026), so it stays paragraph text and `x` folds:
:::::: compare

````carve
:: t
: d
  - para
    *[A]: b
x
````

```html
<dl>
  <dt>t</dt>
  <dd>d
- para
*[A]: b
x</dd>
</dl>
```

::::::

A block quote does not rebase (CARVE-P0-004), so a definition one column
past the quote marker is paragraph text. It registers nothing, and the quoted
paragraph stays open for `tail` (carve#3280):
:::::: compare

````carve
- > para
  >  [r]: /u
tail

[r][]
````

```html
<ul>
  <li>
    <blockquote><p>para</p></blockquote>
  </li>
</ul>
<p>tail</p>
<p><a href="/u">r</a></p>
```

::::::

The footnote spelling is text as well:

A footnote body takes a lazy line like every container (markup-carve/carve#3885), so the unmarked line below folds into the note:
:::::: compare

````carve
- > para
  >  [^f]: n
tail
````

```html
<ul>
  <li>
    <blockquote><p>para</p></blockquote>
  </li>
</ul>
```

::::::

So is an attribute line:
:::::: compare

````carve
- > para
  >  {#x}
tail
````

```html
<ul>
  <li>
    <blockquote><p>para</p></blockquote>
  </li>
</ul>
<p>tail</p>
```

::::::

Inside an outer quote the inner quote's paragraph still takes `tail`:
:::::: compare

````carve
> - > para
>   >  [r]: /u
tail

[r][]
````

```html
<blockquote>
  <ul>
    <li>
      <blockquote><p>para</p></blockquote>
    </li>
  </ul>
</blockquote>
<p>tail</p>
<p><a href="/u">r</a></p>
```

::::::

At a quoted description body's content column a definition leaves no
paragraph open (CARVE-P0-011), so the unmarked `tail` leaves the quote:
:::::: compare

````carve
> :: t
> : d
>   [r]: /u
tail
````

```html
<blockquote>
  <dl>
    <dt>t</dt>
    <dd>d</dd>
  </dl>
</blockquote>
<p>tail</p>
```

::::::

An attribute line there does the same:
:::::: compare

````carve
> :: t
> : d
>   {#x}
tail
````

```html
<blockquote>
  <dl>
    <dt>t</dt>
    <dd>d</dd>
  </dl>
</blockquote>
<p>tail</p>
```

::::::

So does a heading (CARVE-P0-012):
:::::: compare

````carve
> :: t
> : d
>   # H
tail
````

```html
<blockquote>
  <dl>
    <dt>t</dt>
    <dd>
      <p>d</p>
      <h1 id="H">H</h1>
    </dd>
  </dl>
</blockquote>
<p>tail</p>
```

::::::
