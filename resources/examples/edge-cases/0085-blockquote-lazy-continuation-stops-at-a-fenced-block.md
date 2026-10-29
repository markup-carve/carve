## Blockquote lazy continuation stops at a fenced block

Lazy continuation only extends an open paragraph. A non-`>` line that lands inside an open fenced code block ends the quote instead of being swallowed into the code. After the quote ends, `b` starts a paragraph and the trailing `> c` interrupts it into a fresh block quote (§10 — a `>` marker interrupts a paragraph). In the second example the mid-paragraph ` ``` ` has no closer, and it still interrupts (§10 I4): the unclosed fence opens an empty code block, and `lazy`, which misses the quote, ends it and the quote.

::: compare

````carve
> ```
> a
b
> c
````

```html
<blockquote>
  <pre><code>a
</code></pre>
</blockquote>
<p>b</p>
<blockquote><p>c</p></blockquote>
```

:::

::: compare

````carve
> text
> ```
lazy
````

````html
<blockquote>
  <p>text</p>
  <pre><code></code></pre>
</blockquote>
<p>lazy</p>
````

:::

When the fence opener is immediately followed by a non-`>` line — with no
marked content line in between — the fence is never closed (an empty code
block), and the non-`>` line ends the quote. The trailing `> still` then opens
a fresh block quote.

::: compare

````carve
> ```
code no marker
> still
````

```html
<blockquote>
  <pre><code></code></pre>
</blockquote>
<p>code no marker</p>
<blockquote><p>still</p></blockquote>
```

:::
