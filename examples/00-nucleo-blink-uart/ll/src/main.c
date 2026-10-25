/* SPDX-License-Identifier: MIT
 * Example 00, LL path (Appendix D): the same program with ST's Low-Layer (LL) drivers.
 * LL functions are tiny static inline wrappers around single register accesses, so this compiles
 * to almost the same instructions as ../bare. Compare each line with its register equivalent.
 */
#include "stm32g4xx_ll_bus.h"
#include "stm32g4xx_ll_gpio.h"
#include "stm32g4xx_ll_rcc.h"
#include "stm32g4xx_ll_pwr.h"
#include "stm32g4xx_ll_system.h"
#include "stm32g4xx_ll_lpuart.h"
#include "stm32g4xx_ll_cortex.h"

static volatile uint32_t s_ms;

void SysTick_Handler(void);
void SysTick_Handler(void)
{
    s_ms++;
}

#define WAIT_LOOPS 200000U

// [region:clock]
static int clock_170mhz(void)
{
    uint32_t n;
    LL_APB1_GRP1_EnableClock(LL_APB1_GRP1_PERIPH_PWR);            /* RCC->APB1ENR1 |= PWREN */
    LL_PWR_EnableRange1BoostMode();                               /* PWR->CR5 &= ~R1MODE */            // «1»
    LL_FLASH_SetLatency(LL_FLASH_LATENCY_4);                      /* FLASH->ACR LATENCY = 4 WS */      // «2»
    LL_FLASH_EnablePrefetch();
    LL_FLASH_EnableInstCache();
    LL_FLASH_EnableDataCache();
    LL_RCC_PLL_ConfigDomain_SYS(LL_RCC_PLLSOURCE_HSI, LL_RCC_PLLM_DIV_4, 85U, LL_RCC_PLLR_DIV_2);     // «3»
    LL_RCC_PLL_EnableDomain_SYS();                                /* PLLREN */
    LL_RCC_PLL_Enable();
    for (n = 0U; (LL_RCC_PLL_IsReady() == 0U) && (n < WAIT_LOOPS); ++n) { }
    if (n == WAIT_LOOPS) { return 1; }
    LL_RCC_SetAHBPrescaler(LL_RCC_SYSCLK_DIV_2);                  /* the /2 step above 80 MHz */
    LL_RCC_SetSysClkSource(LL_RCC_SYS_CLKSOURCE_PLL);                                                 // «4»
    for (n = 0U; (LL_RCC_GetSysClkSource() != LL_RCC_SYS_CLKSOURCE_STATUS_PLL) && (n < WAIT_LOOPS); ++n) { }
    if (n == WAIT_LOOPS) { return 2; }
    for (volatile uint32_t d = 0U; d < 100U; ++d) { }            /* >= 1 us at 85 MHz */
    LL_RCC_SetAHBPrescaler(LL_RCC_SYSCLK_DIV_1);
    SystemCoreClock = 170000000U;
    return 0;
}
// [endregion]

// [region:io]
static void io_init(void)
{
    LL_AHB2_GRP1_EnableClock(LL_AHB2_GRP1_PERIPH_GPIOA);                                              // «5»
    LL_APB1_GRP2_EnableClock(LL_APB1_GRP2_PERIPH_LPUART1);
    LL_GPIO_SetPinMode(GPIOA, LL_GPIO_PIN_5, LL_GPIO_MODE_OUTPUT);                                    // «6»
    LL_GPIO_SetPinOutputType(GPIOA, LL_GPIO_PIN_5, LL_GPIO_OUTPUT_PUSHPULL);
    LL_GPIO_SetAFPin_0_7(GPIOA, LL_GPIO_PIN_2, LL_GPIO_AF_12);   /* LPUART1_TX */
    LL_GPIO_SetAFPin_0_7(GPIOA, LL_GPIO_PIN_3, LL_GPIO_AF_12);   /* LPUART1_RX */
    LL_GPIO_SetPinMode(GPIOA, LL_GPIO_PIN_2, LL_GPIO_MODE_ALTERNATE);
    LL_GPIO_SetPinMode(GPIOA, LL_GPIO_PIN_3, LL_GPIO_MODE_ALTERNATE);
    LL_LPUART_SetBaudRate(LPUART1, SystemCoreClock, LL_LPUART_PRESCALER_DIV1, 115200U);   /* computes BRR */ // «7»
    LL_LPUART_SetTransferDirection(LPUART1, LL_LPUART_DIRECTION_TX_RX);
    LL_LPUART_Enable(LPUART1);
}
// [endregion]

static void say(const char *s)
{
    for (; *s != '\0'; ++s)
    {
        for (uint32_t n = 0U; (LL_LPUART_IsActiveFlag_TXE_TXFNF(LPUART1) == 0U) && (n < WAIT_LOOPS); ++n) { }
        LL_LPUART_TransmitData8(LPUART1, (uint8_t)*s);
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
    const int status = clock_170mhz();
    io_init();
    (void)SysTick_Config(SystemCoreClock / 1000U);
    say("Hello from NUCLEO-G474RE @ ");
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
            LL_GPIO_SetOutputPin(GPIOA, LL_GPIO_PIN_5);     /* LD2 on (active-high) */
        }
        else
        {
            LL_GPIO_ResetOutputPin(GPIOA, LL_GPIO_PIN_5);
        }
    }
}
