/* SPDX-License-Identifier: MIT
 * Example 09: Sleep and Stop modes. First the CPU sleeps between SysTick interrupts (Sleep mode)
 * and counts its wake-ups; then it enters Stop 1 mode, where the clocks of the core domain stop,
 * and wakes up when the blue USER button B1 (PC13, EXTI line 13) is pressed. After Stop the chip
 * runs on HSI16, so the clock tree is rebuilt before printing.
 * RM0440 "Low-power modes" (PWR), PM0214 "Power management".
 */
#include <stdint.h>
#include "stm32g474xx.h"
#include "board.h"
#include "clock.h"
#include "gpio.h"
#include "led.h"
#include "systick.h"
#include "uart_log.h"

static volatile uint32_t s_wakeups;

void EXTI15_10_IRQHandler(void);
void EXTI15_10_IRQHandler(void)
{
    EXTI->PR1 = EXTI_PR1_PIF13;
    s_wakeups++;
}

static void button_wakeup_init(void)
{
    gpio_clock_on(BOARD_BTN_PORT);
    gpio_mode(BOARD_BTN_PORT, BOARD_BTN_PIN, BSP_GPIO_INPUT);
    gpio_pull(BOARD_BTN_PORT, BOARD_BTN_PIN, BSP_GPIO_PULLDOWN);
    RCC->APB2ENR |= RCC_APB2ENR_SYSCFGEN;
    (void)RCC->APB2ENR;
    SYSCFG->EXTICR[3] = (SYSCFG->EXTICR[3] & ~SYSCFG_EXTICR4_EXTI13) | SYSCFG_EXTICR4_EXTI13_PC;
    EXTI->RTSR1 |= EXTI_RTSR1_RT13;                                   /* pressed = rising (ST BSP) */
    EXTI->FTSR1 |= EXTI_FTSR1_FT13;                                   /* ... or falling, if yours is the other way */
    EXTI->PR1 = EXTI_PR1_PIF13;
    EXTI->IMR1 |= EXTI_IMR1_IM13;                                     /* an EXTI line can wake from Stop */
    NVIC_SetPriority(EXTI15_10_IRQn, 4U);
    NVIC_EnableIRQ(EXTI15_10_IRQn);
}

// [region:sleep]
static uint32_t sleep_for_one_second(void)
{
    uint32_t wakes = 0U;
    const uint32_t start = millis();
    SCB->SCR &= ~SCB_SCR_SLEEPDEEP_Msk;                               /* WFI = Sleep: only the CPU clock stops */ // «1»
    while ((millis() - start) < 1000U)
    {
        __WFI();                                                      /* any interrupt wakes it: here SysTick */  // «2»
        ++wakes;
    }
    return wakes;
}
// [endregion]

// [region:stop]
static void enter_stop(void)
{
    RCC->APB1ENR1 |= RCC_APB1ENR1_PWREN;                              /* PWR registers need their clock */      // «3»
    (void)RCC->APB1ENR1;
    PWR->CR1 = (PWR->CR1 & ~PWR_CR1_LPMS) | PWR_CR1_LPMS_STOP1;       /* deepsleep = Stop 1 (low-power regulator) */ // «4»
    PWR->SCR = PWR_SCR_CWUF;                                          /* clear the wake-up flags */
    SysTick->CTRL &= ~SysTick_CTRL_ENABLE_Msk;                        /* its interrupt would end Stop at once */ // «5»
    SCB->SCR |= SCB_SCR_SLEEPDEEP_Msk;
    __DSB();
    __WFI();                                                          /* clocks stop here until EXTI13 */      // «6»
    SCB->SCR &= ~SCB_SCR_SLEEPDEEP_Msk;
    /* Woken up: the system clock is now HSI16 and the PLL is off (RM0440 "Stop 1 mode"). */
    (void)clock_init_170mhz();                                                                                  // «7»
    systick_init_1ms();
}
// [endregion]

int main(void)
{
    (void)clock_init_170mhz();
    systick_init_1ms();
    uart_log_init(115200U);
    led_init();
    button_wakeup_init();
#ifndef NDEBUG
    DBGMCU->CR |= DBGMCU_CR_DBG_SLEEP | DBGMCU_CR_DBG_STOP;           /* keep the debugger attached (debug builds only) */
#endif
    uart_puts("Example 09: Sleep and Stop modes\n");
    uart_puts("sleep mode: ");
    uart_put_dec(sleep_for_one_second());
    uart_puts(" wake-ups in 1 s (one per SysTick interrupt)\n");

    // [region:main]
    for (uint32_t n = 1U;; ++n)
    {
        uart_puts("stop mode: press the blue USER button (B1) to wake up\n");
        delay_ms(5U);                                                 /* let the last byte leave the UART */  // «8»
        led_off();
        enter_stop();
        led_on();
        uart_puts("wake ");
        uart_put_dec(n);
        uart_puts(": back at ");
        uart_put_dec(SystemCoreClock / 1000000U);
        uart_puts(" MHz\n");
        delay_ms(300U);
    }
    // [endregion]
}
