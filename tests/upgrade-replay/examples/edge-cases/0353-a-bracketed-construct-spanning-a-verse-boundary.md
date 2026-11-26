## A bracketed construct spanning a verse boundary

The two rules compose, and this is the coverage
"A closed inline construct spanning a verse boundary" above deferred. §23's
subject is the `soft_break` NODE, and a link label spanning a stanza boundary
encloses one, so the break hardens inside the label exactly as it does inside
an emphasis run.

:::: compare

```carve
::: |
See [Roses are red,
Violets are blue.](/u)
:::
```

```html
<div class="line-block">
  <p>See <a href="/u">Roses are red,<br>
Violets are blue.</a></p>
</div>
```

::::

A semantic span holds the same node:

:::: compare

```carve
::: |
[Roses are red,
Violets are blue.]{.verse}
:::
```

```html
<div class="line-block">
  <p><span class="verse">Roses are red,<br>
Violets are blue.</span></p>
</div>
```

::::

And so does a braced construct, which is the point of the rule being about the
node rather than about a list of enclosures:

:::: compare

```carve
::: |
{+Roses are red,
Violets are blue.+}
:::
```

```html
<div class="line-block">
  <p><ins>Roses are red,<br>
Violets are blue.</ins></p>
</div>
```

::::
