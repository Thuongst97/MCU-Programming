/* SPDX-License-Identifier: MIT
 * Example 00 (bare metal): blink PC13, switch from HSI 8 MHz to HSE x PLL = 72 MHz, then say
 * "Hello from Blue Pill" on USART1 (PA9 TX, PA10 RX, 115200 8N1).
 *
 * Everything is plain register access through the CMSIS device header stm32f103xb.h
 * (RM0008 chapters 7 RCC, 9 GPIO, 27 USART). No HAL, no shared BSP: this file is the whole program.
 */
#include <stdint.h>
#include "stm32f103xb.h"

/* ------------------------------------------------------------------ LED on PC13 (active-low) */
// [region:led]
static void led_init(void)
{
    RCC->APB2ENR |= RCC_APB2ENR_IOPCEN;                                     // «1»
    GPIOC->CRH = (GPIOC->CRH & ~(GPIO_CRH_MODE13 | GPIO_CRH_CNF13))       // «2»
                 | GPIO_CRH_MODE13_1;   /* output, 2 MHz max, push-pull */  // «3»
}

static void led_on(void)
{
    GPIOC->BSRR = GPIO_BSRR_BR13;   /* drive LOW: the LED is wired to 3.3 V, so it lights */ // «4»
}

static void led_off(void)
{
    GPIOC->BSRR = GPIO_BSRR_BS13;   /* drive HIGH: no current, LED off */
}
// [endregion]

/* A deliberately crude delay: it burns CPU cycles, so its length depends on the clock speed.
 * That is exactly what makes the 8 MHz -> 72 MHz switch visible on the LED. */
// [region:crude-delay]
static void crude_delay(uint32_t loops)
{
    for (volatile uint32_t i = 0U; i < loops; ++i)   /* volatile: the compiler must not drop the loop */ // «5»
    {
    }
}
// [endregion]

/* ------------------------------------------------------------------ Clock: HSI 8 MHz -> 72 MHz */
#define WAIT_LOOPS 200000U   /* every wait on a hardware flag has an upper bound */

static int wait_set(volatile const uint32_t *reg, uint32_t mask, uint32_t want)
{
    for (uint32_t n = 0U; n < WAIT_LOOPS; ++n)
    {
        if ((*reg & mask) == want)
        {
            return 1;
        }
    }
    return 0;
}

// [region:clock]
static int clock_72mhz(void)
{
    RCC->CR |= RCC_CR_HSEON;                                         /* start the 8 MHz crystal */  // «6»
    if (!wait_set(&RCC->CR, RCC_CR_HSERDY, RCC_CR_HSERDY))
    {
        return 1;                                                    /* no crystal: stay on HSI */
    }
    FLASH->ACR = FLASH_ACR_PRFTBE | (2U << FLASH_ACR_LATENCY_Pos);   /* 2 wait states BEFORE speeding up */ // «7»
    RCC->CFGR |= RCC_CFGR_PPRE1_DIV2                                 /* APB1 <= 36 MHz */            // «8»
               | RCC_CFGR_PLLSRC                                     /* PLL input: HSE */
               | RCC_CFGR_PLLMULL9;                                  /* 8 MHz x 9 = 72 MHz */        // «9»
    RCC->CR |= RCC_CR_PLLON;
    if (!wait_set(&RCC->CR, RCC_CR_PLLRDY, RCC_CR_PLLRDY))
    {
        return 2;
    }
    RCC->CFGR = (RCC->CFGR & ~RCC_CFGR_SW) | RCC_CFGR_SW_PLL;        /* switch SYSCLK to the PLL */  // «10»
    if (!wait_set(&RCC->CFGR, RCC_CFGR_SWS, RCC_CFGR_SWS_PLL))       /* hardware confirms in SWS */  // «11»
    {
        return 3;
    }
    SystemCoreClock = 72000000U;
    return 0;
}
// [endregion]

/* ------------------------------------------------------------------ USART1 on PA9/PA10 */
// [region:uart]
static void uart_init(uint32_t pclk2, uint32_t baud)
{
    RCC->APB2ENR |= RCC_APB2ENR_IOPAEN | RCC_APB2ENR_USART1EN;                   // «12»
    GPIOA->CRH = (GPIOA->CRH & ~(GPIO_CRH_CNF9 | GPIO_CRH_MODE9 | GPIO_CRH_CNF10 | GPIO_CRH_MODE10))
                 | GPIO_CRH_CNF9_1 | GPIO_CRH_MODE9    /* PA9: alternate-function push-pull, 50 MHz */ // «13»
                 | GPIO_CRH_CNF10_0;                   /* PA10: floating input */
    USART1->BRR = (pclk2 + (baud / 2U)) / baud;        /* 72 MHz / 115200 = 625 = 0x271 */          // «14»
    USART1->CR1 = USART_CR1_UE | USART_CR1_TE | USART_CR1_RE;                                      // «15»
}

static void uart_putc(char c)
{
    for (uint32_t n = 0U; ((USART1->SR & USART_SR_TXE) == 0U) && (n < WAIT_LOOPS); ++n)  // «16»
    {
    }
    USART1->DR = (uint8_t)c;
}

static void uart_puts(const char *s)
{
    for (; *s != '\0'; ++s)
    {
        if (*s == '\n')
        {
            uart_putc('\r');   /* terminals expect CR LF */
        }
        uart_putc(*s);
    }
}
// [endregion]

static void uart_put_dec(uint32_t v)
{
    char buf[10];
    uint32_t i = 0U;
    do
    {
        buf[i++] = (char)('0' + (v % 10U));
        v /= 10U;
    } while (v != 0U);
    while (i > 0U)
    {
        uart_putc(buf[--i]);
    }
}

/* ------------------------------------------------------------------ SysTick: 1 ms tick */
static volatile uint32_t s_ms;   /* changed by the interrupt, read by main(): volatile */

void SysTick_Handler(void);
void SysTick_Handler(void)
{
    s_ms++;
}

// [region:main]
int main(void)
{
    led_init();

    /* 1. On HSI (8 MHz): five slow blinks with the crude delay. */
    for (uint32_t k = 0U; k < 5U; ++k)                                       // «17»
    {
        led_on();
        crude_delay(200000U);
        led_off();
        crude_delay(200000U);
    }

    /* 2. Switch to 72 MHz. The SAME crude delay now finishes nine times sooner. */
    const int status = clock_72mhz();                                        // «18»
    for (uint32_t k = 0U; k < 5U; ++k)
    {
        led_on();
        crude_delay(200000U);
        led_off();
        crude_delay(200000U);
    }

    /* 3. Proper timing: SysTick at 1 kHz, independent of how fast the loop runs. */
    (void)SysTick_Config(SystemCoreClock / 1000U);                           // «19»
    uart_init(SystemCoreClock, 115200U);   /* APB2 = SYSCLK here (prescaler 1) */
    uart_puts("Hello from Blue Pill @ ");                                    // «20»
    uart_put_dec(SystemCoreClock / 1000000U);
    uart_puts(" MHz\n");
    uart_puts("clock status: ");
    uart_put_dec((uint32_t)status);
    uart_puts(" (0 = OK)\n");

    uint32_t next = 1000U, seconds = 0U;
    for (;;)
    {
        if (s_ms >= next)                                                    // «21»
        {
            next += 1000U;
            ++seconds;
            uart_puts("uptime ");
            uart_put_dec(seconds);
            uart_puts(" s\n");
        }
        if ((s_ms % 1000U) < 500U)   /* 1 Hz blink, 50 % duty */
        {
            led_on();
        }
        else
        {
            led_off();
        }
    }
}
// [endregion]
