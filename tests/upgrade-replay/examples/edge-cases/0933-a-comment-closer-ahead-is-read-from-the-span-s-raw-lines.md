---
page: edge-lists
---

## A comment closer ahead is read from the span's raw lines

Since markup-carve/carve#4907 a `%%%` opener opens its span with no closer
lookahead: without a closer it hides everything up to a line that misses its
owner or the end of its container (PART 9 §28). The rows below follow that
reading; where the prose describes a closerless opener as a `%%` line or a
closer ahead as deciding the span, it records the reading the ruling replaced.

PART 0 S1 and the RECOVERY DECISION TABLE (CARVE-P0-005, carve#4895). The search for a %%% closer reads the candidate span's body, where a fence line opens nothing, so an exact-width line inside what later reads as a code block is a closer ahead: the line that misses the host still ends it. A wider line is not a closer, so there the line folds as it does after a %% line. With no miss the span closes at that line. A blank line stops only a quote's search, so past a nested item the line still ends the host.

::::: compare

````carve
- a
  %%%
  n
zz
```
%%%
```
````

```html
<ul>
  <li>a</li>
</ul>
<p>zz</p>
<pre><code>%%%
</code></pre>
```

:::::

::::: compare

````carve
- a
  %%%
  n
zz
```
%%%%
```
````

```html
<ul>
  <li>a</li>
</ul>
<p>zz</p>
<pre><code>%%%%
</code></pre>
```

:::::

::::: compare

````carve
:: t
: %%%
  n
zz
```
%%%
```
````

```html
<dl>
  <dt>t</dt>
  <dd></dd>
</dl>
<p>zz</p>
<pre><code>%%%
</code></pre>
```

:::::

::::: compare

````carve
. a
  . %%%
    n
>>
```
%%%
```
````

```html
<ol>
  <li>a
    <ol>
      <li></li>
    </ol>
  </li>
</ol>
<p>&gt;&gt;</p>
<pre><code>%%%
</code></pre>
```

:::::

::::: compare

````carve
> %%%
> n
zz
```
%%%
```
````

```html
<blockquote>

</blockquote>
<p>zz</p>
<pre><code>%%%
</code></pre>
```

:::::

::::: compare

````carve
%%%
n
```
%%%
```
z
````

```html
<pre><code>z
</code></pre>
```

:::::

::::: compare

````carve
- a
  - %%%
    n
  zz

%%%
````

```html
<ul>
  <li>a
    <ul>
      <li></li>
    </ul>
    zz
  </li>
</ul>
```

:::::
