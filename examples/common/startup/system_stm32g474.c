/* SPDX-License-Identifier: MIT
 * Minimal CMSIS system file. After reset the STM32G474 runs from HSI16 (16 MHz); clock setup
 * is done explicitly by the application (bsp/clock.c) so learners see every step.
 */
#include <stdint.h>
#include "stm32g474xx.h"

#define HSI16_HZ 16000000U          /* RM0440 "Clocks": HSI16 is the reset clock */
#define HSE_HZ   24000000U          /* the NUCLEO-G474RE's crystal (UM2505); unused by the course */

uint32_t SystemCoreClock = HSI16_HZ;

typedef void (*vector_t)(void);
extern const vector_t g_vector_table[];   /* startup_stm32g474.c; its address depends on the image */

void SystemInit(void)
{
    /* Point VTOR at this image's own vector table: 0x08000000 for a normal program, the start of
     * the application slot for an image started by a bootloader (example 12, module 16). */
    SCB->VTOR = (uint32_t)(uintptr_t)g_vector_table;
    SystemCoreClock = HSI16_HZ;
}

/* Recompute SystemCoreClock from the RCC registers (used after clock changes). */
void SystemCoreClockUpdate(void)
{
    static const uint8_t ahb_shift[16] = {0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 3, 4, 6, 7, 8, 9};
    uint32_t sysclk;
    switch (RCC->CFGR & RCC_CFGR_SWS)
    {
    case RCC_CFGR_SWS_HSE:
        sysclk = HSE_HZ;
        break;
    case RCC_CFGR_SWS_PLL:
    {
        /* f = f_in / M * N / R, with M = PLLM + 1, N = PLLN, R = 2 * (PLLR + 1) */
        const uint32_t cfg = RCC->PLLCFGR;
        const uint32_t in = ((cfg & RCC_PLLCFGR_PLLSRC) == RCC_PLLCFGR_PLLSRC_HSE) ? HSE_HZ : HSI16_HZ;
        const uint32_t m = ((cfg & RCC_PLLCFGR_PLLM) >> RCC_PLLCFGR_PLLM_Pos) + 1U;
        const uint32_t n = (cfg & RCC_PLLCFGR_PLLN) >> RCC_PLLCFGR_PLLN_Pos;
        const uint32_t r = (((cfg & RCC_PLLCFGR_PLLR) >> RCC_PLLCFGR_PLLR_Pos) + 1U) * 2U;
        sysclk = (in / m) * n / r;
        break;
    }
    default:
        sysclk = HSI16_HZ;
        break;
    }
    SystemCoreClock = sysclk >> ahb_shift[(RCC->CFGR & RCC_CFGR_HPRE) >> RCC_CFGR_HPRE_Pos];
}
