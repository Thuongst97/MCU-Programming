/* SPDX-License-Identifier: MIT */
#include "shell.h"

#include <string.h>

void shell_init(shell_t *sh, const shell_cmd_t *cmds, size_t ncmds, shell_write_fn write)
{
    sh->cmds = cmds;
    sh->ncmds = ncmds;
    sh->write = write;
    sh->len = 0U;
    sh->prev = '\0';
    sh->write("> ");
}

void shell_help(const shell_t *sh)
{
    sh->write("Commands:\n");
    for (size_t i = 0U; i < sh->ncmds; ++i)
    {
        sh->write("  ");
        sh->write(sh->cmds[i].name);
        sh->write(" - ");
        sh->write(sh->cmds[i].help);
        sh->write("\n");
    }
}

// [region:execute]
/* Split the line in place at spaces: "led on" -> argv = {"led", "on"}. */
static void execute(shell_t *sh)
{
    const char *argv[SHELL_ARGS_MAX];
    uint32_t argc = 0U;
    char *p = sh->line;
    while ((*p != '\0') && (argc < SHELL_ARGS_MAX))
    {
        while (*p == ' ')
        {
            *p++ = '\0';                                       // «6»
        }
        if (*p == '\0')
        {
            break;
        }
        argv[argc++] = p;
        while ((*p != ' ') && (*p != '\0'))
        {
            ++p;
        }
    }
    if (argc == 0U)
    {
        return;                                                /* empty line */
    }
    for (size_t i = 0U; i < sh->ncmds; ++i)
    {
        if (strcmp(argv[0], sh->cmds[i].name) == 0)            // «7»
        {
            sh->cmds[i].fn(argc, argv);
            return;
        }
    }
    sh->write("unknown command: ");
    sh->write(argv[0]);
    sh->write(" (try help)\n");
}
// [endregion]

// [region:feed]
void shell_feed(shell_t *sh, char c)
{
    const char prev = sh->prev;
    sh->prev = c;
    if ((c == '\n') && (prev == '\r'))
    {
        return;                                                /* CR LF: the CR already ran the line */
    }
    if ((c == '\r') || (c == '\n'))                            /* Enter: run the line */  // «8»
    {
        sh->write("\n");
        sh->line[sh->len] = '\0';
        execute(sh);
        sh->len = 0U;
        sh->write("> ");
    }
    else if ((c == '\b') || (c == 0x7F))                       /* Backspace or DEL */    // «9»
    {
        if (sh->len > 0U)
        {
            sh->len--;
            sh->write("\b \b");                                /* erase on the terminal */
        }
    }
    else if ((c >= ' ') && (sh->len < (SHELL_LINE_MAX - 1U)))  /* printable, room left */ // «10»
    {
        sh->line[sh->len++] = c;
        const char echo[2] = {c, '\0'};
        sh->write(echo);                                       /* echo what was typed */
    }
    else
    {
        /* control character or line full: ignore */
    }
}
// [endregion]
