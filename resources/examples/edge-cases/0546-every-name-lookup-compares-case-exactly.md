## Every name lookup compares case exactly

A `</#id>` cross-reference, a collapsed `[text][]` heading reference and a
`[text][label]` reference all match their target exactly, case included (PART
9R R1, R4). A spelling that differs only in case names nothing and stays
literal; `carve lint` reports it with the exact spelling.

::: compare

```carve
{#Plan}
# Plan

See </#Plan> and </#plan>.
```

```html
<section id="Plan">
  <h1>Plan</h1>
  <p>See <a href="#Plan">Plan</a> and &lt;/#plan&gt;.</p>
</section>
```

:::

Ids that differ only in case are two ids, and each reference reaches its own:

::: compare

```carve
{#Tip}
# Upper

{#tip}
# Lower

</#Tip> and </#tip>
```

```html
<section id="Tip">
  <h1>Upper</h1>
</section>
<section id="tip">
  <h1>Lower</h1>
  <p><a href="#Tip">Upper</a> and <a href="#tip">Lower</a></p>
</section>
```

:::

The heading index and the definition labels follow the same rule:

::: compare

```carve
See [Plan][] and [plan][].

# Plan
```

```html
<p>See <a href="#Plan">Plan</a> and [plan][].</p>
<section id="Plan">
  <h1>Plan</h1>
</section>
```

:::

::: compare

```carve
[x][Label] and [y][label]

[label]: /u
```

```html
<p>[x][Label] and <a href="/u">y</a></p>
```

:::

Numbered captions and equation captions keep the same distinction:

::: compare

```carve
{#Fig}
![upper](upper.png)
^ Figure #: upper

{#fig}
![lower](lower.png)
^ Figure #: lower

{#Eq}
$$`x`
^ Equation #: upper

{#eq}
$$`y`
^ Equation #: lower

</#Fig>, </#fig>, </#FIG>, </#Eq>, </#eq>, </#EQ>.
```

```html
<figure id="Fig">
  <img src="upper.png" alt="upper">
  <figcaption>Figure 1: upper</figcaption>
</figure>
<figure id="fig">
  <img src="lower.png" alt="lower">
  <figcaption>Figure 2: lower</figcaption>
</figure>
<figure id="Eq">
  <p><span class="math display" role="math">\[x\]</span></p>
  <figcaption>Equation 1: upper</figcaption>
</figure>
<figure id="eq">
  <p><span class="math display" role="math">\[y\]</span></p>
  <figcaption>Equation 2: lower</figcaption>
</figure>
<p><a href="#Fig">Figure 1</a>, <a href="#fig">Figure 2</a>, &lt;/#FIG&gt;, <a href="#Eq">Equation 1</a>, <a href="#eq">Equation 2</a>, &lt;/#EQ&gt;.</p>
```

:::
