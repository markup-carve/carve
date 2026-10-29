## A closed fence in a description body ends it

`A FENCED BODY IS NOT A PARAGRAPH` and `FENCE KIND DOES NOT DETERMINE CONTAINER
REACH` say S4's lazy branch asks for an OPEN PARAGRAPH, and that a code fence
body cannot hold one at all. So a body whose last block is a CLOSED fence has
nothing for the flush-left line to continue, and the line is the document's.
The list-item host pins the same answer at `270-a-real-div-in-a-container-and-the-flush-left-line-after-it-3`
and `86-list-lazy-continuation-7`; these rows pin the description-body host
(markup-carve/carve#1930).

::: compare

```carve
:: term
:  definition
   ::: note
   body
   :::
tail
```

```html
<dl>
  <dt>term</dt>
  <dd>
    <p>definition</p>
    <aside class="admonition note" aria-label="Note">
      <p>body</p>
    </aside>
  </dd>
</dl>
<p>tail</p>
```

:::

The CODE-fence spelling of the same rule, which is the one the normative clause
names outright.

::: compare

```carve
:: term
:  definition
   ```
   c
   ```
tail
```

```html
<dl>
  <dt>term</dt>
  <dd>
    <p>definition</p>
    <pre><code>c
</code></pre>
  </dd>
</dl>
<p>tail</p>
```

:::

CONTROL -- an UNTERMINATED fence gives the same answer: it interrupts the
paragraph above it and opens a code block, so the flush-left line has no
paragraph to continue and ends the body.

::: compare

```carve
:: term
:  definition
   ```
   c
tail
```

```html
<dl>
  <dt>term</dt>
  <dd>
    <p>definition</p>
    <pre><code>c
</code></pre>
  </dd>
</dl>
<p>tail</p>
```

:::

A `:::` INSIDE A CODE FENCE is payload, not the container's closer. The rule
reads the body's fence state, and a code fence's contents are opaque to it -
mistaking the payload for the closer would make the real closer look like an
opener and pull the flush-left line back in.

::: compare

````carve
:: term
:  definition
   ::: note
   ```
   :::
   ```
   :::
tail
````

````html
<dl>
  <dt>term</dt>
  <dd>
    <p>definition</p>
    <aside class="admonition note" aria-label="Note">
      <pre><code>:::
</code></pre>
    </aside>
  </dd>
</dl>
<p>tail</p>
````

:::
