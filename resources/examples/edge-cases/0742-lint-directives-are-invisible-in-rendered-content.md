## Lint directives are invisible in rendered content

The `carve-lint` line comments control diagnostics for their source lines. They
leave the parsed document and HTML unchanged.

:::: compare

```carve
%% carve-lint-disable empty-link-destination

[x]()
```

```html
<p><a href="">x</a></p>
```

::::

:::: compare

```carve
# One

### Three %% carve-lint-disable-line heading-level-skip
```

```html
<section id="One">
  <h1>One</h1>
  <section id="Three">
    <h3>Three</h3>
  </section>
</section>
```

::::

:::: compare

```carve
::: >
%% carve-lint-disable empty-link-destination

[x]()
:::
```

```html
<blockquote><p><a href="">x</a></p></blockquote>
```

::::

:::: compare

```carve
%% carve-lint-disable unused-link-reference-definition

body

[r]: /u
```

```html
<p>body</p>
```

::::
