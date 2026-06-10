#!/usr/bin/env node
/*
 * `carve` command-line tool.
 *
 * Currently one subcommand: `carve fix`, a thin wrapper over
 * applyMigrationFixes that rewrites Djot/Markdown delimiter collisions to
 * their Carve equivalents (see src/djot-migrate.ts).
 *
 * The work is done by `run(argv, io)`, which takes its I/O through an
 * injectable interface so it can be unit-tested without touching the real
 * filesystem, stdin, or process exit code. The bottom of the file wires the
 * real process I/O and invokes it only when executed as the binary.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import process from 'node:process';
import { parseArgs } from 'node:util';
import { applyMigrationFixes, djotMigrationWarnings, formatMigrationWarnings, lintCarve, formatLintWarnings, } from './index.js';
const HELP = `carve - Carve markup tooling

Usage:
  carve fix [options] [files...]   Auto-fix delimiter collisions
  carve lint [files...]            Report problems without changing anything

fix - rewrite Djot/Markdown delimiter collisions to their Carve equivalents,
constructs that otherwise silently mis-render under Carve (e.g. **bold**
-> *bold*, _em_ -> /em/, ~~strike~~ -> ~strike~, + bullets -> -).

  fix options:
    -w, --write    Rewrite the given files in place
        --check    Report files that would change; exit 1 if any (no writes)
        --stdout   Print the fixed output to stdout (single file or stdin)

  With no files, fix reads Carve source on stdin and writes the fixed result
  to stdout. Crossing collisions that cannot be auto-fixed are reported on
  stderr for manual review.

lint - report delimiter collisions AND semantic problems (broken </#id>
cross-references, duplicate heading ids) as \`file:line:col rule - message\`.
Reads files or stdin; exits 1 if anything is reported, 0 if clean.

  -h, --help     Show this help
`;
/** Report the un-auto-fixable (overlapping) warnings for one input. */
function reportSkipped(skipped, file, io) {
    if (skipped.length === 0)
        return;
    const n = skipped.length;
    io.writeErr(`${file}: ${n} overlapping collision${n === 1 ? '' : 's'} need manual review:\n`);
    io.writeErr(formatMigrationWarnings(skipped, file) + '\n');
}
function plural(n) {
    return n === 1 ? '' : 's';
}
async function runFix(args, io) {
    let values;
    let positionals;
    try {
        const parsed = parseArgs({
            args,
            options: {
                write: { type: 'boolean', short: 'w' },
                check: { type: 'boolean' },
                stdout: { type: 'boolean' },
                help: { type: 'boolean', short: 'h' },
            },
            allowPositionals: true,
        });
        values = parsed.values;
        positionals = parsed.positionals;
    }
    catch (e) {
        io.writeErr(`carve fix: ${e.message}\n`);
        return 2;
    }
    if (values.help) {
        io.write(HELP);
        return 0;
    }
    const modes = [values.write, values.check, values.stdout].filter(Boolean).length;
    if (modes > 1) {
        io.writeErr('carve fix: choose at most one of --write, --check, --stdout\n');
        return 2;
    }
    const files = positionals;
    // No files: stream stdin -> stdout (or --check the stream).
    if (files.length === 0) {
        if (values.write) {
            io.writeErr('carve fix: --write requires file arguments\n');
            return 2;
        }
        const src = await io.readStdin();
        const res = applyMigrationFixes(src);
        reportSkipped(res.skipped, '<stdin>', io);
        if (values.check)
            return res.applied.length > 0 ? 1 : 0;
        io.write(res.output);
        return 0;
    }
    if (values.stdout && files.length > 1) {
        io.writeErr('carve fix: --stdout takes a single file\n');
        return 2;
    }
    const mode = values.write
        ? 'write'
        : values.stdout
            ? 'stdout'
            : 'check';
    let changed = 0;
    let skippedTotal = 0;
    let hadError = false;
    for (const file of files) {
        let src;
        try {
            src = io.readFile(file);
        }
        catch {
            io.writeErr(`carve fix: cannot read ${file}\n`);
            hadError = true;
            continue;
        }
        const res = applyMigrationFixes(src);
        skippedTotal += res.skipped.length;
        reportSkipped(res.skipped, file, io);
        const applied = res.applied.length;
        if (mode === 'stdout') {
            io.write(res.output);
            continue;
        }
        if (applied === 0)
            continue;
        changed++;
        if (mode === 'write') {
            io.writeFile(file, res.output);
            io.writeErr(`fixed ${file} (${applied} change${plural(applied)})\n`);
        }
        else {
            io.writeErr(`would fix ${file} (${applied} change${plural(applied)})\n`);
        }
    }
    if (hadError)
        return 2;
    // --check is a gate: non-zero if anything would change or needs manual work.
    if (mode === 'check')
        return changed > 0 || skippedTotal > 0 ? 1 : 0;
    return 0;
}
/**
 * Dispatch a `carve` invocation. `argv` is the argument list *after* `node`
 * and the script path (i.e. `process.argv.slice(2)`). Returns the intended
 * process exit code.
 */
export async function run(argv, io) {
    const [sub, ...rest] = argv;
    if (sub === '--help' || sub === '-h') {
        io.write(HELP);
        return 0;
    }
    if (sub === undefined) {
        io.writeErr(HELP);
        return 2;
    }
    if (sub === 'fix')
        return runFix(rest, io);
    if (sub === 'lint')
        return runLint(rest, io);
    io.writeErr(`carve: unknown command '${sub}'\n\n${HELP}`);
    return 2;
}
/** Report all warnings for one source; returns how many were found. */
function reportLint(source, file, io) {
    const migration = djotMigrationWarnings(source);
    const semantic = lintCarve(source);
    if (migration.length)
        io.write(formatMigrationWarnings(migration, file) + '\n');
    if (semantic.length)
        io.write(formatLintWarnings(semantic, file) + '\n');
    return migration.length + semantic.length;
}
async function runLint(args, io) {
    let positionals;
    try {
        const parsed = parseArgs({
            args,
            options: { help: { type: 'boolean', short: 'h' } },
            allowPositionals: true,
        });
        if (parsed.values.help) {
            io.write(HELP);
            return 0;
        }
        positionals = parsed.positionals;
    }
    catch (e) {
        io.writeErr(`carve lint: ${e.message}\n`);
        return 2;
    }
    if (positionals.length === 0) {
        const src = await io.readStdin();
        return reportLint(src, '<stdin>', io) > 0 ? 1 : 0;
    }
    let total = 0;
    let hadError = false;
    for (const file of positionals) {
        let src;
        try {
            src = io.readFile(file);
        }
        catch {
            io.writeErr(`carve lint: cannot read ${file}\n`);
            hadError = true;
            continue;
        }
        total += reportLint(src, file, io);
    }
    if (hadError)
        return 2;
    return total > 0 ? 1 : 0;
}
async function readStdin() {
    const chunks = [];
    for await (const chunk of process.stdin)
        chunks.push(chunk);
    return Buffer.concat(chunks).toString('utf8');
}
const realIO = {
    readStdin,
    write: (s) => void process.stdout.write(s),
    writeErr: (s) => void process.stderr.write(s),
    readFile: (p) => readFileSync(p, 'utf8'),
    writeFile: (p, c) => writeFileSync(p, c, 'utf8'),
};
// Run only when executed as the binary, not when imported by a test.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
    run(process.argv.slice(2), realIO).then((code) => {
        process.exitCode = code;
    }, (err) => {
        process.stderr.write(`carve: ${err.message}\n`);
        process.exitCode = 1;
    });
}
//# sourceMappingURL=cli.js.map