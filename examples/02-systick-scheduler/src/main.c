/* SPDX-License-Identifier: MIT
 * Example 02: a SysTick time base and a cooperative scheduler with three periodic tasks.
 *   10 ms  - "sample": stands in for reading inputs
 *   100 ms - "heartbeat": blinks PC13 (5 Hz, 50 % duty)
 *   1000 ms - "report": prints how often each task ran and how many deadlines were missed
 * PM0056 section 4.5 (SysTick).
 */
#include "stm32f103xb.h"
#include "clock.h"
#include "led.h"
#include "systick.h"
#include "uart_log.h"
#include "scheduler.h"

static uint32_t s_samples;

static void task_sample(void)
{
    s_samples++;
}

static void task_heartbeat(void)
{
    led_toggle();
}

static void task_report(void);

// [region:table]
static task_t s_tasks[] = {
    /* name        function         period */                                  // «1»
    {"sample",    task_sample,      10U,   0U, 0U, 0U},
    {"heartbeat", task_heartbeat,   100U,  0U, 0U, 0U},
    {"report",    task_report,      1000U, 0U, 0U, 0U},
};
#define TASK_COUNT (sizeof(s_tasks) / sizeof(s_tasks[0]))
// [endregion]

static void task_report(void)
{
    uart_puts("t=");
    uart_put_dec(millis());
    uart_puts(" ms  sample=");
    uart_put_dec(s_tasks[0].runs);
    uart_puts(" heartbeat=");
    uart_put_dec(s_tasks[1].runs);
    uart_puts(" report=");
    uart_put_dec(s_tasks[2].runs + 1U);
    uart_puts(" overruns=");
    uart_put_dec(s_tasks[0].overruns + s_tasks[1].overruns + s_tasks[2].overruns);
    uart_puts("\n");
}

// [region:main]
int main(void)
{
    (void)clock_init_72mhz();
    systick_init_1ms();                                                            // «2»
    uart_log_init(115200U);
    led_init();
    uart_puts("Example 02: cooperative scheduler, 3 tasks\n");

    sched_init(s_tasks, TASK_COUNT, millis());
    for (;;)                                                                       // «3»
    {
        (void)sched_run_due(s_tasks, TASK_COUNT, millis());                       // «4»
        /* Nothing else to do: a real product would sleep here (__WFI(), module 13). */
    }
}
// [endregion]
