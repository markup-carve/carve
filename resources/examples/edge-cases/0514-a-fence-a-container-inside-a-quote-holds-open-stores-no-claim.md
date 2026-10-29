## A fence a container inside a quote holds open stores no claim

`CARVE-P0-013` names no depth and no host, so *A fence in a quote stores no
continuation claim* answers the same way with a list item or a footnote body
between the quote and the fence. What changes is only where the fence is spelled:
at that container's content column rather than the quote's own.

The quote's tracker read a fence at column 0 and nothing else, so one container
in, the opener, its payload and its closer all read as ordinary text and the
unmarked line below kept a claim. The owner it kept then depended on depth - the
fence's payload one deep, a paragraph inside the quote two deep, the document
with no container in between. It is the document at every depth.

These documents place the opener at the host's content column. The same ownership
rule applies to shifted openers, covered in *A shifted fence in a quoted item
stores no continuation claim*. A fence-shaped run that remains paragraph text
still permits lazy continuation.

::: compare

`````carve
> - a
>
>   ```
>   x
flush
`````

`````html
<blockquote>
  <ul>
    <li>a
      <pre><code>x
</code></pre>
    </li>
  </ul>
</blockquote>
<p>flush</p>
`````

:::

::: compare

`````carve
> - a
>   - b
>
>     ```
>     x
flush
`````

`````html
<blockquote>
  <ul>
    <li>a
      <ul>
        <li>b
          <pre><code>x
</code></pre>
        </li>
      </ul>
    </li>
  </ul>
</blockquote>
<p>flush</p>
`````

:::

::: compare

`````carve
> - a
>
>   ```
>   x
>   ```
flush
`````

`````html
<blockquote>
  <ul>
    <li>a
      <pre><code>x
</code></pre>
    </li>
  </ul>
</blockquote>
<p>flush</p>
`````

:::

::: compare

`````carve
> - a
>   - b
>
>     ```
>     x
>     ```
flush
`````

`````html
<blockquote>
  <ul>
    <li>a
      <ul>
        <li>b
          <pre><code>x
</code></pre>
        </li>
      </ul>
    </li>
  </ul>
</blockquote>
<p>flush</p>
`````

:::

::: compare

`````carve
> - ```
>   x
flush
`````

`````html
<blockquote>
  <ul>
    <li>
      <pre><code>x
</code></pre>
    </li>
  </ul>
</blockquote>
<p>flush</p>
`````

:::

::: compare

`````carve
> [^f]: t
>
>   ```
>   x
flush
`````

`````html
<blockquote>

</blockquote>
<p>flush</p>
`````

:::

::: compare

`````carve
> - a
>
>   ```
>   x
>   ```
>
>   z
flush
`````

`````html
<blockquote>
  <ul>
    <li><p>a</p>
      <pre><code>x
</code></pre>
      <p>z
flush</p>
    </li>
  </ul>
</blockquote>
`````

:::

::: compare

`````carve
> > - a
> >
> >   ```
> >   x
flush
`````

`````html
<blockquote>
  <blockquote>
    <ul>
      <li>a
        <pre><code>x
</code></pre>
      </li>
    </ul>
  </blockquote>
</blockquote>
<p>flush</p>
`````

:::

::: compare

`````carve
> - a
> - ```
>   x
flush
`````

`````html
<blockquote>
  <ul>
    <li>a</li>
    <li>
      <pre><code>x
</code></pre>
    </li>
  </ul>
</blockquote>
<p>flush</p>
`````

:::

::: compare

`````carve
> - a
>
>   ```
>   x
> after
flush
`````

`````html
<blockquote>
  <ul>
    <li>a
      <pre><code>x
</code></pre>
    </li>
  </ul>
  <p>after
flush</p>
</blockquote>
`````

:::

::: compare

`````carve
> :  a
>
>    ```
>    x
flush
`````

`````html
<blockquote>
  <p>:  a</p>
  <pre><code>x
</code></pre>
</blockquote>
<p>flush</p>
`````

:::

The ninth pair is the same rule one quote deeper, and the tenth is a fence on a
SIBLING item's marker line: the quote's paragraph state there is the first item's
and says nothing about the second, so §10 I4 asks for no closer.

The last two are controls, and both keep `flush` inside the quote. In the first
the host ends at `> after`, an ordinary quoted line, which stores the claim again.
In the second there is no host at all: `:  a` with no `::` term above it is a
paragraph, so the indented run is paragraph text and opens nothing.

The pair before them is the other control: an ordinary quoted line after the
closed fence stores the claim again, and `flush` folds into the item that holds
it.

The last pair turns on WHOSE paragraph a marker meets. Only a list item's gives
way to one, so at a description body's column under its own open paragraph the
same `- ``` ` is ordinary text: nothing opens and `flush` folds into that
paragraph.

A DESCRIPTION BODY IS NOT PINNED AS A HOST. Its own column would put a fence
where the quote cannot see it too, but whether a `: ` line opens a body at all
depends on the term's list still being open, and that list ends at a blank
followed by anything, at a block opener, and at an indented list written before
any description, while surviving text that folds into the term. Until the oracle
carries that state the host stays out, and these two documents are the controls
for its absence.

::: compare

`````carve
> :: t
> :  d
>    - ```
>      x
flush
`````

`````html
<blockquote>
  <dl>
    <dt>t</dt>
    <dd>d
- <code>
x
flush</code></dd>
  </dl>
</blockquote>
`````

:::

Depth three is pinned in
`tests/a-fence-in-a-quote-stores-no-continuation-claim.test.mjs` rather than
here. The pinned reference build measures a lazily folded line inside a quoted
nested item against a re-indented source, so at that depth its offsets run past
the end of the document - a position defect a plain `> - a` / `>   - b` / `y`
already carries, independent of this rule, and one a corpus document would report
through the AST position gate instead of through the drift ledger.
