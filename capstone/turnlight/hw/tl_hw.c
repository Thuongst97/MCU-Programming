/* SPDX-License-Identifier: MIT */
#include "tl_hw.h"

#include "clock.h"
#include "stm32f103xb.h"
#include "tl_msg.h"

#define WAIT_LOOPS 100000U

static uint16_t s_duty[TL_SIDES];

static bool wait_clear(volatile uint32_t *reg, uint32_t mask)
{
    for (uint32_t n = 0U; n < WAIT_LOOPS; ++n)
    {
        if ((*reg & mask) == 0U)
        {
            return true;
        }
    }
    return false;
}

static void buttons_init(void)
{
    RCC->APB2ENR |= RCC_APB2ENR_IOPBEN;
    GPIOB->CRH = (GPIOB->CRH & ~(GPIO_CRH_MODE12 | GPIO_CRH_CNF12 | GPIO_CRH_MODE13 | GPIO_CRH_CNF13 |
                                 GPIO_CRH_MODE14 | GPIO_CRH_CNF14)) |
                 GPIO_CRH_CNF12_1 | GPIO_CRH_CNF13_1 | GPIO_CRH_CNF14_1;   /* input with pull-up/down */
    GPIOB->BSRR = GPIO_BSRR_BS12 | GPIO_BSRR_BS13 | GPIO_BSRR_BS14;      /* ... pull-up */
}

static void lamps_init(void)
{
    RCC->APB2ENR |= RCC_APB2ENR_IOPAEN;
    RCC->APB1ENR |= RCC_APB1ENR_TIM3EN;
    GPIOA->CRL = (GPIOA->CRL & ~(GPIO_CRL_MODE6 | GPIO_CRL_CNF6 | GPIO_CRL_MODE7 | GPIO_CRL_CNF7)) |
                 GPIO_CRL_MODE6_1 | GPIO_CRL_CNF6_1 | GPIO_CRL_MODE7_1 | GPIO_CRL_CNF7_1;   /* AF push-pull, 2 MHz */
    TIM3->PSC = (uint16_t)((2U * clock_pclk1() / 1000000U) - 1U);          /* 1 MHz count */
    TIM3->ARR = TL_PWM_TOP - 1U;                                           /* 1 kHz */
    TIM3->CCR1 = 0U;
    TIM3->CCR2 = 0U;
    TIM3->CCMR1 = (6U << TIM_CCMR1_OC1M_Pos) | TIM_CCMR1_OC1PE | (6U << TIM_CCMR1_OC2M_Pos) | TIM_CCMR1_OC2PE;
    TIM3->CCER = TIM_CCER_CC1E | TIM_CCER_CC2E;
    TIM3->CR1 = TIM_CR1_ARPE;
    TIM3->EGR = TIM_EGR_UG;
    TIM3->CR1 |= TIM_CR1_CEN;
}

static bool adc_init(void)
{
    RCC->APB2ENR |= RCC_APB2ENR_IOPAEN | RCC_APB2ENR_ADC1EN;
    GPIOA->CRL &= ~(GPIO_CRL_MODE1 | GPIO_CRL_CNF1);                       /* PA1 analog */
    ADC1->SMPR2 = 7U << ADC_SMPR2_SMP1_Pos;
    ADC1->CR2 = ADC_CR2_ADON | (7U << ADC_CR2_EXTSEL_Pos) | ADC_CR2_EXTTRIG;
    for (volatile uint32_t n = 0U; n < 1000U; ++n)
    {
        /* tSTAB (1 us max, DS5319) plus 2 ADC clocks before calibration; no time base needed */
    }
    ADC1->CR2 |= ADC_CR2_RSTCAL;
    if (!wait_clear(&ADC1->CR2, ADC_CR2_RSTCAL))
    {
        return false;
    }
    ADC1->CR2 |= ADC_CR2_CAL;
    return wait_clear(&ADC1->CR2, ADC_CR2_CAL);
}

bool tl_hw_init(void)
{
    buttons_init();
    lamps_init();
    return adc_init();
}

bool tl_hw_button_pressed(tl_button_t b)
{
    static const uint32_t pin[TL_BTN_COUNT] = {GPIO_IDR_IDR12, GPIO_IDR_IDR13, GPIO_IDR_IDR14};
    return (GPIOB->IDR & pin[b]) == 0U;                                    /* active-low */
}

// [region:ramp]
void tl_hw_lamp_ramp(const bool on[TL_SIDES], uint32_t dt_ms)
{
    const uint32_t step = (TL_PWM_TOP * dt_ms) / TL_RAMP_MS;               /* full scale in 20 ms */   // «1»
    for (uint32_t i = 0U; i < (uint32_t)TL_SIDES; ++i)
    {
        const uint32_t target = on[i] ? TL_PWM_TOP : 0U;
        uint32_t d = s_duty[i];
        if (d < target)
        {
            d = ((target - d) > step) ? (d + step) : target;
        }
        else
        {
            d = ((d - target) > step) ? (d - step) : target;
        }
        s_duty[i] = (uint16_t)d;
    }
    TIM3->CCR1 = s_duty[TL_LEFT];                                          /* taken at the next update */   // «2»
    TIM3->CCR2 = s_duty[TL_RIGHT];
}
// [endregion]

uint16_t tl_hw_lamp_current(void)
{
    ADC1->SQR1 = 0U;
    ADC1->SQR3 = 1U;                                                       /* channel 1 = PA1 */
    ADC1->CR2 |= ADC_CR2_SWSTART;
    for (uint32_t n = 0U; n < WAIT_LOOPS; ++n)
    {
        if ((ADC1->SR & ADC_SR_EOC) != 0U)
        {
            return (uint16_t)(ADC1->DR & 0xFFFU);
        }
    }
    return 0U;                                                             /* reads as "lamp out": safe side */
}

uint8_t tl_hw_reset_code(void)
{
    const uint32_t csr = RCC->CSR;
    RCC->CSR |= RCC_CSR_RMVF;
    if ((csr & RCC_CSR_IWDGRSTF) != 0U) { return (uint8_t)TL_RESET_IWDG; }
    if ((csr & RCC_CSR_WWDGRSTF) != 0U) { return (uint8_t)TL_RESET_WWDG; }
    if ((csr & RCC_CSR_SFTRSTF) != 0U) { return (uint8_t)TL_RESET_SOFTWARE; }
    if ((csr & RCC_CSR_LPWRRSTF) != 0U) { return (uint8_t)TL_RESET_LOW_POWER; }
    if ((csr & RCC_CSR_PORRSTF) != 0U) { return (uint8_t)TL_RESET_POWER_ON; }
    if ((csr & RCC_CSR_PINRSTF) != 0U) { return (uint8_t)TL_RESET_PIN; }
    return (uint8_t)TL_RESET_UNKNOWN;
}

// [region:wdg]
void tl_hw_wdg_start(void)
{
    DBGMCU->CR |= DBGMCU_CR_DBG_IWDG_STOP;
    IWDG->KR = 0x5555U;                                                    /* unlock PR/RLR (RM0008 §19) */
    IWDG->PR = 0U;                                                         /* LSI / 4: 0.1 ms per count at 40 kHz */
    IWDG->RLR = (TL_WDG_MS * 10U) - 1U;                                    /* 100 ms nominal (67 ms at a 60 kHz LSI) */
    IWDG->KR = 0xCCCCU;                                                    /* start */
}

void tl_hw_wdg_feed(void)
{
    IWDG->KR = 0xAAAAU;
}
// [endregion]
