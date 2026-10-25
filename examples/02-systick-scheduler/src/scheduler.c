/* SPDX-License-Identifier: MIT */
#include "scheduler.h"

void sched_init(task_t *tasks, uint32_t count, uint32_t now_ms)
{
    for (uint32_t i = 0U; i < count; ++i)
    {
        tasks[i].next_ms = now_ms + tasks[i].period_ms;
        tasks[i].runs = 0U;
        tasks[i].overruns = 0U;
    }
}

// [region:run]
uint32_t sched_run_due(task_t *tasks, uint32_t count, uint32_t now_ms)
{
    uint32_t ran = 0U;
    for (uint32_t i = 0U; i < count; ++i)
    {
        task_t *t = &tasks[i];
        /* "due" test that survives the 32-bit wrap: signed distance to the deadline */
        if ((int32_t)(now_ms - t->next_ms) >= 0)                                  // «1»
        {
            if ((now_ms - t->next_ms) >= t->period_ms)                            // «2»
            {
                t->overruns++;                 /* we missed at least one whole period */
                t->next_ms = now_ms;           /* resynchronise instead of bursting */
            }
            t->next_ms += t->period_ms;        /* fixed rate: no drift from execution time */ // «3»
            t->fn();                           /* runs to completion: never pre-empted */      // «4»
            t->runs++;
            ++ran;
        }
    }
    return ran;
}
// [endregion]
