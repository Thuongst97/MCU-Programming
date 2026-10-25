/* SPDX-License-Identifier: MIT
 * Example 03: PWM on TIM3 channel 1 (PA6) dims an external LED in a "breathing" pattern, and
 * TIM2 measures a PWM signal on PA0 in PWM-input mode (connect PA6 to PA0 with a wire).
 * RM0008 §15 (general-purpose timers TIM2 to TIM5), §9.3 (timer pins).
 */
#include <stdint.h>
#include "stm32f103xb.h"
#include "breath.h"
#include "clock.h"
#include "led.h"
#include "systick.h"
#include "uart_log.h"

#define PWM_TOP 1000U   /* ARR + 1: 1000 steps of duty */

// [region:pwm]
/* TIM3 CH1 on PA6, 1 kHz PWM with 1000 duty steps. */
static void pwm_init(void)
{
    RCC->APB2ENR |= RCC_APB2ENR_IOPAEN;
    RCC->APB1ENR |= RCC_APB1ENR_TIM3EN;                                       // «1»
    GPIOA->CRL = (GPIOA->CRL & ~(GPIO_CRL_MODE6 | GPIO_CRL_CNF6))
                 | GPIO_CRL_MODE6_1 | GPIO_CRL_CNF6_1;   /* AF push-pull, 2 MHz */  // «2»

    /* Timer clock = 2 x PCLK1 = 72 MHz, because the APB1 prescaler is not 1 (RM0008 §7.2). */
    TIM3->PSC = (uint16_t)((2U * clock_pclk1() / 1000000U) - 1U);  /* 1 MHz count rate */  // «3»
    TIM3->ARR = PWM_TOP - 1U;                                      /* 1000 counts = 1 kHz */ // «4»
    TIM3->CCR1 = 0U;
    TIM3->CCMR1 = (6U << TIM_CCMR1_OC1M_Pos) | TIM_CCMR1_OC1PE;    /* PWM mode 1, preload */ // «5»
    TIM3->CCER = TIM_CCER_CC1E;                                    /* drive the pin */      // «6»
    TIM3->CR1 = TIM_CR1_ARPE;
    TIM3->EGR = TIM_EGR_UG;                                        /* load PSC/ARR/CCR now */ // «7»
    TIM3->CR1 |= TIM_CR1_CEN;
}

static void pwm_set(uint32_t duty)
{
    TIM3->CCR1 = (duty > PWM_TOP) ? PWM_TOP : duty;   /* applied at the next update event */ // «8»
}
// [endregion]

// [region:capture]
/* TIM2 PWM-input mode on PA0 (TI1): CCR1 captures the period, CCR2 the high time.
 * RM0008 §15.3.6. The counter is reset on every rising edge by the slave-mode controller. */
static void capture_init(void)
{
    RCC->APB1ENR |= RCC_APB1ENR_TIM2EN;
    GPIOA->CRL = (GPIOA->CRL & ~(GPIO_CRL_MODE0 | GPIO_CRL_CNF0)) | GPIO_CRL_CNF0_0;  /* floating input */
    TIM2->PSC = (uint16_t)((2U * clock_pclk1() / 1000000U) - 1U);  /* 1 µs per count */
    TIM2->ARR = 0xFFFFU;
    TIM2->CCMR1 = (1U << TIM_CCMR1_CC1S_Pos)      /* IC1 <- TI1 (rising edge) */            // «9»
                | (2U << TIM_CCMR1_CC2S_Pos);     /* IC2 <- TI1 too (falling edge) */
    TIM2->CCER = TIM_CCER_CC1E | TIM_CCER_CC2E | TIM_CCER_CC2P;                             // «10»
    TIM2->SMCR = (5U << TIM_SMCR_TS_Pos)          /* trigger: filtered TI1 */                // «11»
               | (4U << TIM_SMCR_SMS_Pos);        /* reset mode: CNT = 0 on each trigger */
    TIM2->CR1 = TIM_CR1_CEN;
}
// [endregion]

int main(void)
{
    const clock_status_t clk = clock_init_72mhz();
    systick_init_1ms();
    uart_log_init(115200U);
    led_init();
    uart_puts("Example 03: TIM3 PWM on PA6, TIM2 capture on PA0\n");
    uart_puts("clock status: ");
    uart_put_dec((uint32_t)clk);
    uart_puts("\n");
    pwm_init();
    capture_init();

    // [region:main]
    uint32_t step = 0U, next_step = 0U, next_report = 500U;
    for (;;)
    {
        const uint32_t now = millis();
        if ((int32_t)(now - next_step) >= 0)                     /* every 10 ms: next brightness */ // «12»
        {
            next_step += 10U;
            pwm_set(breath_duty(step, 200U, PWM_TOP));             /* 200 steps = 2 s per breath */
            step = (step + 1U) % 200U;
        }
        if ((int32_t)(now - next_report) >= 0)                   /* every 500 ms: report */
        {
            next_report += 500U;
            led_toggle();
            uart_puts("duty ");
            uart_put_dec(TIM3->CCR1);
            uart_puts("/1000; capture: ");
            const uint32_t period = TIM2->CCR1, high = TIM2->CCR2;  // «13»
            if (period == 0U)
            {
                uart_puts("no edges (connect PA6 to PA0)\n");
            }
            else
            {
                uart_put_dec(period);
                uart_puts(" us period, ");
                uart_put_dec(high);
                uart_puts(" us high\n");
            }
        }
    }
    // [endregion]
}
