## A definition or attribute line in a nested container leaves no paragraph for an unmarked line

A footnote definition is the exception in this section: its body holds the
note's own paragraph, and a footnote body takes a lazy line like every container
(markup-carve/carve#3885), so in the footnote rows the unmarked line folds into
the note.

A definition or attribute line at a sub-item's content column ends the
sub-item's paragraph and leaves none open anywhere in the stack
(CARVE-P0-010, CARVE-P0-011), so a line at document column 0 leaves the
list instead of folding into the outer item:
:::::: compare

````carve
- a
  - para
    [r]: /u
x
````

```html
<ul>
  <li>a
    <ul>
      <li>para</li>
    </ul>
  </li>
</ul>
<p>x</p>
```

::::::

An attribute line at that column does the same:
:::::: compare

````carve
- a
  - para
    {#x}
x
````

```html
<ul>
  <li>a
    <ul>
      <li>para</li>
    </ul>
  </li>
</ul>
<p>x</p>
```

::::::

A footnote body takes a lazy line like every container (markup-carve/carve#3885), so `x` folds into the note's paragraph:
:::::: compare

````carve
- a[^f]
  - para
    [^f]: n
      more
x
````

```html
<ul>
  <li>a<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a>
    <ul>
      <li>para</li>
    </ul>
  </li>
</ul>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>n
more
x<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

::::::

Inside a quote, a footnote definition at the item's content column leaves
no open paragraph either. The unmarked `tail` cannot be a lazy line, so it
leaves the quote:
:::::: compare

````carve
> - para
>   [^f]: n
tail
````

```html
<blockquote>
  <ul>
    <li>para</li>
  </ul>
</blockquote>
```

::::::

The same holds in a nested quote:
:::::: compare

````carve
> > - para
> >   [^f]: n
tail
````

```html
<blockquote>
  <blockquote>
    <ul>
      <li>para</li>
    </ul>
  </blockquote>
</blockquote>
```

::::::

An unclosed fence in place of `tail` opens at document level, under an
ordered item too:
:::::: compare

````carve
> 1. para
>    [^f]: n
```
code
````

```html
<blockquote>
  <ol>
    <li>para</li>
  </ol>
</blockquote>
<pre><code>code
</code></pre>
```

::::::

In a quoted definition body:
:::::: compare

````carve
> :: t
> : d
>   [^f]: n
tail
````

```html
<blockquote>
  <dl>
    <dt>t</dt>
    <dd>d</dd>
  </dl>
</blockquote>
```

::::::

Under a quoted sub-item the line reaches neither item's paragraph, since
the quote is reached only by its marker:
:::::: compare

````carve
> - a
>   - para
>     [^f]: n
tail
````

```html
<blockquote>
  <ul>
    <li>a
      <ul>
        <li>para</li>
      </ul>
    </li>
  </ul>
</blockquote>
```

::::::

A list marker leaves the quote too, and opens a list:
:::::: compare

````carve
> - para
>   [^f]: n
- tail
````

```html
<blockquote>
  <ul>
    <li>para</li>
  </ul>
</blockquote>
```

::::::

An attribute line at an ordered item's column in a quote ends it the same way:
:::::: compare

````carve
> 1. para
>    {#x}
tail
````

```html
<blockquote>
  <ol>
    <li>para</li>
  </ol>
</blockquote>
<p>tail</p>
```

::::::

With the quote inside an item, a column-0 line reaches the document past
both containers:
:::::: compare

````carve
- > - para
  >   [r]: /u
tail
````

```html
<ul>
  <li>
    <blockquote>
      <ul>
        <li>para</li>
      </ul>
    </blockquote>
  </li>
</ul>
<p>tail</p>
```

::::::

An attribute line in the same position:
:::::: compare

````carve
- > - para
  >   {#x}
tail
````

```html
<ul>
  <li>
    <blockquote>
      <ul>
        <li>para</li>
      </ul>
    </blockquote>
  </li>
</ul>
<p>tail</p>
```

::::::

A footnote definition under a quoted paragraph:
:::::: compare

````carve
- > para
  > [^f]: n
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

A line at the outer item's content column ends the quote and opens the
item's next paragraph:
:::::: compare

````carve
- > - para
  >   [^f]: n
  tail
````

```html
<ul>
  <li>
    <blockquote>
      <ul>
        <li>para</li>
      </ul>
    </blockquote>
  </li>
</ul>
```

::::::

An abbreviation definition inside a container is ordinary text
(CARVE-P12-026), so it keeps the paragraph open and `tail` folds:
:::::: compare

````carve
> - para
>   *[A]: b
tail
````

```html
<blockquote>
  <ul>
    <li>para
*[A]: b
tail</li>
  </ul>
</blockquote>
```

::::::
