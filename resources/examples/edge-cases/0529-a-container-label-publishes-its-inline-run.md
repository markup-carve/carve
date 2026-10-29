## A container label publishes its inline run

`CARVE-P9-041` enumerates a div label among the hosts that begin an inline run
mid-line, and the semantic constraint on `label` in PART 2 says the slot "holds
an inline run (PART 9 §12)". A host with an inline run renders the constructs
written in it, so emphasis, strong and a code span in a container label reach
the output as elements rather than as the characters the author typed
(carve#2572). Both opener spellings answer alike, the bare `:::[...]` and the
named `::: note [...]`.

Every earlier row that renders a label carries plain text, which is why the
engine gates stayed silent on this. The plain-text document in each spelling
sits here as the control that must not move.

A code fence carries the one `label` production and the same balanced close
(carve#2576), but the HTML target consumes no fence label, so markup in it
reaches no output. What is observable there is the close: a `]` inside a code
span is content, so the slot runs past it and the fence keeps its payload
instead of losing it to an inline code span.

Three shapes stay unpinned. A footnote reference and an abbreviation render in
the oracle and in no engine; a reference in a label resolves in none of the
four. All three need the label's run to reach the AST, which no clause settles.

:::: compare

````carve
:::[/i/]
body
:::
````

````html
<div>
  <p class="div-label"><em>i</em></p>
  <p>body</p>
</div>
````

::::

:::: compare

````carve
:::[*b*]
body
:::
````

````html
<div>
  <p class="div-label"><strong>b</strong></p>
  <p>body</p>
</div>
````

::::

:::: compare

````carve
:::[`x`]
body
:::
````

````html
<div>
  <p class="div-label"><code>x</code></p>
  <p>body</p>
</div>
````

::::

:::: compare

````carve
:::[plain]
body
:::
````

````html
<div>
  <p class="div-label">plain</p>
  <p>body</p>
</div>
````

::::

:::: compare

````carve
::: note [/i/]
body
:::
````

````html
<aside class="admonition note" aria-label="Note">
  <p class="div-label"><em>i</em></p>
  <p>body</p>
</aside>
````

::::

:::: compare

````carve
::: note [`x`]
body
:::
````

````html
<aside class="admonition note" aria-label="Note">
  <p class="div-label"><code>x</code></p>
  <p>body</p>
</aside>
````

::::

:::: compare

````carve
::: note [plain]
body
:::
````

````html
<aside class="admonition note" aria-label="Note">
  <p class="div-label">plain</p>
  <p>body</p>
</aside>
````

::::

::: compare

````carve
``` js [a `]` b]
c
```
````

````html
<pre><code class="language-js">c
</code></pre>
````

:::

::: compare

````carve
``` js [/i/]
c
```
````

````html
<pre><code class="language-js">c
</code></pre>
````

:::

::: compare

````carve
``` js [plain]
c
```
````

````html
<pre><code class="language-js">c
</code></pre>
````

:::
