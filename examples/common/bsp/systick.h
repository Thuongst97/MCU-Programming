/* SPDX-License-Identifier: MIT
 * 1 ms time base on the Cortex-M SysTick timer (PM0056 §4.5). */
#ifndef BSP_SYSTICK_H
#define BSP_SYSTICK_H

#include <stdint.h>

void systick_init_1ms(void);         /* call after every clock change: the reload depends on HCLK */
uint32_t millis(void);               /* milliseconds since systick_init_1ms(), wraps after ~49 days */
void delay_ms(uint32_t ms);          /* blocking delay based on millis() */

#endif
