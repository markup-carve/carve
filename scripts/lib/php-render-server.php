<?php
// Renders batches of sources for as long as stdin stays open.
// Usage: php php-render-server.php <carve-php checkout>
// Each request is one stdin line holding a JSON array of sources; each response
// is one stdout line holding the JSON array of HTML strings (or {"error": ...}).
declare(strict_types=1);

// A warning on stdout would be read as a response.
ini_set('display_errors', 'stderr');
require $argv[1] . '/vendor/autoload.php';

$json = JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE | JSON_THROW_ON_ERROR;
while (($line = fgets(STDIN)) !== false) {
    $out = [];
    foreach (json_decode($line, true, flags: JSON_INVALID_UTF8_SUBSTITUTE | JSON_THROW_ON_ERROR) as $source) {
        try {
            $out[] = (new MarkupCarve\Carve\CarveConverter())->convert($source);
        } catch (Throwable $e) {
            $out[] = ['error' => get_class($e) . ': ' . $e->getMessage()];
        }
    }
    fwrite(STDOUT, json_encode($out, $json) . "\n");
    fflush(STDOUT);
}
