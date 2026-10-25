/* SPDX-License-Identifier: MIT
 * Example 09: Sleep and Stop modes. First the CPU sleeps between SysTick interrupts (Sleep mode)
 * and counts its wake-ups; then it enters Stop mode, where all clocks in the 1.8 V domain stop,
 * and wakes up when the button on PA0 is pressed (EXTI line 0). After Stop the chip runs on HSI,
 * so the clock tree is rebuilt before printing. RM0008 §5.3 (low-power modes), PM0056 §2.5.
 */
#include <stdint.h>
#include "stm32f103xb.h"
#include "clock.h"
#include "led.h"
#include "systick.h"
#include "uart_log.h"

static volatile uint32_t s_wakeups;

void EXTI0_IRQHandler(void);
void EXTI0_IRQHandler(void)
{
    EXTI->PR = EXTI_PR_PR0;
    s_wakeups++;
}

static void button_wakeup_init(void)
{
    RCC->APB2ENR |= RCC_APB2ENR_IOPAEN | RCC_APB2ENR_AFIOEN;
    GPIOA->CRL = (GPIOA->CRL & ~(GPIO_CRL_CNF0 | GPIO_CRL_MODE0)) | GPIO_CRL_CNF0_1;
    GPIOA->BSRR = GPIO_BSRR_BS0;                                      /* pull-up */
    AFIO->EXTICR[0] = (AFIO->EXTICR[0] & ~AFIO_EXTICR1_EXTI0) | AFIO_EXTICR1_EXTI0_PA;
    EXTI->FTSR |= EXTI_FTSR_TR0;
    EXTI->PR = EXTI_PR_PR0;
    EXTI->IMR |= EXTI_IMR_MR0;                                        /* an EXTI line can wake from Stop */
    NVIC_SetPriority(EXTI0_IRQn, 4U);
    NVIC_EnableIRQ(EXTI0_IRQn);
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
    RCC->APB1ENR |= RCC_APB1ENR_PWREN;                                /* PWR registers need their clock */      // «3»
    PWR->CR |= PWR_CR_LPDS;                                           /* regulator in low-power mode */
    PWR->CR &= ~PWR_CR_PDDS;                                          /* deepsleep = Stop, not Standby */       // «4»
    PWR->CR |= PWR_CR_CWUF;                                           /* clear the wake-up flag */
    SysTick->CTRL &= ~SysTick_CTRL_ENABLE_Msk;                        /* its interrupt would end Stop at once */ // «5»
    SCB->SCR |= SCB_SCR_SLEEPDEEP_Msk;
    __DSB();
    __WFI();                                                          /* clocks stop here until EXTI0 */       // «6»
    SCB->SCR &= ~SCB_SCR_SLEEPDEEP_Msk;
    /* Woken up: the system clock is now HSI 8 MHz and the PLL and HSE are off (RM0008 §5.3.5). */
    (void)clock_init_72mhz();                                                                                  // «7»
    systick_init_1ms();
}
// [endregion]

int main(void)
{
    (void)clock_init_72mhz();
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
        uart_puts("stop mode: press the button on PA0 to wake up\n");
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
