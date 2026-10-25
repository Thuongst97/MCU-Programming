/* SPDX-License-Identifier: MIT
 * A tiny line-oriented command shell: line editing, tokenising and dispatch. No hardware access,
 * so it is unit-tested on the host; the commands themselves live in main.c. */
#ifndef SHELL_H
#define SHELL_H

#include <stddef.h>
#include <stdint.h>

#define SHELL_LINE_MAX 48U
#define SHELL_ARGS_MAX 4U

// [region:seam]
typedef void (*shell_write_fn)(const char *s);   /* how the shell talks: injected, not hard-wired */ // «1»
typedef void (*shell_cmd_fn)(uint32_t argc, const char *const argv[]);

typedef struct
{
    const char *name;
    const char *help;
    shell_cmd_fn fn;
} shell_cmd_t;

typedef struct
{
    const shell_cmd_t *cmds;
    size_t ncmds;
    shell_write_fn write;
    char line[SHELL_LINE_MAX];
    uint32_t len;
    char prev;   /* last character, so CR LF counts as one Enter */
} shell_t;

void shell_init(shell_t *sh, const shell_cmd_t *cmds, size_t ncmds, shell_write_fn write);   // «2»
void shell_feed(shell_t *sh, char c);   /* call for every received character */
void shell_help(const shell_t *sh);
// [endregion]

#endif
