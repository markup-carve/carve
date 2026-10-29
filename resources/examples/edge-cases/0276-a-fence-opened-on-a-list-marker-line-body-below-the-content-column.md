## A fence opened on a list marker line, body below the content column

A code fence opened on a list MARKER line, with its body below the item's
content column, got four different answers from four readers - the executable
spec swallowed the closer into the code text, carve-js did the same with an
extra space, carve-php read the column-0 line as body and let the column-0 fence
close it, and only carve-rs closed the item (markup-carve/carve#646). No corpus
case put a fence body below the content column, so nothing could tell.

PART 9 §24's STEP algorithm already decides it, without a new rule. Take `x` at
column 0 with the stack `document > list > item(content_column 2) > code fence
body`:

- **S1 MATCH PREFIXES** walks the stack and stops at the first container whose
  prefix the line does not supply. `x` supplies no indentation, so the walk stops
  at the ITEM and the fenced body is never reached.
- **S2 FENCED BODY** therefore does not fire: it applies only when the innermost
  MATCHED container is a fenced body, and here that is the item.
- **S4 PARTIAL MATCH** governs. Its lazy-continuation branch continues an OPEN
  PARAGRAPH, and a fenced body is not one - the NO OPEN PARAGRAPH, NO LAZY LINE
  clause the spec already spells out for `. >`. What remains is S4's otherwise:
  close the unmatched containers and re-classify the residue in the surviving
  context.

So the item holds an EMPTY code block and `x` re-parses at document level:

::::: compare

````carve
- ```
x
```
````

```html
<ul>
  <li>
    <pre><code></code></pre>
  </li>
</ul>
<p>x</p>
<pre><code></code></pre>
```

:::::

The trailing delimiter is a valid opener at document level, so it interrupts
`x` and opens an empty code block that runs to the end of the document.

One column in is the same answer, and it is a separate row because the two
broken readings differed here: one kept the leading space in the code text and
one stripped it. Below the content column is below the content column.

::::: compare

````carve
- ```
 x
 ```
````

```html
<ul>
  <li>
    <pre><code></code></pre>
  </li>
</ul>
<p>x</p>
<pre><code></code></pre>
```

:::::

CONTROL. AT the content column the fence body is the item's, the closer closes
it, and nothing leaves the item. All four readers always agreed here, which is
the shape every existing corpus case uses:

::::: compare

````carve
- ```
  x
  ```
````

```html
<ul>
  <li>
    <pre><code>x
</code></pre>
  </li>
</ul>
```

:::::

The BLOCK QUOTE analogue is the same derivation with the same answer, and all
three engines already agree on it - unenforced until now, which is why the list
case could drift away from it:

::::: compare

````carve
> ```
x
```
````

```html
<blockquote>
  <pre><code></code></pre>
</blockquote>
<p>x</p>
<pre><code></code></pre>
```

:::::

A tilde fence takes the same route, and its trailing `~~~` opens an empty code
block the same way:

::::: compare

```carve
- ~~~
x
~~~
```

```html
<ul>
  <li>
    <pre><code></code></pre>
  </li>
</ul>
<p>x</p>
<pre><code></code></pre>
```

:::::

The guard is on the OPEN FENCE, not on the item's paragraph state. Once the body
has collected a line at the content column, a reader tracking "is a paragraph
open" sees one again and folds - so this row and the first one need different
mechanisms to pass, and only the fence-shaped rule passes both:

::::: compare

````carve
- ```
  x
 y
  ```
````

```html
<ul>
  <li>
    <pre><code>x
</code></pre>
  </li>
</ul>
<p>y</p>
<pre><code></code></pre>
```

:::::

The same clause reaches one shape further: a fence opened on a CONTINUATION line,
after `a` has opened a paragraph. The fence interrupts `a` whether or not a
closer follows (§10 I4), so a real code block opens. That open body is what
makes ` y` end the item, and the trailing run then opens an empty code block
after the document paragraph `y`.

::::: compare

````carve
- a
  ```
  b
 y
  ```
````

```html
<ul>
  <li>a
    <pre><code>b
</code></pre>
  </li>
</ul>
<p>y</p>
<pre><code></code></pre>
```

:::::
