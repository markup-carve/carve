## Code fence metadata slots must be a space too

A fenced code block carries three of the same slots: the one before the info
string (`fenced_code_block`, spelled `[space]`), and the `"header"` and
`[label]` slots inside `code_fence_info` (spelled `space+`). All three sit
after the fence run, which has already decided the block, so all three are
padding and all three take a space.

The fallback here is the INVALID-FENCE FALLBACK the grammar already names: the
opener is not a fence opener, so the run is read as an inline verbatim span in
a paragraph and every character of its line survives. The bare `` ``` `` line
below it is a valid opener, so it interrupts that paragraph and opens an empty
code block that runs to the end of the document.

Each slot is pinned separately, because implementations decide them in three
places and a document carrying a tab in all three cannot tell a partial fix
from a whole one.

The slot before the info string, tab-first:

::: compare

````carve
```	js
x
```
````

````html
<p><code>	js
x</code></p>
<pre><code></code></pre>
````

:::

Both mixed runs answer the same way, for the reason the title slots give:

::: compare

````carve
``` 	js
x
```
````

````html
<p><code> 	js
x</code></p>
<pre><code></code></pre>
````

:::

::: compare

````carve
```	 js
x
```
````

````html
<p><code>	 js
x</code></p>
<pre><code></code></pre>
````

:::

The `"header"` slot, which sits after the language token and reverts
independently of the slot before it:

::: compare

````carve
```js	"T"
x
```
````

````html
<p><code>js	"T"
x</code></p>
<pre><code></code></pre>
````

:::

::: compare

````carve
```js 	"T"
x
```
````

````html
<p><code>js 	"T"
x</code></p>
<pre><code></code></pre>
````

:::

::: compare

````carve
```js	 "T"
x
```
````

````html
<p><code>js	 "T"
x</code></p>
<pre><code></code></pre>
````

:::

And the `[label]` slot, which reverts independently of both:

::: compare

````carve
```js "T"	[L]
x
```
````

````html
<p><code>js "T"	[L]
x</code></p>
<pre><code></code></pre>
````

:::

::: compare

````carve
```js "T" 	[L]
x
```
````

````html
<p><code>js "T" 	[L]
x</code></p>
<pre><code></code></pre>
````

:::

::: compare

````carve
```js "T"	 [L]
x
```
````

````html
<p><code>js "T"	 [L]
x</code></p>
<pre><code></code></pre>
````

:::

A single space in each slot is the fenced form, unchanged:

::: compare

````carve
```js "T" [L]
x
```
````

````html
<pre title="T"><code class="language-js">x
</code></pre>
````

:::
