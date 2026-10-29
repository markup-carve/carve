## A shifted fence in a quoted item stores no continuation claim

`CARVE-P0-014` gives an unmarked column-0 line to the document when a code or
raw fence is open, even when the opener sits past the quoted item's content
column. Quote depth and opener indentation do not preserve a continuation claim.
A shifted run under the item's paragraph opens a fence too, so it permits no
lazy continuation either, and a later quoted run opens a fence of its own.

::: compare

`````carve
> - a
>
>     ```
>     x
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
>
>     ~~~
>     x
z
>     b
>     ~~~
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
<p>z</p>
<blockquote>
  <p>b</p>
  <pre><code></code></pre>
</blockquote>
`````

:::

::: compare

`````carve
> > - a
> >
> >     ```=html
> >     x
flush
`````

`````html
<blockquote>
  <blockquote>
    <ul>
      <li>a
        x
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
>     ```
>     x
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
