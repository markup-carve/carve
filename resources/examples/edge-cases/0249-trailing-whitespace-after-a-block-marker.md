## Trailing whitespace after a block marker

A block marker is what it is regardless of whitespace after it. Every engine already reads it that way, and no corpus document carried any of these six shapes - so an engine that dropped one of those tolerances could not be caught here. carve-php shipped exactly that for the continuation marker (carve#871).

A thematic break:

::: compare

```carve
a

--- 

b
```

```html
<p>a</p>
<hr>
<p>b</p>
```

:::

A code fence's closer:

::: compare

````carve
``` 
x
``` 

y
````

```html
<pre><code>x
</code></pre>
<p>y</p>
```

:::

A colon fence's closer:

::::: compare

```carve
::: note
x
::: 

y
```

```html
<aside class="admonition note" aria-label="Note">
  <p>x</p>
</aside>
<p>y</p>
```

:::::

A table's continuation row:

::: compare

```carve
| a | b |
+ c | d | 
```

```html
<table>
  <tbody>
    <tr><td>a c</td><td>b d</td></tr>
  </tbody>
</table>
```

:::

A footnote definition separated by more than one space:

::: compare

```carve
[^f]:   note

see[^f]
```

```html
<p>see<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>note<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

And the continuation marker, which §17 L3 spells "a line whose only content is `+`":

::: compare

```carve
- a
+ 
b

x
```

```html
<ul>
  <li>a
    b
  </li>
</ul>
<p>x</p>
```

:::
