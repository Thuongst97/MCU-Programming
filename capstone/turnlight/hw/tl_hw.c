/* SPDX-License-Identifier: MIT */
#include "tl_hw.h"

#include "clock.h"
#include "gpio.h"
#include "stm32g474xx.h"
#include "tl_msg.h"

#define WAIT_LOOPS 100000U
#define CH_LAMP    2U          /* PA1 = ADC1_IN2 (DS12288 pinout) */
#define AF_PA6_TIM3_CH1 2U     /* DS12288 alternate functions; checked by tools/check-pins.py */
#define AF_PA7_TIM3_CH2 2U

static uint16_t s_duty[TL_SIDES];

static bool wait_flag(volatile uint32_t *reg, uint32_t mask, uint32_t want)
{
    for (uint32_t n = 0U; n < WAIT_LOOPS; ++n)
    {
        if ((*reg & mask) == want)
        {
            return true;
        }
    }
    return false;
}

static void buttons_init(void)
{
    gpio_clock_on(GPIOB);
    for (uint32_t pin = 12U; pin <= 14U; ++pin)
    {
        gpio_mode(GPIOB, pin, BSP_GPIO_INPUT);
        gpio_pull(GPIOB, pin, BSP_GPIO_PULLUP);                            /* switch to GND */
    }
}

static void lamps_init(void)
{
    gpio_clock_on(GPIOA);
    RCC->APB1ENR1 |= RCC_APB1ENR1_TIM3EN;
    (void)RCC->APB1ENR1;
    gpio_af(GPIOA, 6U, AF_PA6_TIM3_CH1);
    gpio_af(GPIOA, 7U, AF_PA7_TIM3_CH2);
    TIM3->PSC = (uint16_t)((clock_pclk1() / 1000000U) - 1U);              /* APB1 / 1: timer clock = PCLK1; 1 MHz count */
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
    RCC->AHB2ENR |= RCC_AHB2ENR_ADC12EN;
    (void)RCC->AHB2ENR;
    gpio_clock_on(GPIOA);
    gpio_mode(GPIOA, 1U, BSP_GPIO_ANALOG);                                 /* PA1 analog */
    ADC12_COMMON->CCR = ADC_CCR_CKMODE_1 | ADC_CCR_CKMODE_0;               /* HCLK / 4 = 42.5 MHz */
    ADC1->CR &= ~ADC_CR_DEEPPWD;                                           /* the order of example 05 */
    ADC1->CR |= ADC_CR_ADVREGEN;
    for (volatile uint32_t n = 0U; n < 10000U; ++n)
    {
        /* regulator start-up, 20 us max (DS12288); no time base needed */
    }
    ADC1->CR &= ~ADC_CR_ADCALDIF;
    ADC1->CR |= ADC_CR_ADCAL;
    if (!wait_flag(&ADC1->CR, ADC_CR_ADCAL, 0U))
    {
        return false;
    }
    ADC1->SMPR1 = 7U << ADC_SMPR1_SMP2_Pos;                                /* 640.5 cycles */
    ADC1->SQR1 = CH_LAMP << ADC_SQR1_SQ1_Pos;                              /* one conversion of IN2 */
    ADC1->ISR = ADC_ISR_ADRDY;
    ADC1->CR |= ADC_CR_ADEN;
    return wait_flag(&ADC1->ISR, ADC_ISR_ADRDY, ADC_ISR_ADRDY);
}

bool tl_hw_init(void)
{
    buttons_init();
    lamps_init();
    return adc_init();
}

bool tl_hw_button_pressed(tl_button_t b)
{
    static const uint32_t pin[TL_BTN_COUNT] = {GPIO_IDR_ID12, GPIO_IDR_ID13, GPIO_IDR_ID14};
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
    ADC1->CR |= ADC_CR_ADSTART;
    if (wait_flag(&ADC1->ISR, ADC_ISR_EOC, ADC_ISR_EOC))
    {
        return (uint16_t)(ADC1->DR & 0xFFFU);                              /* reading DR clears EOC */
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
    if ((csr & RCC_CSR_BORRSTF) != 0U) { return (uint8_t)TL_RESET_POWER_ON; }   /* power-on or brown-out */
    if ((csr & RCC_CSR_PINRSTF) != 0U) { return (uint8_t)TL_RESET_PIN; }
    return (uint8_t)TL_RESET_UNKNOWN;
}

// [region:wdg]
void tl_hw_wdg_start(void)
{
    DBGMCU->APB1FZR1 |= DBGMCU_APB1FZR1_DBG_IWDG_STOP;
    IWDG->KR = 0xCCCCU;                                                    /* start (RM0440 "IWDG": start first) */
    IWDG->KR = 0x5555U;                                                    /* then unlock PR/RLR */
    IWDG->PR = 0U;                                                         /* LSI / 4: 0.125 ms per count at 32 kHz */
    IWDG->RLR = (TL_WDG_MS * 8U) - 1U;                                     /* 100 ms nominal; LSI varies (DS12288) */
    (void)wait_flag(&IWDG->SR, IWDG_SR_PVU | IWDG_SR_RVU | IWDG_SR_WVU, 0U);
    IWDG->KR = 0xAAAAU;                                                    /* load the new reload value */
}

void tl_hw_wdg_feed(void)
{
    IWDG->KR = 0xAAAAU;
}
// [endregion]
