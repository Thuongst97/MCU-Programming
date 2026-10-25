/* SPDX-License-Identifier: MIT
 * Clock setup for the NUCLEO-G474RE (RM0440 "RCC" and "PWR"). */
#ifndef BSP_CLOCK_H
#define BSP_CLOCK_H

#include <stdint.h>

typedef enum
{
    CLOCK_OK = 0,
    CLOCK_VOS_TIMEOUT,      /* the regulator did not settle in range 1 */
    CLOCK_LATENCY_ERROR,    /* the flash did not take the new wait states */
    CLOCK_PLL_TIMEOUT,      /* the PLL did not lock */
    CLOCK_SWITCH_TIMEOUT    /* SYSCLK did not switch to the PLL */
} clock_status_t;

/* HSI16 / 4 x 85 / 2 = 170 MHz SYSCLK, the G474's maximum. AHB, APB1 and APB2 all at 170 MHz,
 * regulator range 1 boost mode, 4 flash wait states, prefetch and caches on.
 * On failure the clock stays on HSI16. */
clock_status_t clock_init_170mhz(void);

/* Microcontroller clock output on PA8 (Arduino D7), to measure a clock with a scope. */
typedef enum
{
    CLOCK_MCO_OFF = 0,
    CLOCK_MCO_HSI16,          /* 16 MHz internal RC */
    CLOCK_MCO_SYSCLK_DIV16    /* 10.625 MHz at 170 MHz: slow enough for a pin and a cheap scope */
} clock_mco_t;
void clock_mco(clock_mco_t src);

/* Bus clocks derived from the current RCC settings (Hz). */
uint32_t clock_hclk(void);
uint32_t clock_pclk1(void);
uint32_t clock_pclk2(void);

#endif
