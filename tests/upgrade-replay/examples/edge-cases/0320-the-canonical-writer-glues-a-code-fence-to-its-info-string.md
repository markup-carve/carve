## The canonical writer glues a code fence to its info string

`fenced_code_block` calls the no-space opener canonical and the reader accepts
either spelling, so nothing in the source says which one the WRITER emits. PART
11 §6d does: no padding space between the fence run and the info string, and
exactly one space before each metadata token inside it. The `.fmt` sidecar
beside this pair pins the whole opener line, which is what was missing - the fmt
corpus held no document whose canonical form contains an info string at all, so
two engines normalized to the glued form and one to the spaced one with nothing
to adjudicate between them.

The author's spacing is normalized away in all three slots at once, and the
rendered block is unchanged by any of it.

::: compare

````carve
``` php   "src/Auth.php"    [Composer]
composer require x
```
````

````html
<pre title="src/Auth.php"><code class="language-php">composer require x
</code></pre>
````

:::

The canonical form is a fixed point. An opener already written the canonical way
comes back byte for byte, which is the half a writer that merely reproduced the
author's spelling would also pass - both examples are needed to tell the two
apart.

::: compare

````carve
```php "src/Auth.php" [Composer]
composer require x
```
````

````html
<pre title="src/Auth.php"><code class="language-php">composer require x
</code></pre>
````

:::
