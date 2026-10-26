/* SPDX-License-Identifier: MIT */
#include "systick.h"
#include "stm32g474xx.h"

// [region:tick]
static volatile uint32_t s_ms;       /* written by the interrupt, read by main: volatile */   // «1»

void SysTick_Handler(void);
void SysTick_Handler(void)
{
    s_ms++;                                                                                 // «2»
}

void systick_init_1ms(void)
{
    (void)SysTick_Config(SystemCoreClock / 1000U);   /* CMSIS: reload, priority, enable */  // «3»
}

uint32_t millis(void)
{
    return s_ms;   /* a single aligned 32-bit read is atomic on Cortex-M4 */                 // «4»
}
// [endregion]

void delay_ms(uint32_t ms)
{
    const uint32_t start = millis();
    while ((millis() - start) < ms)   /* unsigned subtraction survives the wrap-around */
    {
    }
}
