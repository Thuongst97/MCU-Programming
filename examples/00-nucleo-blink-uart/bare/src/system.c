/* SPDX-License-Identifier: MIT
 * Minimal CMSIS system file. After reset the STM32G474 runs from HSI16 (16 MHz); the clock is
 * set up explicitly in main.c so learners see every step.
 */
#include <stdint.h>
#include "stm32g474xx.h"

uint32_t SystemCoreClock = 16000000U;   /* HSI16 after reset (RM0440 "RCC") */

void SystemInit(void)
{
    /* The vector table stays at the start of flash (0x08000000), which BOOT0 = 0 also maps at
     * address 0. Setting VTOR explicitly makes the choice visible. */
    SCB->VTOR = FLASH_BASE;
    SystemCoreClock = 16000000U;
}
