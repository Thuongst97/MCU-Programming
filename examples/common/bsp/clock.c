/* SPDX-License-Identifier: MIT */
#include "clock.h"
#include "stm32f103xb.h"

/* Upper bound for every busy-wait on a hardware flag (CLAUDE.md rule 6: every wait has a
 * timeout). HSE start-up is specified in milliseconds; at 8 MHz this loop count is far longer. */
#define CLOCK_WAIT_LOOPS 200000U

static int wait_flag(volatile const uint32_t *reg, uint32_t mask, uint32_t want)
{
    for (uint32_t n = 0U; n < CLOCK_WAIT_LOOPS; ++n)
    {
        if ((*reg & mask) == want)
        {
            return 1;
        }
    }
    return 0;
}

clock_status_t clock_init_72mhz(void)
{
    // [region:hse]
    RCC->CR |= RCC_CR_HSEON;                                   // «1»
    if (!wait_flag(&RCC->CR, RCC_CR_HSERDY, RCC_CR_HSERDY))    // «2»
    {
        return CLOCK_HSE_TIMEOUT;
    }
    // [endregion]

    // [region:flash]
    /* 72 MHz needs 2 wait states: the LATENCY *field* value 2, i.e. (2U << Pos).
     * FLASH_ACR_LATENCY_2 would be the mask 0x4, which is not two wait states. */
    FLASH->ACR = FLASH_ACR_PRFTBE | (2U << FLASH_ACR_LATENCY_Pos);   // «3»
    // [endregion]

    // [region:pll]
    RCC->CFGR = (RCC->CFGR & ~(RCC_CFGR_HPRE | RCC_CFGR_PPRE1 | RCC_CFGR_PPRE2 | RCC_CFGR_ADCPRE |
                               RCC_CFGR_PLLSRC | RCC_CFGR_PLLXTPRE | RCC_CFGR_PLLMULL))
                | RCC_CFGR_HPRE_DIV1      /* AHB  = 72 MHz */            // «4»
                | RCC_CFGR_PPRE1_DIV2     /* APB1 = 36 MHz (max 36) */   // «5»
                | RCC_CFGR_PPRE2_DIV1     /* APB2 = 72 MHz */
                | RCC_CFGR_ADCPRE_DIV6    /* ADC  = 12 MHz (max 14) */
                | RCC_CFGR_PLLSRC         /* PLL input = HSE */          // «6»
                | RCC_CFGR_PLLMULL9;      /* 8 MHz x 9 = 72 MHz */       // «7»
    RCC->CR |= RCC_CR_PLLON;
    if (!wait_flag(&RCC->CR, RCC_CR_PLLRDY, RCC_CR_PLLRDY))
    {
        return CLOCK_PLL_TIMEOUT;
    }
    // [endregion]

    // [region:switch]
    RCC->CFGR = (RCC->CFGR & ~RCC_CFGR_SW) | RCC_CFGR_SW_PLL;                    // «8»
    if (!wait_flag(&RCC->CFGR, RCC_CFGR_SWS, RCC_CFGR_SWS_PLL))                // «9»
    {
        return CLOCK_SWITCH_TIMEOUT;
    }
    SystemCoreClockUpdate();                                                    // «10»
    // [endregion]
    return CLOCK_OK;
}

// [region:mco]
void clock_mco(clock_mco_t src)
{
    RCC->APB2ENR |= RCC_APB2ENR_IOPAEN;
    /* PA8: alternate-function push-pull, 50 MHz edges: the fastest the pin allows */
    GPIOA->CRH = (GPIOA->CRH & ~(GPIO_CRH_MODE8 | GPIO_CRH_CNF8)) | GPIO_CRH_MODE8 | GPIO_CRH_CNF8_1;  // «11»
    uint32_t mco = RCC_CFGR_MCO_NOCLOCK;
    if (src == CLOCK_MCO_HSE)
    {
        mco = RCC_CFGR_MCO_HSE;                                                                     // «12»
    }
    else if (src == CLOCK_MCO_PLL_DIV2)
    {
        mco = RCC_CFGR_MCO_PLLCLK_DIV2;
    }
    else
    {
        /* CLOCK_MCO_OFF */
    }
    RCC->CFGR = (RCC->CFGR & ~RCC_CFGR_MCO) | mco;
}
// [endregion]

static uint32_t apb_shift(uint32_t ppre_bits)
{
    /* PPREx: 0xx = /1, 100 = /2, 101 = /4, 110 = /8, 111 = /16 */
    return (ppre_bits < 4U) ? 0U : (ppre_bits - 3U);
}

uint32_t clock_hclk(void)
{
    return SystemCoreClock;
}

uint32_t clock_pclk1(void)
{
    return SystemCoreClock >> apb_shift((RCC->CFGR & RCC_CFGR_PPRE1) >> RCC_CFGR_PPRE1_Pos);
}

uint32_t clock_pclk2(void)
{
    return SystemCoreClock >> apb_shift((RCC->CFGR & RCC_CFGR_PPRE2) >> RCC_CFGR_PPRE2_Pos);
}
