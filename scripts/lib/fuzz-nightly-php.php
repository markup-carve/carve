<?php

// carve-php worker of scripts/fuzz-nightly.mjs, the PHP twin of fuzz-nightly-js.mjs.

declare(strict_types=1);

use MarkupCarve\Carve\Carve;
use MarkupCarve\Carve\Json\TreeEncoder;

$engine = getenv('CARVE_PHP_DIR');
if (!$engine || !is_file($engine . '/vendor/autoload.php')) {
    fwrite(STDERR, "CARVE_PHP_DIR must be an installed next2 checkout\n");
    exit(2);
}
require $engine . '/vendor/autoload.php';

function fuzzRun(array $case): array
{
    $started = hrtime(true);
    $source = $case['input'] ?? '';
    try {
        $out = match ($case['kind']) {
            'parse' => (static function () use ($source): array {
                $result = Carve::parseWithDiagnostics($source);
                return ['tree' => (new TreeEncoder())->encode($result->tree, $source),
                    'diagnostics' => array_map(static fn ($d) => $d->toArray(), $result->diagnostics)];
            })(),
            'render' => ['html' => Carve::renderWithDiagnostics($source)->html],
            'format' => (static function () use ($source): array {
                $result = Carve::formatWithDiagnostics($source);
                return ['carve' => $result->source, 'diagnostics' => array_map(static fn ($d) => $d->toArray(), $result->diagnostics)];
            })(),
            'lint' => ['diagnostics' => array_map(static fn ($d) => $d->toArray(), Carve::lint($source))],
            'import' => (static function () use ($case): array {
                $result = Carve::importHtml($case['html']);
                return ['carve' => $result->source, 'tree' => $result->document];
            })(),
            default => ['unsupported' => $case['kind']],
        };
    } catch (Throwable $error) {
        $out = ['accepted' => false, 'error' => $error::class, 'message' => substr($error->getMessage(), 0, 300)];
    }
    $out['ms'] = (hrtime(true) - $started) / 1e6;
    return $out;
}

$cases = json_decode(stream_get_contents(STDIN), true, 100000, JSON_THROW_ON_ERROR);
echo json_encode(array_map('fuzzRun', $cases), JSON_INVALID_UTF8_SUBSTITUTE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR, 100000), "\n";
