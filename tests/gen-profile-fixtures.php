<?php
// Generates tests/profile-fixtures.json -- the shared profile parity battery.
// Run from a carve-php checkout: `php tests/gen-profile-fixtures.php > tests/profile-fixtures.json`
// (adjust the require path to your carve-php vendor/autoload.php). carve-php is
// the reference; carve-js and carve-rs assert their profile output against this
// file (trailing-newline-insensitive). See docs/profiles.md.
require getenv('CARVE_PHP_AUTOLOAD') ?: 'vendor/autoload.php';

use Carve\CarveConverter;
use Carve\Profile;

// name => [carve input, profile factory closure, profile id string for impls]
$cases = [
    'full-unchanged' => ['Text with *bold* and a [link](/a).', fn () => Profile::full(), 'full'],
    'article-raw-denied' => ["Para.\n\n```=html\n<b>x</b>\n```\n", fn () => Profile::article(), 'article'],
    'article-raw-inline' => ['A `<b>x</b>`{=html} end.', fn () => Profile::article(), 'article'],
    'comment-heading' => ["# Heading\n\nBody text.", fn () => Profile::comment(), 'comment'],
    'comment-image' => ['See ![alt text](/pic.png) here.', fn () => Profile::comment(), 'comment'],
    'comment-table' => ["| a | b |\n| c | d |\n", fn () => Profile::comment(), 'comment'],
    'comment-link-rel' => ['A [site](https://example.com) link.', fn () => Profile::comment(), 'comment'],
    'comment-basic-fmt' => ['*Bold*, _em_, `code`, ~~del~~.', fn () => Profile::comment(), 'comment'],
    'minimal-link-denied' => ['A [site](https://example.com) link.', fn () => Profile::minimal(), 'minimal'],
    'minimal-heading' => ["# H\n\nText.", fn () => Profile::minimal(), 'minimal'],
    'minimal-list' => ["- one\n- two\n", fn () => Profile::minimal(), 'minimal'],
];

$out = [];
foreach ($cases as $name => [$carve, $factory, $pid]) {
    $conv = new CarveConverter(profile: $factory());
    $out[$name] = ['carve' => $carve, 'profile' => $pid, 'html' => $conv->convert($carve)];
}
echo json_encode($out, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . "\n";
