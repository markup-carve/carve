## A code fence opener takes exactly one space

`fenced_code_block = code_fence_open, [space], [code_fence_info]` spells the
opener slot as exactly one character. A second space reaches `language_info`,
whose character class holds no space, so the opener matches no shape and the
INVALID-FENCE FALLBACK applies: the run is an inline verbatim span in a
paragraph. The bare `` ``` `` line below it is a valid opener and interrupts
that paragraph with an empty code block.

The two metadata slots INSIDE `code_fence_info` are spelled `space+` and are
unaffected. The productions differ, so the cardinality differs, and carve#912
ruled only on the four slots spelled with a bare `space`.

::: compare

````carve
```  php
x = 1
```
````

````html
<p><code>  php
x = 1</code></p>
<pre><code></code></pre>
````

:::

The CONTROL. One space is the lenient Djot spelling and stays a fenced block
with its language:

::: compare

````carve
``` php
x = 1
```
````

````html
<pre><code class="language-php">x = 1
</code></pre>
````

:::
