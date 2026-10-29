<?php
// Formats a JSON array of sources to a JSON array of Carve strings in one process,
// the way `carve fmt` does.
// Usage: php php-batch-fmt.php <carve-php checkout> < sources.json
declare(strict_types=1);

require $argv[1] . '/vendor/autoload.php';

$sources = json_decode((string)stream_get_contents(STDIN), true, flags: JSON_THROW_ON_ERROR);
$out = [];
foreach ($sources as $source) {
    try {
        $out[] = MarkupCarve\Carve\CarveConverter::toCarve($source);
    } catch (Throwable $e) {
        $out[] = ['error' => get_class($e) . ': ' . $e->getMessage()];
    }
}
echo json_encode($out, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE | JSON_THROW_ON_ERROR);
