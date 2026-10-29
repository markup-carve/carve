## A fence in a quote stores no continuation claim

PART 0 owner selection hands an unmarked line to the owner of the preceding
ordinary line, and `CARVE-P0-006` names a closed fence among the boundaries
that store no such claim. A fence opener and a line inside an open fence are
not ordinary lines either, so the unmarked line leaves every quote it was
written under. Each nesting level is asked on its own, which is what the nested
spellings below turn on.

§10 I4 opens the fence under a paragraph as at a block start, whether or not a
closer follows, so the unmarked line leaves the quote in both arms
(*Blockquote lazy continuation stops at a fenced block*).

::: compare

````carve
> a
> ```
> c
> ```
y
````

````html
<blockquote>
  <p>a</p>
  <pre><code>c
</code></pre>
</blockquote>
<p>y</p>
````

:::

::: compare

````carve
> > a
> > ```
> > c
> > ```
y
````

````html
<blockquote>
  <blockquote>
    <p>a</p>
    <pre><code>c
</code></pre>
  </blockquote>
</blockquote>
<p>y</p>
````

:::

::: compare

````carve
> > ```
> > c
> > ```
y
````

````html
<blockquote>
  <blockquote>
    <pre><code>c
</code></pre>
  </blockquote>
</blockquote>
<p>y</p>
````

:::

::: compare

````carve
> > ```
c
````

````html
<blockquote>
  <blockquote>
    <pre><code></code></pre>
  </blockquote>
</blockquote>
<p>c</p>
````

:::

::: compare

````carve
> > ```
> > x
y
````

````html
<blockquote>
  <blockquote>
    <pre><code>x
</code></pre>
  </blockquote>
</blockquote>
<p>y</p>
````

:::

::: compare

````carve
> # H
> ```
> c
> ```
y
````

````html
<blockquote>
  <h1 id="H">H</h1>
  <pre><code>c
</code></pre>
</blockquote>
<p>y</p>
````

:::

The control: an ordinary quoted line after the closed fence stores the claim
again, and the unmarked line folds into its paragraph.

::: compare

````carve
> > ```
> > c
> > ```
> > b
y
````

````html
<blockquote>
  <blockquote>
    <pre><code>c
</code></pre>
    <p>b
y</p>
  </blockquote>
</blockquote>
````

:::

A COLON fence closes the same way, and each quote level is asked on its own: a
closer written one level down ends that level's div and leaves the outer quote
with nothing to hand the unmarked line.

::: compare

````carve
> > :::
> > :::
y
````

````html
<blockquote>
  <blockquote>
    <div>

    </div>
  </blockquote>
</blockquote>
<p>y</p>
````

:::

::: compare

````carve
> > ::: d
> > p
> > :::
y
````

````html
<blockquote>
  <blockquote>
    <div class="d">
      <p>p</p>
    </div>
  </blockquote>
</blockquote>
<p>y</p>
````

:::

::: compare

````carve
> > > ::: d
> > > p
> > > :::
y
````

````html
<blockquote>
  <blockquote>
    <blockquote>
      <div class="d">
        <p>p</p>
      </div>
    </blockquote>
  </blockquote>
</blockquote>
<p>y</p>
````

:::

The control again: an ordinary quoted line after the closed div stores the claim,
and the unmarked line folds into its paragraph.

::: compare

````carve
> > ::: d
> > p
> > :::
> > b
y
````

````html
<blockquote>
  <blockquote>
    <div class="d">
      <p>p</p>
    </div>
    <p>b
y</p>
  </blockquote>
</blockquote>
````

:::
