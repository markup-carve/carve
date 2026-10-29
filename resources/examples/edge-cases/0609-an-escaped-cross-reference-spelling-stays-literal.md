## An escaped cross-reference spelling stays literal

Escaping the opening `<` keeps the complete `</#id>` spelling as text. The
`#id` inside it does not become a tag.

:::::: compare

```carve
\</#id>

x \</#x~>y> y
```

```html
<p>&lt;/#id&gt;</p>
<p>x &lt;/#x~&gt;y&gt; y</p>
```

::::::
