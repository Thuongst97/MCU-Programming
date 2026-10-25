/* SPDX-License-Identifier: MIT
 * Example 01: a push button on PA0 (to GND, internal pull-up) wakes an EXTI interrupt on each
 * falling edge; main() debounces it and toggles the PC13 LED on every confirmed press.
 * Both counters are printed so you can see how many raw edges one press produces.
 * RM0008 chapters 9 (GPIO, AFIO_EXTICR) and 10 (EXTI); PM0056 section 4.3 (NVIC).
 */
#include <stdbool.h>
#include "stm32f103xb.h"
#include "clock.h"
#include "led.h"
#include "systick.h"
#include "uart_log.h"
#include "debounce.h"

static volatile uint32_t s_raw_edges;     /* written in the ISR, read in main(): volatile */
static volatile bool s_edge_seen;

// [region:gpio]
static void button_init(void)
{
    RCC->APB2ENR |= RCC_APB2ENR_IOPAEN | RCC_APB2ENR_AFIOEN;                 // «1»
    /* PA0: CNF = 10 (input with pull-up/pull-down), MODE = 00 (input). */
    GPIOA->CRL = (GPIOA->CRL & ~(GPIO_CRL_CNF0 | GPIO_CRL_MODE0)) | GPIO_CRL_CNF0_1;   // «2»
    GPIOA->BSRR = GPIO_BSRR_BS0;   /* ODR0 = 1 selects the pull-UP: idle level is high */ // «3»
}
// [endregion]

// [region:exti]
static void exti_init(void)
{
    AFIO->EXTICR[0] = (AFIO->EXTICR[0] & ~AFIO_EXTICR1_EXTI0) | AFIO_EXTICR1_EXTI0_PA;  // «4»
    EXTI->FTSR |= EXTI_FTSR_TR0;   /* falling edge: pressing pulls the pin to GND */       // «5»
    EXTI->RTSR &= ~EXTI_RTSR_TR0;
    EXTI->PR = EXTI_PR_PR0;        /* clear a stale pending flag (write 1 to clear) */
    EXTI->IMR |= EXTI_IMR_MR0;     /* unmask line 0 */
    NVIC_SetPriority(EXTI0_IRQn, 5U);                                                    // «6»
    NVIC_EnableIRQ(EXTI0_IRQn);
}

void EXTI0_IRQHandler(void);
void EXTI0_IRQHandler(void)
{
    EXTI->PR = EXTI_PR_PR0;        /* acknowledge first, or the interrupt fires again */   // «7»
    s_raw_edges++;
    s_edge_seen = true;            /* just a flag: the slow work happens in main() */     // «8»
}
// [endregion]

static bool button_pressed(void)
{
    return (GPIOA->IDR & GPIO_IDR_IDR0) == 0U;   /* active-low */
}

// [region:main]
int main(void)
{
    (void)clock_init_72mhz();
    systick_init_1ms();
    uart_log_init(115200U);
    led_init();
    button_init();
    exti_init();
    uart_puts("Example 01: press the button on PA0\n");

    debounce_t db;
    debounce_init(&db, 20U, button_pressed(), millis());
    uint32_t presses = 0U;
    uint32_t last_sample_ms = millis();

    for (;;)
    {
        const uint32_t now = millis();
        if ((now != last_sample_ms) || s_edge_seen)     /* sample once per millisecond */  // «9»
        {
            last_sample_ms = now;
            s_edge_seen = false;
            if (debounce_update(&db, button_pressed(), now) == DEBOUNCE_PRESSED)            // «10»
            {
                ++presses;
                led_toggle();
                uart_puts("press ");
                uart_put_dec(presses);
                uart_puts(" (raw edges so far: ");
                uart_put_dec(s_raw_edges);
                uart_puts(")\n");
            }
        }
    }
}
// [endregion]
