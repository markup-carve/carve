/**
 * Provenance stamping for `carve fmt --stamp`.
 *
 * Writes a tool-authored marker at the end of a document recording the spec
 * version it was processed under and the engine that wrote it. The marker is a
 * plain Carve comment, so it renders nothing and survives a plain `carve fmt`.
 * It is deterministic (no timestamp) and replace-in-place, so re-stamping is
 * idempotent and never accumulates markers.
 *
 * Two forms:
 *   line:  `%% carve-version: 0.1; generated-by: carve-js 0.1.0`
 *   block: `%%%\ncarve-version: 0.1\ngenerated-by: carve-js 0.1.0\n%%%`
 */
import { SPEC_VERSION } from './version.js';
/** Build the marker text (no surrounding blank lines / trailing newline). */
export function buildMarker(generatedBy, form) {
    if (form === 'block') {
        return `%%%\ncarve-version: ${SPEC_VERSION}\ngenerated-by: ${generatedBy}\n%%%`;
    }
    return `%% carve-version: ${SPEC_VERSION}; generated-by: ${generatedBy}`;
}
/**
 * Remove a trailing provenance marker (either form) from already-formatted
 * Carve, returning the body with no trailing blank lines. Recognizes the marker
 * by its `carve-version:` first field, so unrelated trailing comments are kept.
 */
export function stripTrailingMarker(formatted) {
    const lines = formatted.replace(/\n+$/, '').split('\n');
    if (lines.length === 0)
        return '';
    const last = lines[lines.length - 1];
    if (/^%%[ \t]*carve-version:/.test(last)) {
        lines.pop();
    }
    else if (/^%{3,}[ \t]*$/.test(last)) {
        // Block form: scan up for the matching opener fence whose first content
        // line is `carve-version:`.
        const fence = last.trim();
        for (let i = lines.length - 2; i >= 0; i--) {
            if (lines[i].trim() !== fence)
                continue;
            if (/^carve-version:/.test((lines[i + 1] ?? '').trim())) {
                lines.splice(i, lines.length - i);
            }
            break;
        }
    }
    while (lines.length > 0 && lines[lines.length - 1].trim() === '')
        lines.pop();
    return lines.length > 0 ? lines.join('\n') + '\n' : '';
}
/**
 * Append (or replace) the provenance marker on already-formatted Carve.
 * `generatedBy` is the engine identity, e.g. `carve-js 0.1.0`.
 */
export function stampCarve(formatted, generatedBy, form = 'line') {
    const body = stripTrailingMarker(formatted);
    const marker = buildMarker(generatedBy, form);
    if (body === '')
        return marker + '\n';
    return body.replace(/\n$/, '') + '\n\n' + marker + '\n';
}
//# sourceMappingURL=stamp.js.map