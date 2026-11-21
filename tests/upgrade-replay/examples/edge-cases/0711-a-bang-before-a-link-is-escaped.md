## A bang before a link is escaped

The Markdown writer keeps a text exclamation mark separate from the link that follows it.

:::: compare

```carve
a \![x](/u)
```

```html
<p>a !<a href="/u">x</a></p>
```

::::
