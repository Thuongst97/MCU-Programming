/* SPDX-License-Identifier: MIT
 * Example 00 (bare metal): blink LD2 (PA5), switch from HSI16 (16 MHz) to the PLL at 170 MHz,
 * then say "Hello from NUCLEO-G474RE" on LPUART1 (PA2 TX, PA3 RX, 115200 8N1), which the
 * board's ST-LINK forwards to your PC as a virtual COM port.
 *
 * Everything is plain register access through the CMSIS device header stm32g474xx.h
 * (RM0440 chapters RCC, PWR, FLASH, GPIO, LPUART). No HAL, no shared BSP: this file is the
 * whole program.
 */
#include <stdint.h>
#include "stm32g474xx.h"

/* Alternate-function numbers come from the datasheet (DS12288, "Alternate functions");
 * tools/check-pins.py checks them against ST's pin data. */
#define AF_PA2_LPUART1_TX 12U
#define AF_PA3_LPUART1_RX 12U

/* ------------------------------------------------------------------ LED LD2 on PA5 (active-high) */
// [region:led]
static void led_init(void)
{
    RCC->AHB2ENR |= RCC_AHB2ENR_GPIOAEN;                                    // «1»
    (void)RCC->AHB2ENR;                          /* read back: clock is on before we touch GPIOA */
    GPIOA->MODER = (GPIOA->MODER & ~GPIO_MODER_MODE5)                       // «2»
                   | GPIO_MODER_MODE5_0;         /* 01 = output; OTYPER 0 = push-pull (reset) */ // «3»
}

static void led_on(void)
{
    GPIOA->BSRR = GPIO_BSRR_BS5;   /* drive HIGH: current flows through LD2 to GND, it lights */ // «4»
}

static void led_off(void)
{
    GPIOA->BSRR = GPIO_BSRR_BR5;   /* drive LOW: no current, LED off */
}
// [endregion]

/* A deliberately crude delay: it burns CPU cycles, so its length depends on the clock speed.
 * That is exactly what makes the 16 MHz -> 170 MHz switch visible on the LED. */
// [region:crude-delay]
static void crude_delay(uint32_t loops)
{
    for (volatile uint32_t i = 0U; i < loops; ++i)   /* volatile: the compiler must not drop the loop */ // «5»
    {
    }
}
// [endregion]

/* ------------------------------------------------------------------ Clock: HSI16 -> 170 MHz */
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
static int clock_170mhz(void)
{
    RCC->APB1ENR1 |= RCC_APB1ENR1_PWREN;                             /* clock the PWR block */
    (void)RCC->APB1ENR1;
    PWR->CR5 &= ~PWR_CR5_R1MODE;                                     /* range 1 BOOST: > 150 MHz */  // «6»
    FLASH->ACR = FLASH_ACR_LATENCY_4WS                               /* 4 wait states BEFORE speeding up */ // «7»
               | FLASH_ACR_PRFTEN | FLASH_ACR_ICEN | FLASH_ACR_DCEN;
    RCC->PLLCFGR = RCC_PLLCFGR_PLLSRC_HSI                            /* PLL input: HSI16 */          // «8»
                 | ((4U - 1U) << RCC_PLLCFGR_PLLM_Pos)               /* /4  -> 4 MHz */
                 | (85U << RCC_PLLCFGR_PLLN_Pos)                     /* x85 -> 340 MHz VCO */         // «9»
                 | RCC_PLLCFGR_PLLREN;                               /* /2 on PLLR -> 170 MHz */
    RCC->CR |= RCC_CR_PLLON;
    if (!wait_set(&RCC->CR, RCC_CR_PLLRDY, RCC_CR_PLLRDY))
    {
        return 1;                                                    /* no lock: stay on HSI16 */
    }
    RCC->CFGR = (RCC->CFGR & ~RCC_CFGR_HPRE) | RCC_CFGR_HPRE_DIV2;   /* AHB /2 for the jump */      // «10»
    RCC->CFGR = (RCC->CFGR & ~RCC_CFGR_SW) | RCC_CFGR_SW_PLL;        /* switch SYSCLK to the PLL */
    if (!wait_set(&RCC->CFGR, RCC_CFGR_SWS, RCC_CFGR_SWS_PLL))       /* hardware confirms in SWS */  // «11»
    {
        return 2;
    }
    crude_delay(100U);                                               /* >= 1 us at 85 MHz */
    RCC->CFGR &= ~RCC_CFGR_HPRE;                                     /* AHB /1: full 170 MHz */
    SystemCoreClock = 170000000U;
    return 0;
}
// [endregion]

/* ------------------------------------------------------------------ LPUART1 on PA2/PA3 */
// [region:uart]
static void uart_init(uint32_t pclk1, uint32_t baud)
{
    RCC->APB1ENR2 |= RCC_APB1ENR2_LPUART1EN;                                     // «12»
    (void)RCC->APB1ENR2;
    GPIOA->AFR[0] = (GPIOA->AFR[0] & ~(GPIO_AFRL_AFSEL2 | GPIO_AFRL_AFSEL3))    /* AFRL: pins 0-7 */
                    | (AF_PA2_LPUART1_TX << GPIO_AFRL_AFSEL2_Pos)
                    | (AF_PA3_LPUART1_RX << GPIO_AFRL_AFSEL3_Pos);                // «13»
    GPIOA->MODER = (GPIOA->MODER & ~(GPIO_MODER_MODE2 | GPIO_MODER_MODE3))
                   | GPIO_MODER_MODE2_1 | GPIO_MODER_MODE3_1;   /* 10 = alternate function */
    LPUART1->BRR = (uint32_t)((256ULL * pclk1 + (baud / 2U)) / baud);   /* 256 x 170e6 / 115200 = 377778 */ // «14»
    LPUART1->CR1 = USART_CR1_UE | USART_CR1_TE | USART_CR1_RE;                    // «15»
}

static void uart_putc(char c)
{
    for (uint32_t n = 0U; ((LPUART1->ISR & USART_ISR_TXE_TXFNF) == 0U) && (n < WAIT_LOOPS); ++n)  // «16»
    {
    }
    LPUART1->TDR = (uint8_t)c;
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

    /* 1. On HSI16 (16 MHz): five slow blinks with the crude delay. */
    for (uint32_t k = 0U; k < 5U; ++k)                                       // «17»
    {
        led_on();
        crude_delay(400000U);
        led_off();
        crude_delay(400000U);
    }

    /* 2. Switch to 170 MHz. The SAME crude delay now finishes about ten times sooner. */
    const int status = clock_170mhz();                                       // «18»
    for (uint32_t k = 0U; k < 5U; ++k)
    {
        led_on();
        crude_delay(400000U);
        led_off();
        crude_delay(400000U);
    }

    /* 3. Proper timing: SysTick at 1 kHz, independent of how fast the loop runs. */
    (void)SysTick_Config(SystemCoreClock / 1000U);                           // «19»
    uart_init(SystemCoreClock, 115200U);   /* APB1 = SYSCLK here (prescaler 1) */
    uart_puts("Hello from NUCLEO-G474RE @ ");                                // «20»
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
