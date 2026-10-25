/* SPDX-License-Identifier: MIT
 * A cooperative ("run to completion") scheduler: each task is a function plus a period. The
 * scheduler only decides WHICH task is due; it never interrupts a running task. Pure logic: the
 * time comes in as a parameter, so it is unit-tested on the host. */
#ifndef SCHEDULER_H
#define SCHEDULER_H

#include <stdint.h>

typedef void (*task_fn_t)(void);

typedef struct
{
    const char *name;
    task_fn_t fn;
    uint32_t period_ms;
    uint32_t next_ms;     /* when the task is due next */
    uint32_t runs;        /* statistics */
    uint32_t overruns;    /* times it was found more than one period late */
} task_t;

void sched_init(task_t *tasks, uint32_t count, uint32_t now_ms);

/* Run every task that is due at now_ms (in table order = priority order). Returns how many ran. */
uint32_t sched_run_due(task_t *tasks, uint32_t count, uint32_t now_ms);

#endif
