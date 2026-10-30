## A quote-prefixed plus takes one space after each quote marker and attaches a quote

A `+` after quote prefixes is a marker only when every `>` is followed by one space, as on any quote line. `>+`, `>>+` and `>> +` are not quote lines and read as text, and `> >+` is a quote holding the text `>+` (markup-carve/carve#3421). A marker that addresses an open container at its quote level attaches a following quote, which nests like every other block (PART 9 §17 L4). With no container there, as in `> a` / `> +` / `> > q`, the `+` stays text.

::::::: compare

`````carve
> +
q
`````

```html
<blockquote><p>q</p></blockquote>
```

:::::::

::::::: compare

`````carve
> > +
q
`````

```html
<blockquote>
  <blockquote><p>+
q</p></blockquote>
</blockquote>
```

:::::::

::::::: compare

`````carve
>+
q
`````

```html
<p>&gt;+
q</p>
```

:::::::

::::::: compare

`````carve
>>+
q
`````

```html
<p>&gt;&gt;+
q</p>
```

:::::::

::::::: compare

`````carve
> >+
q
`````

```html
<blockquote><p>&gt;+
q</p></blockquote>
```

:::::::

::::::: compare

`````carve
>> +
q
`````

```html
<p>&gt;&gt; +
q</p>
```

:::::::

::::::: compare

`````carve
> q
>+
> para
`````

```html
<blockquote><p>q
&gt;+
para</p></blockquote>
```

:::::::

::::::: compare

`````carve
> > q
> +
> > r
`````

```html
<blockquote>
  <blockquote>
    <p>q</p>
    <blockquote><p>r</p></blockquote>
  </blockquote>
</blockquote>
```

:::::::

::::::: compare

`````carve
> - a
> +
> > r
`````

```html
<blockquote>
  <ul>
    <li>a
      <blockquote><p>r</p></blockquote>
    </li>
  </ul>
</blockquote>
```

:::::::

::::::: compare

`````carve
> > - a
> +
> para
`````

```html
<blockquote>
  <blockquote>
    <ul>
      <li>a</li>
    </ul>
    <p>para</p>
  </blockquote>
</blockquote>
```

:::::::

::::::: compare

`````carve
> a
> +
> > q
`````

```html
<blockquote>
  <p>a
+</p>
  <blockquote><p>q</p></blockquote>
</blockquote>
```

:::::::

A description or a note inside the quote takes the marker at its own marker column the same way.

::::::: compare

`````carve
> :: t
> : a
> +
> > q
`````

```html
<blockquote>
  <dl>
    <dt>t</dt>
    <dd>
      <p>a</p>
      <blockquote><p>q</p></blockquote>
    </dd>
  </dl>
</blockquote>
```

:::::::

::::::: compare

`````carve
> [^a]: a
> +
> > q

r[^a]
`````

```html
<blockquote>

</blockquote>
<p>r<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>a</p>
      <blockquote><p>q</p></blockquote>
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::::::
