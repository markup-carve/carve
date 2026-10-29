## A container whose table ends on a continuation row

PART 1 S4 asks what a container's last BLOCK is, and a table is a table however
its last row is spelled. §5 T6 gives a continuation row `table_cell`s and joins
them onto the row above, so it leaves no paragraph open and the container ends
at a flush-left line (markup-carve/carve#1348).

::: compare

```carve
- | a |
  + b |
tail
```

```html
<ul>
  <li>
    <table>
      <tbody>
        <tr><td>a b</td></tr>
      </tbody>
    </table>
  </li>
</ul>
<p>tail</p>
```

:::

The control is the same table ending on a STANDARD row. It already answered this
way everywhere, which is what made the pair above a contradiction rather than a
second reading: two spellings of one table's last line, one question:

::: compare

```carve
- | a |
  | b |
tail
```

```html
<ul>
  <li>
    <table>
      <tbody>
        <tr><td>a</td></tr>
        <tr><td>b</td></tr>
      </tbody>
    </table>
  </li>
</ul>
<p>tail</p>
```

:::

A QUOTE answers the same way, and this is the half no implementation had right:
all three engines and the executable spec kept `tail` inside the quote here while
sending it out of the same quote ending on a standard row.

::: compare

```carve
> | a |
> + b |
tail
```

```html
<blockquote>
  <table>
    <tbody>
      <tr><td>a b</td></tr>
    </tbody>
  </table>
</blockquote>
<p>tail</p>
```

:::

The quote's own standard-row control, which is the document that decided it. A
build that stops treating a standard row as a block inside a quote passes every
other document in the corpus:

::: compare

```carve
> | a |
> | b |
tail
```

```html
<blockquote>
  <table>
    <tbody>
      <tr><td>a</td></tr>
      <tr><td>b</td></tr>
    </tbody>
  </table>
</blockquote>
<p>tail</p>
```

:::

And the quote answers the same WRAPPED as it does bare, because §5's clause puts
the question to the quote's own body. An implementation that peels the `>` off
one line loses the run above it and makes one document's answer depend on what
is wrapped around it:

::: compare

```carve
:: t
:  > | a |
   > + b |
tail
```

```html
<dl>
  <dt>t</dt>
  <dd>
    <blockquote>
      <table>
        <tbody>
          <tr><td>a b</td></tr>
        </tbody>
      </table>
    </blockquote>
  </dd>
</dl>
<p>tail</p>
```

:::

The definition body without the quote is the same answer one container in:

::: compare

```carve
:: t
:  | a |
   + b |
tail
```

```html
<dl>
  <dt>t</dt>
  <dd>
    <table>
      <tbody>
        <tr><td>a b</td></tr>
      </tbody>
    </table>
  </dd>
</dl>
<p>tail</p>
```

:::

The other direction of the rule is unchanged and is what keeps this a parameter
rather than a new constant answer. With no table above it the same line is prose,
it leaves a paragraph open, and the flush-left line folds:

::: compare

```carve
- a
  + b |
tail
```

```html
<ul>
  <li>a
+ b |
tail</li>
</ul>
```

:::
