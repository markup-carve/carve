<?php

declare(strict_types=1);

use MarkupCarve\Carve2\Carve2;
use MarkupCarve\Carve2\Extension;
use MarkupCarve\Carve2\Extension\DocumentTransform;
use MarkupCarve\Carve2\Extension\Tabs;
use MarkupCarve\Carve2\Json\TreeEncoder;
use MarkupCarve\Carve2\Json\TreeReader;

$engine = getenv('CARVE_PHP_DIR');
if (!$engine || !is_file($engine . '/vendor/autoload.php')) {
    fwrite(STDERR, "CARVE_PHP_DIR must be an installed next2 checkout\n");
    exit(2);
}
require $engine . '/vendor/autoload.php';
// carve-php next2 moved the 0.2 engine to the package root as MarkupCarve\Carve (carve-php#5248).
if (!class_exists(Carve2::class)) {
    spl_autoload_register(static function (string $class): void {
        if (str_starts_with($class, 'MarkupCarve\\Carve2\\')) {
            $target = 'MarkupCarve\\Carve\\' . substr($class, strlen('MarkupCarve\\Carve2\\'));
            if ($target === 'MarkupCarve\\Carve\\Carve2') {
                $target = 'MarkupCarve\\Carve\\Carve';
            }
            if (class_exists($target)) {
                class_alias($target, $class);
            }
        }
    });
}

function optionsOf(array $case): array
{
    $options = $case['options'] ?? [];
    $options['documentTransforms'] = [];
    if (isset($case['files'])) {
        $files = $case['files'];
        $options['includes'] = ($options['includes'] ?? []) + ['resolver' => static function (array $request) use ($files): array {
            $file = $files[$request['path']] ?? null;
            if ($file === null) {
                return ['error' => 'not_found'];
            }
            if (isset($file['error'])) {
                return ['error' => $file['error']];
            }
            return ['text' => is_string($file) ? $file : ($file['text'] ?? hex2bin(str_replace(' ', '', $file['bytes'] ?? ''))), 'id' => $request['path']];
        }];
    }
    if (in_array('carve.tabs', $options['extensions'] ?? [], true)) {
        $renderer = $options['renderers']['carve.tabs'] ?? null;
        $standard = $renderer === 'standard' || is_array($renderer) && isset($renderer['standard']);
        $mode = is_array($renderer) ? ($renderer['standard']['mode'] ?? 'css') : 'css';
        $options['extensions'] = Tabs::extensions($standard, $mode);
        unset($options['renderers']);
    }
    // Standard extensions outside data/extensions.json, by the name an engine selects them with (see the JS runner).
    $named = [
        'carve.listTable' => static fn () => Extension\ListTable::bundle(),
        'carve.semanticSpan' => static fn () => Extension\SemanticSpan::bundle(),
        'carve.codeCallouts' => static fn () => Extension\CodeCallouts::bundle(),
        'carve.fencedRender.d2' => static fn () => Extension\FencedRender::d2(),
        'carve.fencedRender.graphviz' => static fn () => Extension\FencedRender::graphviz(),
        'carve.fencedRender.dot' => static fn () => Extension\FencedRender::graphviz(),
        'carve.fencedRender.wavedrom' => static fn () => Extension\FencedRender::wavedrom(),
        'carve.fencedRender.abc' => static fn () => Extension\FencedRender::abc(),
        'carve.fencedRender.plantuml' => static fn () => Extension\FencedRender::plantuml(),
        'carve.fencedRender.puml' => static fn () => Extension\FencedRender::plantuml(),
        'carve.fencedRender.vega-lite' => static fn () => Extension\FencedRender::vegaLite(),
        'carve.fencedRender.chart' => static fn () => Extension\FencedRender::chart(),
        'carve.externalLinks' => static fn () => Extension\Navigation::externalLinks(),
    ];
    $extensions = [];
    foreach ($options['extensions'] ?? [] as $extension) {
        if (!is_string($extension) || !isset($named[$extension])) {
            $extensions[] = $extension;
            continue;
        }
        $made = $named[$extension]();
        // A transform-only extension is one definition, not a bundle.
        if (!method_exists($made, 'definitions')) {
            $extensions[] = $made;
            continue;
        }
        $withRenderers = ($options['renderers'][$extension] ?? null) === 'standard';
        unset($options['renderers'][$extension]);
        array_push($extensions, ...($withRenderers ? $made : $made->withoutRenderers())->definitions());
        array_push($options['documentTransforms'], ...$made->transforms());
    }
    if (isset($options['extensions'])) {
        $options['extensions'] = $extensions;
    }
    if (($options['renderers'] ?? null) === []) {
        unset($options['renderers']);
    }
    // The harness function of conformance/README.md ("Options").
    if (is_array($options['codeBlockRenderer'] ?? null)) {
        $spec = $options['codeBlockRenderer'];
        $options['codeBlockRenderer'] = static function ($node, string $default) use ($spec): mixed {
            $syntax = $node->f['syntax'] ?? null;
            $result = $spec['result'] ?? null;
            if ((array_key_exists('syntax', $spec) && $syntax !== $spec['syntax']) || $result === null) {
                return null;
            }
            if (!is_string($result)) {
                return $result;
            }
            return preg_replace_callback(
                '/\{default\}|\{syntax\}/',
                static fn (array $m): string => $m[0] === '{default}' ? $default : (is_string($syntax) ? $syntax : ''),
                $result,
            );
        };
    }
    return $options;
}

