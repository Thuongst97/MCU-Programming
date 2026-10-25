/* SPDX-License-Identifier: MIT
 * Example 00, HAL path: interrupt handlers (CubeMX generates this file as stm32g4xx_it.c). */
#include "stm32g4xx_hal.h"

void SysTick_Handler(void);
void SysTick_Handler(void)
{
    HAL_IncTick();   /* the HAL time base behind HAL_Delay() and HAL_GetTick() */
}
