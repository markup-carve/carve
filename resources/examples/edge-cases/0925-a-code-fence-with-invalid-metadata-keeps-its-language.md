---
page: edge-containers
---

## A code fence with invalid metadata keeps its language

A backtick or tilde fence whose language token is followed by metadata that is not an optional `"header"` then an optional `[label]` recovers the way a colon fence does (carve#4807): when the token ends at whitespace, a straight or curly double quote, `{` or `[`, the line opens a code block with that language, drops all opener metadata and reports `fence-title-syntax`.

The reproduction from carve#4807. The opener's language token ends at a space, so the code block keeps `js` and drops `{1,3}`. The later fences pair as before instead of inverting prose and code:

::: compare

`````carve
```js {1,3}
a
```

text *x*

```py
b
```

after
`````

````html
<pre><code class="language-js">a
</code></pre>
<p>text <strong>x</strong></p>
<pre><code class="language-py">b
</code></pre>
<p>after</p>
````

:::

A tilde fence recovers the same way:

::: compare

`````carve
~~~py {.x}
b
~~~
`````

````html
<pre><code class="language-py">b
</code></pre>
````

:::

The language token may end at `{`, `[` or a quote with no space before it:

::: compare

`````carve
```js{1,3}
a
```
`````

````html
<pre><code class="language-js">a
</code></pre>
````

:::

All metadata is dropped, a valid header included:

::: compare

`````carve
```js "T" junk
a
```
`````

````html
<pre><code class="language-js">a
</code></pre>
````

:::

A recovered opener is an opener, so it interrupts an open paragraph:

::: compare

`````carve
para
```js title="x"
a
```
`````

````html
<p>para</p>
<pre><code class="language-js">a
</code></pre>
````

:::

A later run of the opener's character at least as long as the opener keeps the inline code span reading, so this line stays a paragraph:

::: compare

`````carve
```js foo``` is inline
`````

````html
<p><code>js foo</code> is inline</p>
````

:::

Without a language token there is nothing to recover, and the line falls back to paragraph text:

::: compare

`````carve
``` {.x}
a
```
`````

````html
<p><code> {.x}
a</code></p>
<pre><code></code></pre>
````

:::

A language token that ends at any other character is not recovered either:

::: compare

`````carve
```js, foo
a
```
`````

````html
<p><code>js, foo
a</code></p>
<pre><code></code></pre>
````

:::