/**
 * conformance/schema.json `host.documentTransforms`: insert a node after the node at a pointer.
 */
function hostTransforms(array $host): array
{
    return array_map(static function (array $entry): DocumentTransform {
        return new DocumentTransform($entry['name'], static function ($view) use ($entry) {
            $tree = (new TreeEncoder())->encode($view, null);
            $steps = explode('/', substr($entry['after'], 1));
            $index = (int)array_pop($steps);
            $list = &$tree;
            foreach ($steps as $step) {
                $list = &$list[$step];
            }
            array_splice($list, $index + 1, 0, [$entry['insert']]);
            unset($list);

            return TreeReader::read(json_encode($tree, JSON_THROW_ON_ERROR));
        });
    }, $host['documentTransforms'] ?? []);
}

function findings(array $items): array
{
    return array_map(static function ($d): array {
        return $d->toArray();
    }, $items);
}

function suppressedOf(object $result): ?int
{
    return property_exists($result, 'suppressedDiagnostics') ? $result->suppressedDiagnostics : null;
}

function parseOptions(array $options): array
{
    return array_intersect_key($options, array_flip(['includes', 'extensions', 'headingIds', 'positions']));
}

function lintOptions(array $options): array
{
    return array_intersect_key($options, array_flip(['includes', 'extensions', 'rules', 'platforms', 'headingIds']));
}

function positionlessTree(string $source): \MarkupCarve\Carve\Node
{
    $tree = json_decode(Carve2::encodeTree(Carve2::parse($source)), true, 4096, JSON_THROW_ON_ERROR);
    $withoutPositions = static function (array $node) use (&$withoutPositions): array {
        unset($node['pos']);
        foreach ($node as $key => $value) {
            if (is_array($value)) {
                $node[$key] = $withoutPositions($value);
            }
        }
        return $node;
    };
    return Carve2::decodeTree(json_encode($withoutPositions($tree), JSON_THROW_ON_ERROR));
}

