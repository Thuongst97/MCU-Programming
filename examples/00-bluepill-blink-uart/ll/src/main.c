/* SPDX-License-Identifier: MIT
 * Example 00, LL path (Appendix D): the same program with ST's Low-Layer (LL) drivers.
 * LL functions are tiny static inline wrappers around single register accesses, so this compiles
 * to almost the same instructions as ../bare. Compare each line with its register equivalent.
 */
#include "stm32f1xx_ll_bus.h"
#include "stm32f1xx_ll_gpio.h"
#include "stm32f1xx_ll_rcc.h"
#include "stm32f1xx_ll_system.h"
#include "stm32f1xx_ll_usart.h"
#include "stm32f1xx_ll_cortex.h"

static volatile uint32_t s_ms;

void SysTick_Handler(void);
void SysTick_Handler(void)
{
    s_ms++;
}

#define WAIT_LOOPS 200000U

// [region:clock]
static int clock_72mhz(void)
{
    uint32_t n;
    LL_RCC_HSE_Enable();                                          /* RCC->CR |= RCC_CR_HSEON */         // «1»
    for (n = 0U; (LL_RCC_HSE_IsReady() == 0U) && (n < WAIT_LOOPS); ++n) { }
    if (n == WAIT_LOOPS) { return 1; }
    LL_FLASH_SetLatency(LL_FLASH_LATENCY_2);                      /* FLASH->ACR LATENCY field = 2 */  // «2»
    LL_FLASH_EnablePrefetch();
    LL_RCC_PLL_ConfigDomain_SYS(LL_RCC_PLLSOURCE_HSE_DIV_1, LL_RCC_PLL_MUL_9);                       // «3»
    LL_RCC_PLL_Enable();
    for (n = 0U; (LL_RCC_PLL_IsReady() == 0U) && (n < WAIT_LOOPS); ++n) { }
    if (n == WAIT_LOOPS) { return 2; }
    LL_RCC_SetAHBPrescaler(LL_RCC_SYSCLK_DIV_1);
    LL_RCC_SetAPB1Prescaler(LL_RCC_APB1_DIV_2);                   /* APB1 <= 36 MHz */
    LL_RCC_SetAPB2Prescaler(LL_RCC_APB2_DIV_1);
    LL_RCC_SetSysClkSource(LL_RCC_SYS_CLKSOURCE_PLL);                                                 // «4»
    for (n = 0U; (LL_RCC_GetSysClkSource() != LL_RCC_SYS_CLKSOURCE_STATUS_PLL) && (n < WAIT_LOOPS); ++n) { }
    if (n == WAIT_LOOPS) { return 3; }
    SystemCoreClock = 72000000U;
    return 0;
}
// [endregion]

// [region:io]
static void io_init(void)
{
    LL_APB2_GRP1_EnableClock(LL_APB2_GRP1_PERIPH_GPIOA | LL_APB2_GRP1_PERIPH_GPIOC | LL_APB2_GRP1_PERIPH_USART1); // «5»
    LL_GPIO_SetPinMode(GPIOC, LL_GPIO_PIN_13, LL_GPIO_MODE_OUTPUT);                                   // «6»
    LL_GPIO_SetPinSpeed(GPIOC, LL_GPIO_PIN_13, LL_GPIO_SPEED_FREQ_LOW);
    LL_GPIO_SetPinOutputType(GPIOC, LL_GPIO_PIN_13, LL_GPIO_OUTPUT_PUSHPULL);
    LL_GPIO_SetPinMode(GPIOA, LL_GPIO_PIN_9, LL_GPIO_MODE_ALTERNATE);
    LL_GPIO_SetPinSpeed(GPIOA, LL_GPIO_PIN_9, LL_GPIO_SPEED_FREQ_HIGH);
    LL_GPIO_SetPinOutputType(GPIOA, LL_GPIO_PIN_9, LL_GPIO_OUTPUT_PUSHPULL);
    LL_GPIO_SetPinMode(GPIOA, LL_GPIO_PIN_10, LL_GPIO_MODE_FLOATING);
    LL_USART_SetBaudRate(USART1, SystemCoreClock, 115200U);      /* computes BRR for you */          // «7»
    LL_USART_SetTransferDirection(USART1, LL_USART_DIRECTION_TX_RX);
    LL_USART_Enable(USART1);
}
// [endregion]

static void say(const char *s)
{
    for (; *s != '\0'; ++s)
    {
        for (uint32_t n = 0U; (LL_USART_IsActiveFlag_TXE(USART1) == 0U) && (n < WAIT_LOOPS); ++n) { }
        LL_USART_TransmitData8(USART1, (uint8_t)*s);
    }
}

static void say_u32(uint32_t v)
{
    char buf[11];
    char *p = &buf[10];
    *p = '\0';
    do
    {
        *--p = (char)('0' + (v % 10U));
        v /= 10U;
    } while (v != 0U);
    say(p);
}

int main(void)
{
    const int status = clock_72mhz();
    io_init();
    (void)SysTick_Config(SystemCoreClock / 1000U);
    say("Hello from Blue Pill @ ");
    say_u32(SystemCoreClock / 1000000U);
    say(" MHz (LL)\r\nclock status: ");
    say_u32((uint32_t)status);
    say("\r\n");
    uint32_t next = 1000U, seconds = 0U;
    for (;;)
    {
        if (s_ms >= next)
        {
            next += 1000U;
            ++seconds;
            say("uptime ");
            say_u32(seconds);
            say(" s\r\n");
        }
        if ((s_ms % 1000U) < 500U)
        {
            LL_GPIO_ResetOutputPin(GPIOC, LL_GPIO_PIN_13);   /* LED on (active-low) */
        }
        else
        {
            LL_GPIO_SetOutputPin(GPIOC, LL_GPIO_PIN_13);
        }
    }
}
