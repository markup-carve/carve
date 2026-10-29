## A dangling plus marker adds nothing and a nested quote reads it like an unnested one

Under §17 L3, a later column-0 `+` with no following block remains text (carve#3415, markup-carve/carve#3421). A nested quote reads a valid marker after its quote prefix. A `+` outside every open marker column stays text (markup-carve/carve#3421).

::::::: compare

````carve
> q
+

para
````

```html
<blockquote><p>q
+</p></blockquote>
<p>para</p>
```

:::::::

::::::: compare

````carve
> q
+
````

```html
<blockquote><p>q
+</p></blockquote>
```

:::::::

::::::: compare

````carve
- a
+

para
````

```html
<ul>
  <li>a
+</li>
</ul>
<p>para</p>
```

:::::::

::::::: compare

````carve
x[^a]

[^a]: note
+

para
````

```html
<p>x<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<p>para</p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>note
+<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::::::

::::::: compare

````carve
> > q
> +
> para
````

```html
<blockquote>
  <blockquote>
    <p>q</p>
    <p>para</p>
  </blockquote>
</blockquote>
```

:::::::

::::::: compare

````carve
> > q
> +
para
````

```html
<blockquote>
  <blockquote><p>q
+
para</p></blockquote>
</blockquote>
```

:::::::

::::::: compare

````carve
> > q
> +
````

```html
<blockquote>
  <blockquote><p>q
+</p></blockquote>
</blockquote>
```

:::::::

::::::: compare

````carve
> [^a]: n
> +

para
````

```html
<blockquote>

</blockquote>
<p>para</p>
```

:::::::
