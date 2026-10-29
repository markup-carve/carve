## A line is read in the container whose column it reaches

A marker at the item column opens a list (PART 0 O2).
:::::: compare

````carve
- :: t
  : para
  - li
````

```html
<ul>
  <li>
    <dl>
      <dt>t</dt>
      <dd>para</dd>
    </dl>
    <ul>
      <li>li</li>
    </ul>
  </li>
</ul>
```

::::::

A marked quoted continuation keeps its claim (PART 0 X1).
:::::: compare

````carve
- > para
  > more
%% c
x
````

```html
<ul>
  <li>
    <blockquote><p>para
more</p></blockquote>
  </li>
</ul>
<p>x</p>
```

::::::

A note on a description marker line keeps its body column, two past where it is written (DEFINITION EXTENT).
:::::: compare

````carve
x[^c]

:: t
: [^c]: para
    # H
````

```html
<p>x<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<dl>
  <dt>t</dt>
  <dd></dd>
</dl>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>para</p>
      <h1 id="H">H</h1>
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

::::::

A footnote body takes a lazy line like every container (markup-carve/carve#3885), so the column-zero line folds into the unreferenced note:
:::::: compare

````carve
:: t
: - para
    [^p]: n
x
````

```html
<dl>
  <dt>t</dt>
  <dd>
    <ul>
      <li>para</li>
    </ul>
  </dd>
</dl>
```

::::::

A marker below every content column folds into the item (PART 9 §24 C3).
:::::: compare

````carve
:: t
: - para
 - li
````

```html
<dl>
  <dt>t</dt>
  <dd>
    <ul>
      <li>para
- li</li>
    </ul>
  </dd>
</dl>
```

::::::

An opener past the note body and below the item opens in the note (CARVE-P0-004).
:::::: compare

````carve
[r][] [^p] [^c]
[^c]: - para
   # H
````

```html
<p>[r][] [^p] <a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <ul>
        <li>para</li>
      </ul>
      <h1 id="H">H</h1>
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

::::::

A marker below the description body column opens a sibling list when it reaches the item's content column (CARVE-P9-083).
:::::: compare

````carve
- :: t
  : para
   - li
````

```html
<ul>
  <li>
    <dl>
      <dt>t</dt>
      <dd>para</dd>
    </dl>
    <ul>
      <li>li</li>
    </ul>
  </li>
</ul>
```

::::::

A lazy quoted continuation keeps its existing claim (CARVE-P0-010).
:::::: compare

````carve
- > a
  b
 [r]: /u
````

```html
<ul>
  <li>
    <blockquote><p>a
b</p></blockquote>
  </li>
</ul>
```

::::::

An unmarked, unclosed fence line interrupts a quoted term: it ends the quote and opens at document level.
:::::: compare

````carve
> :: t
```
````

```html
<blockquote>
  <dl>
    <dt>t</dt>
  </dl>
</blockquote>
<pre><code></code></pre>
```

::::::

A retained description reads the next unclosed fence as a code block (CARVE-P0-011).
:::::: compare

````carve
- :: t
  : para
 %% c
```
````

```html
<ul>
  <li>
    <dl>
      <dt>t</dt>
      <dd>para</dd>
    </dl>
  </li>
</ul>
<pre><code></code></pre>
```

::::::

A lazy line keeps the quoted paragraph open for the next line (CARVE-P0-015).
:::::: compare

````carve
- > a
  > b
 [r]: /u
x
````

```html
<ul>
  <li>
    <blockquote><p>a
b</p></blockquote>
  </li>
</ul>
<p>x</p>
```

::::::

