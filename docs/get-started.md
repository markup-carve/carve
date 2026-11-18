# Get Started

Carve 0.2 is under development on the `next2` branches. Start with a `.crv` file and the reference JavaScript engine. Its 0.2 command is `carve2` (`node dist/cli2.js` in a checkout). The package root still serves 0.1; use the 0.2 entry point for code integrations.

## Write and render

Save this as `hello.crv`:

```crv
= Hello

A paragraph with /emphasis/ and a [link](https://example.com).

|= Name |= Qty |
| Apples | 3 |
```

From a built `carve-js` checkout on `next2`:

```sh
node dist/cli2.js render hello.crv
node dist/cli2.js fmt --check hello.crv
node dist/cli2.js diagnostics hello.crv
```

The command also reads standard input when no file is given. `render` writes HTML to standard output. `fmt --check` reports the first noncanonical line without changing the file. See the [0.2 CLI contract](https://github.com/markup-carve/carve/blob/next2/spec/0.2/tooling.md#commands) for the commands, flags, and exit codes. The reference engine may lag a specified command; check `--help` for what this checkout ships.

## Read next

Use the [cheat sheet](./cheatsheet) for source forms, [blocks and attributes](./blocks-and-attributes) for structure, [include files](./include-files) for reuse, and [Upgrading from 0.1](./upgrade-0-2) for existing documents. The [0.2 specification](https://github.com/markup-carve/carve/blob/next2/spec/0.2/README.md) is the authority for exact behavior.
