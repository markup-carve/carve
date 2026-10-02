#include <md4c.h>
#include <md4c-html.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <limits.h>

#ifndef CARVE_MD4C_VERSION
#define CARVE_MD4C_VERSION "unreported-system-library"
#endif

static void string(const char *s, unsigned size) {
    putchar('"');
    for (unsigned i = 0; i < size; i++) {
        unsigned char c = (unsigned char)s[i];
        if (c == '"' || c == '\\') { putchar('\\'); putchar(c); }
        else if (c < 32) printf("\\u%04x", c);
        else putchar(c);
    }
    putchar('"');
}

static int enter_block(MD_BLOCKTYPE type, void *detail, void *data) {
    (void)data;
    printf("{\"event\":\"enter_block\",\"kind\":%d", type);
    if (type == MD_BLOCK_H) printf(",\"level\":%u", ((MD_BLOCK_H_DETAIL *)detail)->level);
    if (type == MD_BLOCK_UL) printf(",\"tight\":%s", ((MD_BLOCK_UL_DETAIL *)detail)->is_tight ? "true" : "false");
    if (type == MD_BLOCK_OL) {
        MD_BLOCK_OL_DETAIL *d = detail;
        printf(",\"start\":%u,\"tight\":%s", d->start, d->is_tight ? "true" : "false");
    }
    if (type == MD_BLOCK_CODE) {
        MD_BLOCK_CODE_DETAIL *d = detail;
        printf(",\"lang\":"); string(d->lang.text, d->lang.size);
        printf(",\"info\":"); string(d->info.text, d->info.size);
    }
    puts("}"); return 0;
}

static int leave_block(MD_BLOCKTYPE type, void *detail, void *data) {
    (void)detail; (void)data;
    printf("{\"event\":\"leave_block\",\"kind\":%d}\n", type); return 0;
}

static int enter_span(MD_SPANTYPE type, void *detail, void *data) {
    (void)data;
    printf("{\"event\":\"enter_span\",\"kind\":%d", type);
    if (type == MD_SPAN_A || type == MD_SPAN_IMG) {
        MD_ATTRIBUTE dest, title;
        if (type == MD_SPAN_A) { MD_SPAN_A_DETAIL *d = detail; dest = d->href; title = d->title; }
        else { MD_SPAN_IMG_DETAIL *d = detail; dest = d->src; title = d->title; }
        printf(",\"destination\":"); string(dest.text, dest.size);
        printf(",\"title\":"); string(title.text, title.size);
    }
    puts("}"); return 0;
}

static int leave_span(MD_SPANTYPE type, void *detail, void *data) {
    (void)detail; (void)data;
    printf("{\"event\":\"leave_span\",\"kind\":%d}\n", type); return 0;
}

static int text(MD_TEXTTYPE type, const MD_CHAR *value, MD_SIZE size, void *data) {
    (void)data;
    printf("{\"event\":\"text\",\"kind\":%d,\"value\":", type);
    string(value, size); puts("}"); return 0;
}

static void output(const MD_CHAR *value, MD_SIZE size, void *data) {
    (void)data; fwrite(value, 1, size, stdout);
}

int main(int argc, char **argv) {
    if (argc == 2 && strcmp(argv[1], "--version") == 0) {
        puts(CARVE_MD4C_VERSION); return 0;
    }
    size_t size = 0, capacity = 4096;
    char *input = malloc(capacity);
    if (!input) return 2;
    for (;;) {
        if (size == capacity) {
            if (capacity > UINT_MAX / 2) { free(input); return 2; }
            capacity *= 2;
            char *next = realloc(input, capacity);
            if (!next) { free(input); return 2; }
            input = next;
        }
        size_t count = fread(input + size, 1, capacity - size, stdin);
        size += count;
        if (!count) break;
    }
    if (ferror(stdin) || size > UINT_MAX) { free(input); return 2; }
    int result;
    if (argc == 2 && strcmp(argv[1], "--html") == 0) {
        result = md_html(input, (unsigned)size, output, NULL, 0, 0);
    } else if (argc == 1) {
        MD_PARSER parser = {0, 0, enter_block, leave_block, enter_span, leave_span, text, NULL, NULL};
        result = md_parse(input, (unsigned)size, &parser, NULL);
    } else { free(input); return 2; }
    free(input);
    return result == 0 && !ferror(stdout) ? 0 : 1;
}
