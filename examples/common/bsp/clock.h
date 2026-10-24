/* SPDX-License-Identifier: MIT
 * Clock setup for the Blue Pill (RM0008 §7: RCC). */
#ifndef BSP_CLOCK_H
#define BSP_CLOCK_H

#include <stdint.h>

typedef enum
{
    CLOCK_OK = 0,
    CLOCK_HSE_TIMEOUT,      /* the 8 MHz crystal did not start (missing, broken, or clone board) */
    CLOCK_PLL_TIMEOUT,      /* the PLL did not lock */
    CLOCK_SWITCH_TIMEOUT    /* SYSCLK did not switch to the PLL */
} clock_status_t;

/* HSE 8 MHz x 9 = 72 MHz SYSCLK; AHB 72 MHz, APB1 36 MHz (its maximum), APB2 72 MHz,
 * ADC 12 MHz (/6, the maximum is 14 MHz), 2 flash wait states. On failure the clock stays on HSI. */
clock_status_t clock_init_72mhz(void);

/* Bus clocks derived from the current RCC settings (Hz). */
uint32_t clock_hclk(void);
uint32_t clock_pclk1(void);
uint32_t clock_pclk2(void);

#endif
