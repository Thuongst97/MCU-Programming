/* SPDX-License-Identifier: MIT */
#include "systick.h"
#include "stm32f103xb.h"

static volatile uint32_t s_ms;       /* written by the interrupt, read by main: volatile */

void SysTick_Handler(void);
void SysTick_Handler(void)
{
    s_ms++;
}

void systick_init_1ms(void)
{
    (void)SysTick_Config(SystemCoreClock / 1000U);   /* CMSIS: reload, priority, enable */
}

uint32_t millis(void)
{
    return s_ms;   /* a single aligned 32-bit read is atomic on Cortex-M3 */
}

void delay_ms(uint32_t ms)
{
    const uint32_t start = millis();
    while ((millis() - start) < ms)   /* unsigned subtraction survives the wrap-around */
    {
    }
}