function runCase(array $case): array
{
    $kind = $case['kind'] ?? 'render';
    $source = $case['input'] ?? $case['source'] ?? '';
    if (isset($case['inputBytes'])) {
        $source = hex2bin(str_replace(' ', '', $case['inputBytes']));
    }
    foreach ($case['options']['renderers'] ?? [] as $renderer) {
        if ($renderer !== 'standard' && !(is_array($renderer) && isset($renderer['standard']))) {
            return ['unsupported' => 'standard renderer host options are not offered'];
        }
    }
    try {
        $options = optionsOf($case);
    } catch (Throwable $error) {
        // An engine without a standard factory the case names.
        return ['accepted' => false, 'error' => $error::class, 'message' => $error->getMessage()];
    }
    $transforms = $options['documentTransforms'];
    unset($options['documentTransforms']);
    try {
        switch ($kind) {
            case 'migrate':
                if (!method_exists(Carve2::class, 'migrateTree')) {
                    return ['unsupported' => 'migrate has no 0.2 PHP API'];
                }
                $result = Carve2::migrateTree($case['tree'], $options);
                return ['tree' => $result['document'], 'diagnostics' => $result['diagnostics']];
            case 'render':
            case 'include':
                if (isset($case['host'])) {
                    if (!method_exists(Carve2::class, 'renderWithDocumentTransforms')) {
                        return ['unsupported' => 'renderWithDocumentTransforms is not offered'];
                    }
                    $result = Carve2::renderWithDocumentTransforms($case['tree'] ?? $source, [...$transforms, ...hostTransforms($case['host'])], $options);
                    return ['html' => $result->html, 'diagnostics' => findings($result->diagnostics), 'suppressed' => suppressedOf($result)];
                }
                if (isset($case['tree']) && !isset($case['source']) && !isset($case['input'])) {
                    $doc = \MarkupCarve\Carve2\Json\TreeReader::read(json_encode($case['tree'], JSON_THROW_ON_ERROR), $options);
                    $result = $transforms !== [] ? Carve2::renderWithDocumentTransforms($doc, $transforms, $options) : Carve2::renderWithDiagnostics($doc, $options);
                    return ['html' => $result->html, 'diagnostics' => findings($result->diagnostics), 'suppressed' => suppressedOf($result)];
                }
                if ($transforms !== []) {
                    $result = Carve2::renderWithDocumentTransforms($source, $transforms, $options);
                    return ['html' => $result->html, 'diagnostics' => findings($result->diagnostics), 'suppressed' => suppressedOf($result)];
                }
                $result = Carve2::renderWithDiagnostics($source, $options);
                $diagnostics = $result->diagnostics;
                if (($case['area'] ?? null) === 'examples' && isset($case['expected']['diagnostics'])) {
                    $diagnostics = array_merge($diagnostics, Carve2::lint($source, lintOptions($options)));
                }
                return ['html' => $result->html, 'tree' => json_decode(Carve2::toJson($source, parseOptions($options)), true, 4096, JSON_THROW_ON_ERROR), 'diagnostics' => findings($diagnostics), 'suppressed' => suppressedOf($result)];
            case 'parse':
                $result = Carve2::parseWithDiagnostics($source, $options);
                return [
                    'tree' => (new TreeEncoder())->encode($result->tree, $source),
                    'diagnostics' => findings($result->diagnostics),
                    'suppressed' => suppressedOf($result),
                ];
            case 'lint':
                return [
                    'diagnostics' => findings(Carve2::lint($source, $options)),
                    ...(($case['area'] ?? null) === 'examples'
                        ? ['tree' => json_decode(Carve2::toJson($source, parseOptions($options)), true, 4096, JSON_THROW_ON_ERROR)]
                        : []),
                ];
            case 'format':
            case 'write-example':
                $result = Carve2::formatWithDiagnostics($source, $options);
                $out = ['carve' => $result->source, 'diagnostics' => findings($result->diagnostics)];
                if ($kind === 'write-example') {
                    if (isset($case['expected']['html'])) {
                        $out['html'] = Carve2::toHtml($source, parseOptions($options));
                    }
                    $out['tree'] = json_decode(Carve2::toJson($source, parseOptions($options)), true, 4096, JSON_THROW_ON_ERROR);
                }
                return $out;
            case 'write':
                if (isset($case['expected']['refusal'])) {
                    return ['carve' => Carve2::write($case['tree'], $case['layout'] ?? null, $options)];
                }
                $result = Carve2::writeWithDiagnostics($case['tree'], $case['layout'] ?? null, $options);
                return ['carve' => $result->source, 'diagnostics' => findings($result->diagnostics)];
            case 'layout':
                $result = Carve2::parseWithLayout($source, $options);
                return ['tree' => (new TreeEncoder())->encode($result->tree, $source), 'layout' => $result->layout, 'diagnostics' => findings($result->diagnostics)];
            case 'layout-fixture':
                try {
                    Carve2::validateLayout(json_encode($case['layout'], JSON_THROW_ON_ERROR));
                    $layoutSource = isset($case['input'])
                        ? hex2bin(str_replace(' ', '', $case['input'])) : ($case['layout']['source'] ?? '');
                    return ['accepted' => true, 'layout' => Carve2::parseWithLayout($layoutSource, $options)->layout];
                } catch (Throwable $error) {
                    return ['accepted' => false, 'error' => $error::class];
                }
            case 'import':
                $result = Carve2::importHtml($case['html'], $options);
                return ['tree' => $result->document, 'carve' => $result->source, 'diagnostics' => findings($result->diagnostics), 'suppressed' => suppressedOf($result)];
            case 'tree':
            case 'refused-tree':
            case 'supplied-tree':
                $tree = $case['json'] ?? json_encode($case['tree'], JSON_THROW_ON_ERROR);
                $doc = \MarkupCarve\Carve2\Json\TreeReader::read($tree, [
                    ...$options,
                    ...(array_key_exists('annotations', $case) ? ['annotations' => $case['annotations']] : []),
                ]);
                return ['accepted' => true, 'tree' => (new TreeEncoder())->encode($doc, null)];
            case 'position':
                if (!method_exists(Carve2::class, 'positionOf')) {
                    return ['unsupported' => 'positionOf is not offered'];
                }
                try {
                    return Carve2::positionOf($source, $case['offset']);
                } catch (Throwable $error) {
                    // PHP names the refused option in the message (`option offset: ...`), not in a path field.
                    $path = preg_match('/^option (\w+):/', $error->getMessage(), $m) ? '/' . $m[1] : null;
                    return ['accepted' => false, 'error' => $error::class, 'message' => $error->getMessage(), 'path' => $path];
                }
            case 'fingerprint':
                return ['fingerprint' => ($case['of'] ?? null) === 'tree'
                    ? Carve2::treeFingerprint(positionlessTree($source))
                    : Carve2::sourceFingerprint($source)];
            case 'diff':
                $before = positionlessTree($source);
                $after = positionlessTree($case['inputAfter']);
                $patch = Carve2::diffTree($before, $after);
                return ['patch' => $patch, 'applies' => Carve2::encodeTree(Carve2::applyPatch($before, $patch)) === Carve2::encodeTree($after)];
            case 'patch':
                $fingerprint = isset($case['fingerprintOf'])
                    ? ['fingerprint' => Carve2::treeFingerprint(positionlessTree($case['fingerprintOf']))] : [];
                $tree = Carve2::applyPatch(positionlessTree($source), $case['patch'], $fingerprint);
                return ['tree' => json_decode(Carve2::encodeTree($tree), true, 4096, JSON_THROW_ON_ERROR)];
            case 'tree-fixture':
                return ['accepted' => true, 'tree' => json_decode(Carve2::toJson($source, parseOptions($options)), true, 4096, JSON_THROW_ON_ERROR)];
            default:
                return ['unsupported' => $kind . ' has no 0.2 PHP API'];
        }
    } catch (Throwable $error) {
        $path = $error->pointer ?? $error->path ?? null;
        // The PHP option exception names its option in the message rather than
        // carrying a pointer. Preserve that field in the readiness contract.
        if ($path === null && str_ends_with($error::class, '\\OptionError')
            && preg_match('/^option ([A-Za-z][A-Za-z0-9]*)(?::|\\b)/', $error->getMessage(), $match)) {
            $path = '/' . $match[1];
        }
        return [
            'accepted' => false,
            'error' => $error::class,
            'message' => $error->getMessage(),
            'path' => $path,
            'diagnostics' => isset($error->diagnostics) ? findings($error->diagnostics) : [],
        ];
    }
}

$cases = json_decode(stream_get_contents(STDIN), true, 4096, JSON_THROW_ON_ERROR);
$out = array_map('runCase', $cases);
echo json_encode($out, JSON_INVALID_UTF8_SUBSTITUTE | JSON_PARTIAL_OUTPUT_ON_ERROR | JSON_UNESCAPED_SLASHES), "\n";
