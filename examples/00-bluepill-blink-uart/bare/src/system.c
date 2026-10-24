/* SPDX-License-Identifier: MIT
 * Minimal CMSIS system file. After reset the STM32F103 runs from HSI (8 MHz); clock setup is
 * done explicitly by the application (bsp/clock.c) so learners see every step.
 */
#include <stdint.h>
#include "stm32f103xb.h"

uint32_t SystemCoreClock = 8000000U;   /* HSI after reset (RM0008 §7.2) */

void SystemInit(void)
{
    /* The vector table stays at the start of flash (0x08000000). Setting VTOR explicitly keeps
     * the behaviour identical in Renode, which does not model the boot-pin memory alias. */
    SCB->VTOR = FLASH_BASE;
    SystemCoreClock = 8000000U;
}

/* Recompute SystemCoreClock from the RCC registers (used after clock changes). */
void SystemCoreClockUpdate(void)
{
    static const uint8_t ahb_shift[16] = {0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 3, 4, 6, 7, 8, 9};
    uint32_t sysclk;
    switch (RCC->CFGR & RCC_CFGR_SWS)
    {
    case RCC_CFGR_SWS_HSE:
        sysclk = 8000000U;   /* the Blue Pill's crystal */
        break;
    case RCC_CFGR_SWS_PLL:
    {
        uint32_t mul = ((RCC->CFGR & RCC_CFGR_PLLMULL) >> RCC_CFGR_PLLMULL_Pos) + 2U;
        if (mul > 16U)
        {
            mul = 16U;       /* PLLMUL = 0b1111 also means x16 */
        }
        uint32_t in = ((RCC->CFGR & RCC_CFGR_PLLSRC) != 0U)
                          ? (((RCC->CFGR & RCC_CFGR_PLLXTPRE) != 0U) ? 4000000U : 8000000U)
                          : 4000000U;   /* HSI / 2 */
        sysclk = in * mul;
        break;
    }
    default:
        sysclk = 8000000U;   /* HSI */
        break;
    }
    SystemCoreClock = sysclk >> ahb_shift[(RCC->CFGR & RCC_CFGR_HPRE) >> RCC_CFGR_HPRE_Pos];
}
