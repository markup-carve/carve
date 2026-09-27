# Generated engine quality checks

Run `node scripts/check-quality-cases.mjs adapters.json report.json` after building the three engines. The check covers fence payload ownership, HTML import modes, empty containers and repeated attributes. It checks formatting idempotence, HTML preservation through formatting and JSON, and agreement between engines on HTML and diagnostic attribution.

The adapter file contains three engine entries named `js`, `php` and `rust`, each with a working directory:

```json
{
  "engines": [
    {
      "name": "js",
      "cwd": "/path/to/carve-js",
      "commands": {
        "html": ["node", "dist/cli.js"],
        "fmt": ["node", "dist/cli.js", "fmt"],
        "json": ["node", "dist/cli.js", "--json"],
        "fromJson": ["node", "dist/cli.js", "--from-json"],
        "import": ["node", "dist/cli.js", "migrate", "--from", "html", "--mode", "{mode}", "--report", "{report}"]
      }
    }
  ]
}
```

Add PHP and Rust entries using their CLI commands. Each command reads stdin and writes its result to stdout; `fromJson` renders HTML. Import writes its diagnostic report to `{report}`. Commands run as argument arrays, without a shell.

The output includes failures, imported diagnostics, checkout revisions, spec pins and tracked-change status. Revision metadata does not establish that a compiled artifact matches its checkout. Diagnostic comparison covers code, severity, fidelity and confidence, allowing consecutive duplicate rows. Repeated-attribute cases require distinct source locators; locator syntax and message wording may differ. A command failure, timeout or mismatch exits with status 1. Generator and gate tests run with `node --test tests/generated-quality-cases.test.mjs`.
