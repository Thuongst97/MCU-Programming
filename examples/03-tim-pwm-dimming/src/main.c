/* SPDX-License-Identifier: MIT
 * Example 03: PWM on TIM3 channel 1 (PA6, Arduino D12) dims an external LED in a "breathing"
 * pattern, and TIM2 measures a PWM signal on PA0 (Arduino A0) in PWM-input mode
 * (connect PA6 to PA0 with a wire). RM0440 "General-purpose timers (TIM2/TIM3/TIM4/TIM5)".
 */
#include <stdint.h>
#include "stm32g474xx.h"
#include "breath.h"
#include "clock.h"
#include "gpio.h"
#include "led.h"
#include "systick.h"
#include "uart_log.h"

#define AF_PA6_TIM3_CH1 2U   /* DS12288 alternate functions; checked by tools/check-pins.py */
#define AF_PA0_TIM2_CH1 1U

#define PWM_TOP 1000U   /* ARR + 1: 1000 steps of duty */

/* Timer kernel clock: PCLK1 x 1 when the APB1 prescaler is 1 (the course setup: 170 MHz),
 * PCLK1 x 2 otherwise (RM0440 "RCC", timer clock). */
static uint32_t tim_apb1_clock(void)
{
    const uint32_t ppre1 = (RCC->CFGR & RCC_CFGR_PPRE1) >> RCC_CFGR_PPRE1_Pos;
    return (ppre1 < 4U) ? clock_pclk1() : (2U * clock_pclk1());
}

// [region:pwm]
/* TIM3 CH1 on PA6, 1 kHz PWM with 1000 duty steps. */
static void pwm_init(void)
{
    gpio_clock_on(GPIOA);
    RCC->APB1ENR1 |= RCC_APB1ENR1_TIM3EN;                                     // «1»
    (void)RCC->APB1ENR1;
    gpio_af(GPIOA, 6U, AF_PA6_TIM3_CH1);              /* PA6 belongs to TIM3 now */          // «2»

    TIM3->PSC = (tim_apb1_clock() / 1000000U) - 1U;  /* 170 MHz / 170 = 1 MHz count rate */  // «3»
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
/* TIM2 PWM-input mode on PA0 (TI1): CCR1 captures the period, CCR2 the high time. The counter
 * is reset on every rising edge by the slave-mode controller (RM0440, "PWM input mode"). */
static void capture_init(void)
{
    RCC->APB1ENR1 |= RCC_APB1ENR1_TIM2EN;
    (void)RCC->APB1ENR1;
    gpio_af(GPIOA, 0U, AF_PA0_TIM2_CH1);
    TIM2->PSC = (tim_apb1_clock() / 1000000U) - 1U;  /* 1 us per count */
    TIM2->ARR = 0xFFFFFFFFU;                         /* TIM2 is a 32-bit timer on the G4 */
    TIM2->CCMR1 = (1U << TIM_CCMR1_CC1S_Pos)      /* IC1 <- TI1 (rising edge) */            // «9»
                | (2U << TIM_CCMR1_CC2S_Pos);     /* IC2 <- TI1 too (falling edge) */
    TIM2->CCER = TIM_CCER_CC1E | TIM_CCER_CC2E | TIM_CCER_CC2P;                             // «10»
    TIM2->SMCR = (5U << TIM_SMCR_TS_Pos)          /* trigger: filtered TI1 (TS = 00101) */   // «11»
               | (4U << TIM_SMCR_SMS_Pos);        /* reset mode: CNT = 0 on each trigger */
    TIM2->CR1 = TIM_CR1_CEN;
}
// [endregion]

int main(void)
{
    const clock_status_t clk = clock_init_170mhz();
    systick_init_1ms();
    uart_log_init(115200U);
    led_init();
    uart_puts("Example 03: TIM3 PWM on PA6 (D12), TIM2 capture on PA0 (A0)\n");
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
                uart_puts("no edges (connect D12 to A0)\n");
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
