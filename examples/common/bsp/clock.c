/* SPDX-License-Identifier: MIT */
#include "clock.h"
#include "board.h"
#include "gpio.h"
#include "stm32g474xx.h"

/* Upper bound for every busy-wait on a hardware flag (CLAUDE.md rule 6: every wait has a
 * timeout). PLL lock and regulator settling take microseconds; at 16 MHz this is far longer. */
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

clock_status_t clock_init_170mhz(void)
{
    // [region:boost]
    RCC->APB1ENR1 |= RCC_APB1ENR1_PWREN;                                        // «1»
    (void)RCC->APB1ENR1;
    PWR->CR1 = (PWR->CR1 & ~PWR_CR1_VOS) | PWR_CR1_VOS_0;   /* range 1 (the reset value) */
    if (!wait_flag(&PWR->SR2, PWR_SR2_VOSF, 0U))                               // «2»
    {
        return CLOCK_VOS_TIMEOUT;
    }
    PWR->CR5 &= ~PWR_CR5_R1MODE;      /* R1MODE = 0: range 1 *boost*, needed above 150 MHz */  // «3»
    // [endregion]

    // [region:flash]
    /* 170 MHz in boost mode needs 4 wait states (5 CPU cycles per flash access). On the G4 the
     * header has value macros: FLASH_ACR_LATENCY_4WS really is 4 wait states. */
    FLASH->ACR = FLASH_ACR_LATENCY_4WS | FLASH_ACR_PRFTEN | FLASH_ACR_ICEN | FLASH_ACR_DCEN;  // «4»
    if ((FLASH->ACR & FLASH_ACR_LATENCY) != FLASH_ACR_LATENCY_4WS)           /* read back */  // «5»
    {
        return CLOCK_LATENCY_ERROR;
    }
    // [endregion]

    // [region:pll]
    /* f_VCO = 16 MHz / M x N = 16 / 4 x 85 = 340 MHz; PLLR = VCO / 2 = 170 MHz.
     * Field encodings: PLLM holds M - 1, PLLN holds N, PLLR = 00 means /2. */
    RCC->PLLCFGR = RCC_PLLCFGR_PLLSRC_HSI                                       // «6»
                 | ((4U - 1U) << RCC_PLLCFGR_PLLM_Pos)                          // «7»
                 | (85U << RCC_PLLCFGR_PLLN_Pos)                                // «8»
                 | RCC_PLLCFGR_PLLREN;                  /* PLLR = /2, output enabled */
    RCC->CR |= RCC_CR_PLLON;
    if (!wait_flag(&RCC->CR, RCC_CR_PLLRDY, RCC_CR_PLLRDY))
    {
        return CLOCK_PLL_TIMEOUT;
    }
    // [endregion]

    // [region:switch]
    /* Above 80 MHz, go through AHB / 2 for at least 1 us so the current step is gentle
     * (RM0440 "RCC", the same step ST's HAL takes). APB1 and APB2 stay /1: 170 MHz is allowed. */
    RCC->CFGR = (RCC->CFGR & ~(RCC_CFGR_HPRE | RCC_CFGR_PPRE1 | RCC_CFGR_PPRE2)) | RCC_CFGR_HPRE_DIV2;  // «9»
    RCC->CFGR = (RCC->CFGR & ~RCC_CFGR_SW) | RCC_CFGR_SW_PLL;
    if (!wait_flag(&RCC->CFGR, RCC_CFGR_SWS, RCC_CFGR_SWS_PLL))                // «10»
    {
        return CLOCK_SWITCH_TIMEOUT;
    }
    for (volatile uint32_t n = 0U; n < 200U; ++n)   /* >= 1 us at 85 MHz (each pass > 1 cycle) */
    {
    }
    RCC->CFGR &= ~RCC_CFGR_HPRE;                    /* HPRE = 0xxx: AHB / 1 = 170 MHz */   // «11»
    SystemCoreClockUpdate();                                                    // «12»
    // [endregion]
    return CLOCK_OK;
}

// [region:mco]
void clock_mco(clock_mco_t src)
{
    gpio_clock_on(GPIOA);
    gpio_speed(GPIOA, 8U, 3U);                       /* very high speed: sharp edges */
    gpio_af(GPIOA, 8U, AF_PA8_RCC_MCO);                                           // «13»
    uint32_t sel = 0U;                               /* MCOSEL = 0000: no clock */
    uint32_t pre = 0U;                               /* MCOPRE = 000: /1 */
    if (src == CLOCK_MCO_HSI16)
    {
        sel = RCC_CFGR_MCOSEL_0 | RCC_CFGR_MCOSEL_1;  /* 0011 = HSI16 */          // «14»
    }
    else if (src == CLOCK_MCO_SYSCLK_DIV16)
    {
        sel = RCC_CFGR_MCOSEL_0;                      /* 0001 = SYSCLK */
        pre = RCC_CFGR_MCOPRE_DIV16;
    }
    else
    {
        /* CLOCK_MCO_OFF */
    }
    RCC->CFGR = (RCC->CFGR & ~(RCC_CFGR_MCOSEL | RCC_CFGR_MCOPRE)) | sel | pre;
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