A footnote body takes a lazy line like every container (markup-carve/carve#3885), so `tail[^f]` joins the note's paragraph. The note is then referenced only from inside itself and renders nothing.
:::::: compare

````carve
- > para
  > [^f]: n
  >   - sub
tail[^f]
````

```html
<ul>
  <li>
    <blockquote><p>para</p></blockquote>
  </li>
</ul>
```

::::::

A retained code block leaves no paragraph, so the next column-0 line reaches the document (CARVE-P0-013).
:::::: compare

````carve
1. :: t
   : para
%% c
```
x
````

```html
<ol>
  <li>
    <dl>
      <dt>t</dt>
      <dd>para</dd>
    </dl>
  </li>
</ol>
<pre><code>x
</code></pre>
```

::::::

An opener below a description body's column folds into a quote held there; only the body column opens (CARVE-P0-021).
:::::: compare

````carve
:: t
: > para
 # H
````

```html
<dl>
  <dt>t</dt>
  <dd>
    <blockquote><p>para</p></blockquote>
  </dd>
</dl>
<section id="H">
  <h1>H</h1>
</section>
```

::::::

A heading below a description body's column folds into its paragraph, as under a list item (carve#3295).
:::::: compare

````carve
:: t
: para
 # H
````

```html
<dl>
  <dt>t</dt>
  <dd>para</dd>
</dl>
<section id="H">
  <h1>H</h1>
</section>
```

::::::

A thematic break below a description body's column folds into its paragraph (carve#3295).
:::::: compare

````carve
:: t
: para
 ---
````

```html
<dl>
  <dt>t</dt>
  <dd>para</dd>
</dl>
<hr>
```

::::::

A table row below a description body's column folds into its paragraph (carve#3295).
:::::: compare

````carve
:: t
: para
 | a |
````

```html
<dl>
  <dt>t</dt>
  <dd>para</dd>
</dl>
<table>
  <tbody>
    <tr><td>a</td></tr>
  </tbody>
</table>
```

::::::

The `+` at the description marker column attaches the next paragraph to that description. The quote past the item column then opens in the item (CARVE-P9-031, markup-carve/carve#3421).
:::::: compare

````carve
- :: term
  : body
  +
  before
   > nested
````

```html
<ul>
  <li>
    <dl>
      <dt>term</dt>
      <dd>
        <p>body</p>
        <p>before</p>
      </dd>
    </dl>
    <blockquote><p>nested</p></blockquote>
  </li>
</ul>
```

::::::

A caption line below a description body's column folds into its paragraph as text (PART 9 §10 I7).
:::::: compare

````carve
:: t
: para
^ cap
````

```html
<dl>
  <dt>t</dt>
  <dd>para
^ cap</dd>
</dl>
```

::::::

A caption line below a description body's column folds into a quoted paragraph there as text, as under a list item (PART 9 §10 I7).
:::::: compare

````carve
:: t
: > para
^ cap
````

```html
<dl>
  <dt>t</dt>
  <dd>
    <blockquote><p>para
^ cap</p></blockquote>
  </dd>
</dl>
```

::::::

A comment-retained list item reads an unclosed fence as a code block, and its unprefixed payload leaves the item (carve#3285).
:::::: compare

````carve
- para
%% c
```
x
````

```html
<ul>
  <li>para</li>
</ul>
<pre><code>x
</code></pre>
```

::::::

A note in a comment-retained list item reads an unclosed fence as a code block too (carve#3285).
:::::: compare

````carve
- ::: note
  more
 %% c
```
````

```html
<ul>
  <li>
    <aside class="admonition note" aria-label="Note">
      <p>more</p>
    </aside>
  </li>
</ul>
<pre><code></code></pre>
```

::::::

After a quoted paragraph, the retained code block still leaves no paragraph, so `x` reaches the document (carve#3285).
:::::: compare

````carve
- > para
  > more
%% c
```
x
````

```html
<ul>
  <li>
    <blockquote><p>para
more</p></blockquote>
  </li>
</ul>
<pre><code>x
</code></pre>
```

::::::

A blank line inside a retained code block does not loosen the item (carve#3285).
:::::: compare

````carve
- para
%% c
```
  x

  y
````

```html
<ul>
  <li>para</li>
</ul>
<pre><code>  x

  y
</code></pre>
```

::::::

After a marked quote line, a matched comment fence below the item column retains the item as a comment line does (CARVE-P9-053).
:::::: compare

````carve
- > para
  > more
 %%%
 %%%
```
````

```html
<ul>
  <li>
    <blockquote><p>para
more</p></blockquote>
  </li>
</ul>
<pre><code></code></pre>
```

::::::

A quote in a note on a description marker line holds the deepest open paragraph, so a column-0 line folds into it (PART 0 S4, markup-carve/carve#3885).
:::::: compare

````carve
x[^c]

:: t
: [^c]: para
     > q
tail
````

```html
<p>x<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<dl>
  <dt>t</dt>
  <dd></dd>
</dl>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>para</p>
      <blockquote><p>q
tail</p></blockquote>
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

::::::
