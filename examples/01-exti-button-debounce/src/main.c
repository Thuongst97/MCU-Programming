/* SPDX-License-Identifier: MIT
 * Example 01: the NUCLEO's blue USER button B1 (PC13) raises an EXTI interrupt on every edge;
 * main() debounces it and toggles LD2 on every confirmed press. Both counters are printed so
 * you can see how many raw edges one press produces.
 * RM0440 chapters GPIO, SYSCFG (EXTICR) and EXTI; PM0214 "NVIC".
 */
#include <stdbool.h>
#include "stm32g474xx.h"
#include "board.h"
#include "clock.h"
#include "gpio.h"
#include "led.h"
#include "systick.h"
#include "uart_log.h"
#include "debounce.h"

static volatile uint32_t s_raw_edges;     /* written in the ISR, read in main(): volatile */
static volatile bool s_edge_seen;

// [region:gpio]
static void button_init(void)
{
    gpio_clock_on(BOARD_BTN_PORT);                                           // «1»
    gpio_mode(BOARD_BTN_PORT, BOARD_BTN_PIN, BSP_GPIO_INPUT);                // «2»
    gpio_pull(BOARD_BTN_PORT, BOARD_BTN_PIN, BSP_GPIO_PULLDOWN);   /* as ST's BSP does */ // «3»
}
// [endregion]

// [region:exti]
static void exti_init(void)
{
    RCC->APB2ENR |= RCC_APB2ENR_SYSCFGEN;          /* EXTI routing lives in SYSCFG on the G4 */
    (void)RCC->APB2ENR;
    SYSCFG->EXTICR[3] = (SYSCFG->EXTICR[3] & ~SYSCFG_EXTICR4_EXTI13)                     // «4»
                        | SYSCFG_EXTICR4_EXTI13_PC;   /* line 13 listens to port C */
    EXTI->RTSR1 |= EXTI_RTSR1_RT13;    /* both edges: we count bounces, polarity doesn't matter */  // «5»
    EXTI->FTSR1 |= EXTI_FTSR1_FT13;
    EXTI->PR1 = EXTI_PR1_PIF13;        /* clear a stale pending flag (write 1 to clear) */
    EXTI->IMR1 |= EXTI_IMR1_IM13;      /* unmask line 13 */
    NVIC_SetPriority(EXTI15_10_IRQn, 5U);       /* lines 10..15 share one vector */      // «6»
    NVIC_EnableIRQ(EXTI15_10_IRQn);
}

void EXTI15_10_IRQHandler(void);
void EXTI15_10_IRQHandler(void)
{
    if ((EXTI->PR1 & EXTI_PR1_PIF13) != 0U)
    {
        EXTI->PR1 = EXTI_PR1_PIF13;    /* acknowledge first, or the interrupt fires again */  // «7»
        s_raw_edges++;
        s_edge_seen = true;            /* just a flag: the slow work happens in main() */    // «8»
    }
}
// [endregion]

static bool button_pressed(void)
{
    const uint32_t level = ((BOARD_BTN_PORT->IDR >> BOARD_BTN_PIN) & 1U);
    return level == BOARD_BTN_PRESSED;   /* 1 = pressed on the NUCLEO-G474RE (ST BSP) */
}

// [region:main]
int main(void)
{
    (void)clock_init_170mhz();
    systick_init_1ms();
    uart_log_init(115200U);
    led_init();
    button_init();
    exti_init();
    uart_puts("Example 01: press the blue USER button (B1)\n");

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
